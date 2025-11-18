#!/bin/bash

# EduExtract ChromaDB Setup Script

echo "🔧 Setting up ChromaDB for EduExtract..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop existing ChromaDB containers
echo "🛑 Stopping any existing ChromaDB containers..."
docker stop chromadb eduextract_chromadb 2>/dev/null || true
docker rm chromadb eduextract_chromadb 2>/dev/null || true

# Start ChromaDB using Docker Compose
if [ -f "docker-compose.yml" ]; then
    echo "🚀 Starting ChromaDB with Docker Compose..."
    docker-compose up -d chromadb
else
    echo "🚀 Starting ChromaDB with direct Docker command..."
    docker run -d \
        --name chromadb \
        -p 8000:8000 \
        -v chroma_data:/chroma/chroma \
        -e CHROMA_SERVER_CORS_ALLOW_ORIGINS='["http://localhost:3000","http://localhost:5000","http://127.0.0.1:3000","http://127.0.0.1:5000"]' \
        chromadb/chroma:latest
fi

# Wait for ChromaDB to start
echo "⏳ Waiting for ChromaDB to start..."
sleep 5

# Test connection
echo "🔍 Testing ChromaDB connection..."
for i in {1..30}; do
    if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
        echo "✅ ChromaDB is running and accessible at http://localhost:8000"
        echo "📊 You can view the ChromaDB admin interface at: http://localhost:8000"
        break
    elif [ $i -eq 30 ]; then
        echo "❌ ChromaDB failed to start after 30 seconds"
        docker logs chromadb --tail 10
        exit 1
    else
        echo "⏳ Waiting for ChromaDB... ($i/30)"
        sleep 1
    fi
done

echo "🎉 ChromaDB setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start your Node.js backend: cd backend && npm start"
echo "   2. ChromaDB will automatically create collections as needed"
echo "   3. To stop ChromaDB: docker stop chromadb"
echo "   4. To restart ChromaDB: docker start chromadb"