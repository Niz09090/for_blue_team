# LogHunter - Web Server Log Analysis Dashboard

A full-stack web application designed to parse web server logs and visualize potential Red Team attacks on a clean SOC dashboard. Built for deployment via Docker Compose with a single-port architecture optimized for Ngrok tunneling.

## Features

- **Secure Login**: Hardcoded username/password authentication via environment variables
- **Log Upload**: Drag-and-drop file uploader supporting Nginx, Apache, and raw .txt logs
- **Raw Text Input**: Paste log lines directly for quick analysis
- **Attack Detection Engine**:
  - SQL Injection (UNION SELECT, OR 1=1, DROP TABLE, etc.)
  - XSS Attacks (script tags, event handlers, JavaScript injection)
  - Path Traversal (../ patterns, /etc/passwd, file system access)
  - Brute Force Detection (high volume of 4xx/401 codes from single IP)
- **SOC Dashboard**:
  - Security Health Score widget
  - Attack type distribution pie chart
  - Attack frequency over time line chart
  - Searchable, filterable data table with flagged logs

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Recharts
- **Backend**: Python 3.11, FastAPI
- **Architecture**: Single-container Docker deployment serving static files from Python backend
- **Port**: 3075 (single port, no CORS issues)

## Architecture Note

This application uses a **single-container architecture** where the Python FastAPI backend serves the compiled React frontend static files. This design:
- Eliminates CORS issues when exposed via Ngrok
- Simplifies deployment with a single port
- Reduces infrastructure complexity
- Ensures seamless frontend-backend communication

## Project Structure

```
loghunter/
├── backend/
│   ├── main.py              # FastAPI application with log parsing engine
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── public/
│   │   └── index.html       # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js           # Login component
│   │   │   ├── Dashboard.js       # Main dashboard
│   │   │   ├── UploadZone.js      # File/text upload
│   │   │   ├── SecurityScore.js   # Health score widget
│   │   │   ├── AttackCharts.js    # Recharts visualizations
│   │   │   └── LogTable.js        # Searchable log table
│   │   ├── App.js            # Main React component
│   │   ├── index.js          # React entry point
│   │   └── index.css         # Tailwind CSS imports
│   ├── package.json          # Node dependencies
│   ├── tailwind.config.js    # Tailwind configuration
│   └── postcss.config.js     # PostCSS configuration
├── Dockerfile                # Multi-stage build for single container
├── docker-compose.yml        # Docker Compose configuration
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## Quick Start

1. **Clone or navigate to the project directory**
   ```bash
   cd d:\for_blue_team
   ```

2. **Configure environment variables**
   ```bash
   # Copy the example environment file
   copy .env.example .env
   
   # Edit .env with your preferred credentials
   # Default: admin/changeme
   ```

3. **Build and start with Docker Compose**
   ```bash
   docker-compose up --build -d
   ```

4. **Access the application**
   - Open your browser to: `http://localhost:3075`
   - Login with credentials from your `.env` file

5. **Stop the application**
   ```bash
   docker-compose down
   ```

## Deployment with Ngrok

1. **Start the application**
   ```bash
   docker-compose up -d
   ```

2. **Expose via Ngrok**
   ```bash
   ngrok http 3075
   ```

3. **Access remotely**
   - Use the Ngrok URL provided (e.g., `https://xxxx-xx-xx-xx-xx.ngrok-free.app`)
   - Login with your configured credentials

The single-port architecture ensures that both frontend and backend work seamlessly over the Ngrok tunnel without CORS or routing issues.

## Manual Build (For Development)

If you want to build the frontend locally before Docker:

### Frontend Build
```bash
cd frontend
npm install
npm run build
```

### Backend Only (After Frontend Build)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 3075
```

## API Endpoints

- `GET /api/health` - Health check (requires authentication)
- `POST /api/parse-logs` - Parse uploaded log file or raw text (requires authentication)
  - Accepts: `multipart/form-data` with `file` field OR JSON with `raw_text` field
  - Returns: JSON with security score, attack counts, and flagged logs

## Authentication

The application uses HTTP Basic Authentication. Credentials are configured via environment variables:

- `LOGHUNTER_USERNAME`: Login username (default: `admin`)
- `LOGHUNTER_PASSWORD`: Login password (default: `changeme`)

**Security Note**: These credentials are stored in environment variables and should be changed before deploying to production.

## Supported Log Formats

### Nginx Access Log
```
192.168.1.1 - - [10/Oct/2023:13:55:36 +0000] "GET /admin HTTP/1.1" 401 123 "-" "Mozilla/5.0"
```

### Apache Access Log
```
192.168.1.1 - - [10/Oct/2023:13:55:36 +0000] "GET /admin HTTP/1.1" 401 123 "http://example.com" "Mozilla/5.0"
```

### Generic/Custom Logs
The parser will attempt to extract IP addresses and timestamps from any log format. Attack detection works on raw text matching, so custom log formats are supported.

## Attack Detection Patterns

### SQL Injection
- `UNION SELECT`
- `OR 1=1`
- `AND 1=1`
- `DROP TABLE`
- SQL comments (`--`, `#`, `/* */`)
- `EXEC(`, `xp_cmdshell`
- DML statements in URL parameters

### XSS (Cross-Site Scripting)
- `<script>` tags
- `javascript:` protocol
- Event handlers (`onerror=`, `onload=`, `onclick=`)
- `<iframe>` tags
- `eval(` function
- `document.cookie` access

### Path Traversal
- `../` and `..\` sequences
- `/etc/passwd` access
- `/etc/shadow` access
- Windows system paths
- URL-encoded traversal (`%2e%2e%2f`)

### Brute Force
- 10+ failed authentication attempts (4xx/401 codes) from a single IP

## Troubleshooting

### Port Already in Use
If port 3075 is already in use, modify the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "YOUR_PORT:3075"
```

### Build Failures
If the build fails, try:
```bash
docker-compose down
docker system prune -f
docker-compose up --build
```

### Frontend Not Loading
Ensure the build completed successfully:
```bash
docker-compose logs loghunter
```

### Authentication Issues
Verify your environment variables are set correctly:
```bash
docker-compose exec loghunter env | grep LOGHUNTER
```

## Development Notes

- The Tailwind CSS warnings in the IDE are expected - they resolve when the application is built
- The application uses sessionStorage to store authentication credentials during the session
- All API calls include the Basic Auth header for authentication
- The single-container architecture serves static files from `/app/frontend/build`

## Security Considerations

- Change default credentials before production deployment
- Use strong passwords for `LOGHUNTER_PASSWORD`
- Consider adding rate limiting for the API endpoints
- The application is designed for analysis of historical logs, not real-time monitoring
- When using Ngrok, be aware that the URL is publicly accessible

## License

This project is provided as-is for educational and security analysis purposes.

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
