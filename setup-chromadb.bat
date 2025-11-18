@echo off
REM EduExtract ChromaDB Setup Script for Windows

echo 🔧 Setting up ChromaDB for EduExtract...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Stop existing ChromaDB containers
echo 🛑 Stopping any existing ChromaDB containers...
docker stop chromadb >nul 2>&1
docker stop eduextract_chromadb >nul 2>&1
docker rm chromadb >nul 2>&1
docker rm eduextract_chromadb >nul 2>&1

REM Start ChromaDB using Docker Compose if available, otherwise use direct command
if exist "docker-compose.yml" (
    echo 🚀 Starting ChromaDB with Docker Compose...
    docker-compose up -d chromadb
) else (
    echo 🚀 Starting ChromaDB with direct Docker command...
    docker run -d --name chromadb -p 8000:8000 -v chroma_data:/chroma/chroma -e CHROMA_SERVER_CORS_ALLOW_ORIGINS=["http://localhost:3000","http://localhost:5000","http://127.0.0.1:3000","http://127.0.0.1:5000"] chromadb/chroma:latest
)

REM Wait for ChromaDB to start
echo ⏳ Waiting for ChromaDB to start...
timeout /t 5 /nobreak >nul

REM Test connection (Windows doesn't have curl by default, so we skip this)
echo 🔍 ChromaDB should be starting...
timeout /t 3 /nobreak >nul

echo ✅ ChromaDB setup initiated!
echo 📊 ChromaDB should be accessible at: http://localhost:8000
echo.
echo 📝 Next steps:
echo    1. Start your Node.js backend: cd backend && npm start
echo    2. ChromaDB will automatically create collections as needed
echo    3. To stop ChromaDB: docker stop chromadb
echo    4. To restart ChromaDB: docker start chromadb
echo.
pause