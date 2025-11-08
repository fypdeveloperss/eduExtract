# ChromaDB Setup Guide

## Overview

ChromaDB is now used for vector storage instead of MongoDB. This provides faster and more efficient similarity search for RAG functionality.

## Installation

### 1. Install ChromaDB Package

```bash
cd backend
npm install chromadb
```

### 2. Start ChromaDB Server

ChromaDB requires a server to be running. You have two options:

#### Option A: Using Docker (Recommended)

```bash
docker run -d -p 8000:8000 --name chromadb chromadb/chroma
```

This will:
- Start ChromaDB server on port 8000
- Run in the background
- Persist data in Docker volume

#### Option B: Using npx (No Docker Required)

```bash
npx chromadb run
```

This will:
- Start ChromaDB server on port 8000
- Run in the foreground (use Ctrl+C to stop)
- Store data locally

### 3. Environment Variables (Optional)

Add to your `.env` file if ChromaDB is running on a different host/port:

```env
CHROMADB_URL=http://localhost:8000
```

## Verification

After starting the ChromaDB server, verify it's running:

```bash
curl http://localhost:8000/api/v1/heartbeat
```

You should see a response like:
```json
{"nanosecond heartbeat": 1234567890}
```

## Storage Location

- **Server Mode**: Data is stored in ChromaDB server's internal storage
- **Docker Mode**: Data persists in Docker volume
- **Local Mode**: Data stored in ChromaDB's default location

## Migration from MongoDB

If you have existing ContentChunk documents in MongoDB:

```bash
cd backend
node scripts/migrate-to-chromadb.js
```

This will migrate all existing vectors from MongoDB to ChromaDB.

## Troubleshooting

### Server Not Running

**Error**: `ECONNREFUSED` or connection errors

**Solution**: Make sure ChromaDB server is running:
```bash
# Check if Docker container is running
docker ps | grep chromadb

# Or check if npx process is running
ps aux | grep chromadb
```

### Port Already in Use

**Error**: Port 8000 is already in use

**Solution**: 
1. Use a different port: `docker run -p 8001:8000 chromadb/chroma`
2. Update `.env`: `CHROMADB_URL=http://localhost:8001`

### Collection Not Found

**Error**: Collection doesn't exist

**Solution**: The collection will be created automatically on first use. If you see this error, check server logs.

## Production Deployment

For production, consider:

1. **Docker Compose**: Add ChromaDB to your docker-compose.yml
2. **Managed Service**: Use ChromaDB Cloud or self-hosted server
3. **Backup Strategy**: Regularly backup ChromaDB data
4. **Monitoring**: Monitor ChromaDB server health

## Benefits Over MongoDB

- ✅ **Faster Search**: Optimized for vector similarity search
- ✅ **Better Scalability**: Handles millions of vectors efficiently
- ✅ **Native Vector Operations**: Built specifically for embeddings
- ✅ **Metadata Filtering**: Efficient filtering during search
- ✅ **Lower Memory Usage**: More efficient storage

## Next Steps

1. Install ChromaDB: `npm install chromadb`
2. Start ChromaDB server (Docker or npx)
3. Restart your backend server
4. Test RAG functionality - vectors will now be stored in ChromaDB!

