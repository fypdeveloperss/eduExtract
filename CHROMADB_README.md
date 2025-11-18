# ChromaDB Setup for EduExtract

This document explains how to set up and troubleshoot ChromaDB for the EduExtract project.

## Quick Setup

### Option 1: Using Docker Compose (Recommended)
```bash
docker-compose up -d chromadb
```

### Option 2: Using Setup Scripts
```bash
# Linux/Mac
./setup-chromadb.sh

# Windows
setup-chromadb.bat
```

### Option 3: Manual Docker Command
```bash
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v chroma_data:/chroma/chroma \
  -e CHROMA_SERVER_CORS_ALLOW_ORIGINS='["http://localhost:3000","http://localhost:5000"]' \
  chromadb/chroma:latest
```

## Verification

1. **Check if ChromaDB is running:**
   ```bash
   docker ps | grep chroma
   ```

2. **Test the API:**
   ```bash
   curl http://localhost:8000/api/v1/heartbeat
   ```

3. **View ChromaDB logs:**
   ```bash
   docker logs chromadb
   ```

## Common Issues and Solutions

### Issue: "Failed to connect to chromadb"

**Symptoms:**
- Error: `ChromaConnectionError: Failed to connect to chromadb`
- Error: `ECONNREFUSED`

**Solutions:**

1. **Check if ChromaDB container is running:**
   ```bash
   docker ps
   ```
   If not running, start it:
   ```bash
   docker start chromadb
   ```

2. **Check port mapping:**
   ```bash
   docker port chromadb
   ```
   Should show: `8000/tcp -> 0.0.0.0:8000`

3. **Recreate container with correct port mapping:**
   ```bash
   docker stop chromadb
   docker rm chromadb
   docker run -d --name chromadb -p 8000:8000 -v chroma_data:/chroma/chroma chromadb/chroma:latest
   ```

The application now handles ChromaDB connection failures gracefully and will continue working even if ChromaDB is unavailable.