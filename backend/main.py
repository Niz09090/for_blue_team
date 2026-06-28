from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Header, Form
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import urllib.parse
import re
from datetime import datetime, timedelta
from collections import defaultdict
import secrets
from urllib.parse import unquote
import sqlite3
import feedparser
import requests
import hashlib
from jose import JWTError, jwt
from passlib.context import CryptContext

app = FastAPI(title="LogHunter API")

# Database setup
DB_PATH = "/app/data/loghunter.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create log_submissions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS log_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            security_score INTEGER,
            total_requests INTEGER,
            attack_counts TEXT,
            attacks_by_time TEXT,
            flagged_logs TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create recent_attacks table for global attack feed
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recent_attacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            attack_type TEXT NOT NULL,
            payload TEXT,
            ip TEXT,
            path TEXT,
            timestamp TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username FROM users WHERE id = ?", (int(user_id),))
    user = cursor.fetchone()
    conn.close()
    
    if user is None:
        raise credentials_exception
    
    return {"id": user["id"], "username": user["username"]}

def get_optional_user(token: Optional[str] = None) -> Optional[dict]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, username FROM users WHERE id = ?", (int(user_id),))
        user = cursor.fetchone()
        conn.close()
        
        if user is None:
            return None
        
        return {"id": user["id"], "username": user["username"]}
    except JWTError:
        return None

# Models
class LogEntry(BaseModel):
    timestamp: str
    ip: str
    method: str
    path: str
    status: int
    user_agent: str
    attack_type: Optional[str] = None
    payload: Optional[str] = None

class AnalysisResult(BaseModel):
    security_score: int
    total_requests: int
    attack_counts: dict
    attacks_by_time: dict
    flagged_logs: List[LogEntry]

class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str

class Token(BaseModel):
    access_token: str
    token_type: str

class HistoryEntry(BaseModel):
    id: int
    security_score: int
    total_requests: int
    attack_counts: dict
    attacks_by_time: dict
    flagged_logs: List[LogEntry]
    created_at: str

# Log Parsing Patterns
SQLI_PATTERNS = [
    r'(?i)(union\s+select)',
    r'(?i)(or\s+1\s*=\s*1)',
    r'(?i)(and\s+1\s*=\s*1)',
    r'(?i)(\bor\s+\d+\s*=\s*\d+)',
    r'(?i)(drop\s+table)',
    r'(?i)(--|#|\/\*|\*\/)',
    r'(?i)(exec\s*\(|xp_cmdshell)',
    r'(?i)(\;delete|\;insert|\;update)',
]

XSS_PATTERNS = [
    r'(?i)(<script[^>]*>.*?</script>)',
    r'(?i)(javascript:)',
    r'(?i)(onerror\s*=)',
    r'(?i)(onload\s*=)',
    r'(?i)(onclick\s*=)',
    r'(?i)(onmouseover\s*=)',
    r'(?i)(<iframe)',
    r'(?i)(eval\s*\()',
    r'(?i)(document\.cookie)',
]

PATH_TRAVERSAL_PATTERNS = [
    r'(\.\.\/|\.\.\\)',
    r'(?i)(\/etc\/passwd)',
    r'(?i)(\/etc\/shadow)',
    r'(?i)(windows\/system32)',
    r'(?i)(c:\\windows)',
    r'(?i)(%2e%2e%2f)',
]

COMMAND_INJECTION_PATTERNS = [
    r'(?i)(;\s*(cat|ls|pwd|whoami|id|uname|ifconfig|ipconfig|netstat|ps|wget|curl|nc|telnet|ssh|ftp))',
    r'(?i)(\|\s*(cat|ls|pwd|whoami|id|uname|ifconfig|ipconfig|netstat|ps|wget|curl|nc|telnet|ssh|ftp))',
    r'(?i)(&&\s*(cat|ls|pwd|whoami|id|uname|ifconfig|ipconfig|netstat|ps|wget|curl|nc|telnet|ssh|ftp))',
    r'(?i)(`[^`]*`)',
    r'(?i)(\$\([^)]*\))',
    r'(?i)(;\s*rm\s+-rf)',
    r'(?i)(;\s*chmod)',
    r'(?i)(;\s*chown)',
]

LFI_RFI_PATTERNS = [
    r'(?i)(php://input)',
    r'(?i)(php://filter)',
    r'(?i)(data://)',
    r'(?i)(expect://)',
    r'(?i)(zip://)',
    r'(?i)(file://)',
    r'(?i)(http://|https://[^\s]*\.php)',
    r'(?i)(ftp://)',
    r'(?i)(include\s*=)',
    r'(?i)(require\s*=)',
    r'(?i)(include_once\s*=)',
    r'(?i)(require_once\s*=)',
    r'(?i)(/var/log/)',
    r'(?i)(/proc/self/environ)',
    r'(?i)(auth\.log)',
    r'(?i)(/etc/passwd)',
    r'(?i)(/etc/shadow)',
    r'(?i)(/etc/hosts)',
    r'(?i)(/proc/self/cwd)',
    r'(?i)(/proc/self/cmdline)',
]

SSRF_PATTERNS = [
    r'(?i)(169\.254\.169\.254)',  # AWS/GCP/Azure metadata endpoint
    r'(?i)(metadata/v1)',  # Cloud metadata path
    r'(?i)(metadata/v2)',  # Cloud metadata path
    r'(?i)(latest/meta-data)',  # AWS metadata path
    r'(?i)(http://localhost)',
    r'(?i)(http://127\.0\.0\.1)',
    r'(?i)(http://0\.0\.0\.0)',
    r'(?i)(http://192\.168\.)',
    r'(?i)(http://10\.)',
    r'(?i)(http://172\.(1[6-9]|2[0-9]|3[0-1])\.)',
    r'(?i)(file:///etc/passwd)',
    r'(?i)(file:///etc/shadow)',
    r'(?i)(gopher://)',
    r'(?i)(dict://)',
]

CVE_PATTERNS = [
    r'(?i)(\$\{jndi:(ldap|rmi|dns|iiop)://)',
    r'(?i)(\${lower:jndi:)',
    r'(?i)(\${env:)',
    r'(?i)(\${sys:)',
    r'(?i)(class\.forName\()',
    r'(?i)(Runtime\.getRuntime\(\)\.exec)',
    r'(?i)(spring\.cloud\.function)',
    r'(?i)(log4shell)',
    r'(?i)(cve-2021-44228)',
    r'(?i)(cve-2021-45046)',
    r'(?i)(\(\)\s*\{\s*:\s*;\s*\};)',  # Shellshock
    r'(?i)(shellshock)',
    r'(?i)(cve-2014-6271)',
]

SCANNER_PATTERNS = [
    r'(?i)(nikto)',
    r'(?i)(nmap)',
    r'(?i)(dirbuster)',
    r'(?i)(gobuster)',
    r'(?i)(wfuzz)',
    r'(?i)(sqlmap)',
    r'(?i)(burpsuite)',
    r'(?i)(owasp zap)',
    r'(?i)(acunetix)',
    r'(?i)(nessus)',
    r'(?i)(openvas)',
    r'(?i)(masscan)',
    r'(?i)(zmap)',
    r'(?i)(wpscan)',
    r'(?i)(joomscan)',
    r'(?i)(skipfish)',
    r'(?i)(w3af)',
    r'(?i)(hydra)',
    r'(?i)(medusa)',
    r'(?i)(patator)',
    r'(?i)(metasploit)',
    r'(?i)(msfconsole)',
    r'(?i)(arachni)',
    r'(?i)(skipfish)',
    r'(?i)(robots\.txt)',
    r'(?i)(\.env)',
    r'(?i)(admin\.php)',
    r'(?i)(wp-admin)',
    r'(?i)(phpmyadmin)',
    r'(?i)(xmlrpc\.php)',
    r'(?i)(\.git)',
    r'(?i)(\.svn)',
    r'(?i)(web\.config)',
    r'(?i)(\.htaccess)',
]

def detect_attack_type(log_line: str) -> tuple[Optional[str], Optional[str]]:
    """Detect attack type and extract payload from log line."""
    # Decode URL-encoded log line before pattern matching
    decoded_line = unquote(log_line)
    
    # Check SQL Injection
    for pattern in SQLI_PATTERNS:
        if re.search(pattern, decoded_line):
            match = re.search(pattern, decoded_line, re.IGNORECASE)
            return "SQL Injection", match.group(0) if match else None
    
    # Check XSS
    for pattern in XSS_PATTERNS:
        if re.search(pattern, decoded_line):
            match = re.search(pattern, decoded_line, re.IGNORECASE)
            return "XSS", match.group(0) if match else None
    
    # Check Command Injection (before Path Traversal for correct priority)
    for pattern in COMMAND_INJECTION_PATTERNS:
        if re.search(pattern, decoded_line):
            match = re.search(pattern, decoded_line, re.IGNORECASE)
            return "Command Injection", match.group(0) if match else None
    
    # Check Path Traversal
    for pattern in PATH_TRAVERSAL_PATTERNS:
        if re.search(pattern, decoded_line):
            match = re.search(pattern, decoded_line, re.IGNORECASE)
            return "Path Traversal", match.group(0) if match else None
    
    # Check LFI/RFI
    for pattern in LFI_RFI_PATTERNS:
        if re.search(pattern, decoded_line):
            match = re.search(pattern, decoded_line, re.IGNORECASE)
            return "LFI/RFI", match.group(0) if match else None
    
    # Check SSRF
    for pattern in SSRF_PATTERNS:
        if re.search(pattern, decoded_line):
            match = re.search(pattern, decoded_line, re.IGNORECASE)
            return "SSRF", match.group(0) if match else None
    
    # Check CVE/Exploit Payloads
    for pattern in CVE_PATTERNS:
        if re.search(pattern, decoded_line):
            match = re.search(pattern, decoded_line, re.IGNORECASE)
            return "CVE Exploit", match.group(0) if match else None
    
    # Check Scanner Traffic
    for pattern in SCANNER_PATTERNS:
        if re.search(pattern, decoded_line):
            match = re.search(pattern, decoded_line, re.IGNORECASE)
            return "Scanner Traffic", match.group(0) if match else None
    
    return None, None

def parse_nginx_log(line: str) -> Optional[LogEntry]:
    """Parse Nginx access log format (Combined Log Format)."""
    # Combined Log Format: IP - - [timestamp] "method path protocol" status size "referer" "user-agent"
    # Uses non-greedy matching to handle spaces in path and user-agent
    pattern = r'^(\S+) - - \[([^\]]+)\] "(\S+)\s+(.*?)\s+HTTP/[0-9.]+" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"'
    match = re.match(pattern, line)
    if match:
        ip, timestamp, method, path, status, size, referer, user_agent = match.groups()
        attack_type, payload = detect_attack_type(line)
        return LogEntry(
            timestamp=timestamp,
            ip=ip,
            method=method,
            path=path,
            status=int(status),
            user_agent=user_agent,
            attack_type=attack_type,
            payload=payload
        )
    return None

def parse_apache_log(line: str) -> Optional[LogEntry]:
    """Parse Apache access log format (Combined Log Format)."""
    # Combined Log Format: IP - - [timestamp] "method path protocol" status size "referer" "user-agent"
    # Uses non-greedy matching to handle spaces in path and user-agent
    pattern = r'^(\S+) - - \[([^\]]+)\] "(\S+)\s+(.*?)\s+HTTP/[0-9.]+" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"'
    match = re.match(pattern, line)
    if match:
        ip, timestamp, method, path, status, size, referer, user_agent = match.groups()
        attack_type, payload = detect_attack_type(line)
        return LogEntry(
            timestamp=timestamp,
            ip=ip,
            method=method,
            path=path,
            status=int(status),
            user_agent=user_agent,
            attack_type=attack_type,
            payload=payload
        )
    return None

def parse_generic_log(line: str) -> Optional[LogEntry]:
    """Try to parse generic log lines with IP and timestamp."""
    # Generic pattern: IP at start, then timestamp-like string
    pattern = r'^(\S+).*?(\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2})'
    match = re.match(pattern, line)
    if match:
        ip, timestamp = match.groups()
        attack_type, payload = detect_attack_type(line)
        return LogEntry(
            timestamp=timestamp,
            ip=ip,
            method="UNKNOWN",
            path="UNKNOWN",
            status=0,
            user_agent="UNKNOWN",
            attack_type=attack_type,
            payload=payload
        )
    return None

def parse_log_line(line: str) -> Optional[LogEntry]:
    """Try multiple parsing strategies."""
    line = line.strip()
    
    # Skip empty lines and comments
    if not line or line.startswith('#'):
        return None
    
    # Try Nginx format first
    parsed = parse_nginx_log(line)
    if parsed:
        return parsed
    
    # Try Apache format
    parsed = parse_apache_log(line)
    if parsed:
        return parsed
    
    # Try generic format
    parsed = parse_generic_log(line)
    if parsed:
        return parsed
    
    # If no format matches but attack detected, create minimal entry
    attack_type, payload = detect_attack_type(line)
    if attack_type:
        return LogEntry(
            timestamp=datetime.now().strftime("%d/%b/%Y:%H:%M:%S"),
            ip="UNKNOWN",
            method="UNKNOWN",
            path="UNKNOWN",
            status=0,
            user_agent="UNKNOWN",
            attack_type=attack_type,
            payload=payload
        )
    
    return None

def detect_brute_force(logs: List[LogEntry]) -> List[LogEntry]:
    """Detect potential brute force attacks based on 4xx/401 codes from single IP."""
    ip_status_counts = defaultdict(lambda: defaultdict(int))
    
    for log in logs:
        if log.status in [400, 401, 403, 404]:
            ip_status_counts[log.ip][log.status] += 1
    
    # Flag IPs with high volume of 4xx codes (threshold: 10+ requests)
    flagged_logs = []
    for log in logs:
        if log.status in [400, 401, 403, 404]:
            total_4xx = sum(ip_status_counts[log.ip].values())
            if total_4xx >= 10:
                flagged_log = log.copy()
                flagged_log.attack_type = "Brute Force"
                flagged_log.payload = f"{total_4xx} failed attempts"
                flagged_logs.append(flagged_log)
    
    return flagged_logs

def analyze_logs(logs: List[LogEntry]) -> AnalysisResult:
    """Analyze parsed logs and generate security metrics."""
    total_requests = len(logs)
    attack_counts = defaultdict(int)
    attacks_by_time = defaultdict(int)
    flagged_logs = []
    
    for log in logs:
        if log.attack_type:
            attack_counts[log.attack_type] += 1
            flagged_logs.append(log)
            
            # Extract hour from timestamp for time-based analysis
            try:
                hour = log.timestamp.split(":")[1] if ":" in log.timestamp else "00"
                attacks_by_time[hour] += 1
            except:
                attacks_by_time["00"] += 1
    
    # Detect brute force attacks
    brute_force_logs = detect_brute_force(logs)
    for log in brute_force_logs:
        if log.attack_type == "Brute Force" and log not in flagged_logs:
            attack_counts["Brute Force"] += 1
            flagged_logs.append(log)
    
    # Calculate security score (100 - (attacks / total_requests * 100))
    attack_count = sum(attack_counts.values())
    if total_requests > 0:
        security_score = max(0, int(100 - (attack_count / total_requests * 100)))
    else:
        security_score = 100
    
    return AnalysisResult(
        security_score=security_score,
        total_requests=total_requests,
        attack_counts=dict(attack_counts),
        attacks_by_time=dict(sorted(attacks_by_time.items())),
        flagged_logs=flagged_logs
    )

@app.post("/api/auth/register")
async def register(user: UserCreate):
    """Register a new user."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE username = ?", (user.username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create user
    password_hash = get_password_hash(user.password)
    cursor.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        (user.username, password_hash)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    
    return {"id": user_id, "username": user.username}

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and return JWT token."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (form_data.username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["id"])}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info."""
    return current_user

@app.post("/api/parse-logs")
async def parse_logs(
    file: UploadFile = File(None),
    raw_text: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None)
):
    """Parse uploaded log file or raw text. Optional auth for saving to history."""
    logs = []
    
    if file:
        content = await file.read()
        lines = content.decode('utf-8', errors='ignore').split('\n')
    elif raw_text:
        lines = raw_text.split('\n')
    else:
        raise HTTPException(status_code=400, detail="Either file or raw_text must be provided")
    
    for line in lines:
        parsed = parse_log_line(line)
        if parsed:
            logs.append(parsed)
    
    if not logs:
        raise HTTPException(status_code=400, detail="No valid log entries found")
    
    analysis = analyze_logs(logs)
    
    # Save to database if user is authenticated
    user = None
    if authorization:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        user = get_optional_user(token)
    
    if user:
        import json
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO log_submissions (user_id, security_score, total_requests, attack_counts, attacks_by_time, flagged_logs)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            user["id"],
            analysis.security_score,
            analysis.total_requests,
            json.dumps(analysis.attack_counts),
            json.dumps(analysis.attacks_by_time),
            json.dumps([log.dict() for log in analysis.flagged_logs])
        ))
        conn.commit()
        conn.close()
    
    # Save flagged attacks to recent_attacks table for global feed
    import json
    conn = get_db()
    cursor = conn.cursor()
    for log in analysis.flagged_logs:
        cursor.execute('''
            INSERT INTO recent_attacks (attack_type, payload, ip, path, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            log.attack_type,
            log.payload,
            log.ip,
            log.path,
            log.timestamp
        ))
    conn.commit()
    conn.close()
    
    # Keep only last 1000 recent attacks to prevent table bloat
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        DELETE FROM recent_attacks 
        WHERE id NOT IN (SELECT id FROM recent_attacks ORDER BY created_at DESC LIMIT 1000)
    ''')
    conn.commit()
    conn.close()
    
    return analysis

@app.get("/api/recent-attacks")
async def get_recent_attacks():
    """Get recent flagged attacks for the global feed."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT attack_type, payload, ip, path, timestamp, created_at
        FROM recent_attacks
        ORDER BY created_at DESC
        LIMIT 50
    ''')
    
    recent_attacks = []
    for row in cursor.fetchall():
        recent_attacks.append({
            "attack_type": row["attack_type"],
            "payload": row["payload"],
            "ip": row["ip"],
            "path": row["path"],
            "timestamp": row["timestamp"],
            "created_at": row["created_at"]
        })
    
    conn.close()
    return recent_attacks

@app.get("/api/history", response_model=List[HistoryEntry])
async def get_history(current_user: dict = Depends(get_current_user)):
    """Get current user's submission history."""
    import json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, security_score, total_requests, attack_counts, attacks_by_time, flagged_logs, created_at
        FROM log_submissions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
    ''', (current_user["id"],))
    
    history = []
    for row in cursor.fetchall():
        history.append({
            "id": row["id"],
            "security_score": row["security_score"],
            "total_requests": row["total_requests"],
            "attack_counts": json.loads(row["attack_counts"]),
            "attacks_by_time": json.loads(row["attacks_by_time"]),
            "flagged_logs": json.loads(row["flagged_logs"]),
            "created_at": row["created_at"]
        })
    
    conn.close()
    return history

@app.get("/api/cyber-news")
async def get_cyber_news():
    """Fetch latest cybersecurity news from RSS feed."""
    try:
        # Fetch from The Hacker News RSS feed
        feed_url = "https://feeds.feedburner.com/TheHackersNews"
        feed = feedparser.parse(feed_url)
        
        articles = []
        for entry in feed.entries[:15]:  # Get top 15 articles
            # Parse published date
            published_date = None
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                published_date = datetime(*entry.published_parsed[:6])
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                published_date = datetime(*entry.updated_parsed[:6])
            
            # Calculate time ago
            time_ago = "Unknown"
            if published_date:
                now = datetime.utcnow()
                diff = now - published_date
                hours = diff.total_seconds() / 3600
                if hours < 1:
                    minutes = int(diff.total_seconds() / 60)
                    time_ago = f"{minutes}m ago"
                elif hours < 24:
                    time_ago = f"{int(hours)}h ago"
                elif hours < 168:  # 7 days
                    days = int(hours / 24)
                    time_ago = f"{days}d ago"
                else:
                    time_ago = published_date.strftime("%b %d")
            
            # Get summary/description
            summary = ""
            if hasattr(entry, 'summary'):
                summary = entry.summary
            elif hasattr(entry, 'description'):
                summary = entry.description
            
            # Strip HTML tags from summary
            import re
            summary = re.sub('<[^<]+?>', '', summary)
            summary = summary[:200] + "..." if len(summary) > 200 else summary
            
            articles.append({
                "title": entry.title,
                "summary": summary,
                "link": entry.link,
                "published_date": published_date.isoformat() if published_date else None,
                "time_ago": time_ago
            })
        
        return articles
    except Exception as e:
        # Return fallback articles if feed fetch fails
        return [
            {
                "title": "Unable to fetch news",
                "summary": "Could not connect to news feed. Please try again later.",
                "link": "#",
                "published_date": None,
                "time_ago": "Unknown"
            }
        ]

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# Mount static files for React production build
app.mount("/", StaticFiles(directory="/app/frontend/build", html=True), name="static")
