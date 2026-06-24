from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import re
from datetime import datetime
from collections import defaultdict
import secrets

app = FastAPI(title="LogHunter API")

# Security
security = HTTPBasic()

def get_current_username(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = os.getenv("LOGHUNTER_USERNAME", "admin")
    correct_password = os.getenv("LOGHUNTER_PASSWORD", "changeme")
    if credentials.username != correct_username or credentials.password != correct_password:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

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

def detect_attack_type(log_line: str) -> tuple[Optional[str], Optional[str]]:
    """Detect attack type and extract payload from log line."""
    for pattern in SQLI_PATTERNS:
        if re.search(pattern, log_line):
            match = re.search(pattern, log_line, re.IGNORECASE)
            return "SQL Injection", match.group(0) if match else None
    
    for pattern in XSS_PATTERNS:
        if re.search(pattern, log_line):
            match = re.search(pattern, log_line, re.IGNORECASE)
            return "XSS", match.group(0) if match else None
    
    for pattern in PATH_TRAVERSAL_PATTERNS:
        if re.search(pattern, log_line):
            match = re.search(pattern, log_line, re.IGNORECASE)
            return "Path Traversal", match.group(0) if match else None
    
    return None, None

def parse_nginx_log(line: str) -> Optional[LogEntry]:
    """Parse Nginx access log format."""
    # Common Nginx log format: IP - - [timestamp] "method path protocol" status "referer" "user-agent"
    pattern = r'^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) \d+ "([^"]*)" "([^"]*)"'
    match = re.match(pattern, line)
    if match:
        ip, timestamp, method, path, status, referer, user_agent = match.groups()
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
    """Parse Apache access log format."""
    # Common Apache log format: IP - - [timestamp] "method path protocol" status size "referer" "user-agent"
    pattern = r'^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) \d+ "([^"]*)" "([^"]*)"'
    match = re.match(pattern, line)
    if match:
        ip, timestamp, method, path, status, referer, user_agent = match.groups()
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
    if not line:
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

@app.post("/api/parse-logs")
async def parse_logs(
    file: UploadFile = File(None),
    raw_text: str = None,
    username: str = Depends(get_current_username)
):
    """Parse uploaded log file or raw text."""
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
    return analysis

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

# Mount static files for React production build
app.mount("/", StaticFiles(directory="/app/frontend/build", html=True), name="static")
