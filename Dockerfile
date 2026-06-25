# Multi-stage build for LogHunter - Single Container Architecture
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build React frontend
RUN npm run build

# Python backend stage
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create non-root user and data directory
RUN useradd -m -u 1000 loghunter && \
    mkdir -p /app/data && \
    chown -R loghunter:loghunter /app

USER loghunter

# Expose port
EXPOSE 3075

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3075"]
