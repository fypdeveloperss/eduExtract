# Scripts Directory

This directory contains utility scripts for the EduExtract backend.

## Available Scripts

### migrate-to-rag.js

Migrates existing content to RAG (Retrieval-Augmented Generation) by processing all existing `GeneratedContent` entries and creating embeddings.

**Usage:**
```bash
cd backend
node scripts/migrate-to-rag.js
```

**What it does:**
- Connects to MongoDB
- Finds all existing content in the `GeneratedContent` collection
- Processes each content item to create chunks and embeddings
- Stores chunks with embeddings in ChromaDB

**Requirements:**
- `EMBEDDING_PROVIDER` must be set in your `.env` file (default: 'huggingface')
- ChromaDB server must be running (see `CHROMADB_SETUP.md`)
- MongoDB connection must be configured
- Existing content in the database

**Output:**
- Shows progress for each content item
- Displays summary of processed, failed, and skipped items

**Note:** This script is safe to run multiple times. It will reprocess content if run again, but existing chunks will be replaced.

### migrate-to-chromadb.js

Migrates existing ContentChunk documents from MongoDB to ChromaDB.

**Usage:**
```bash
cd backend
node scripts/migrate-to-chromadb.js
```

**What it does:**
- Connects to MongoDB and ChromaDB
- Reads all ContentChunk documents from MongoDB
- Adds them to ChromaDB with embeddings
- Preserves all metadata
- Shows migration progress and statistics

**Requirements:**
- ChromaDB server must be running (see `CHROMADB_SETUP.md`)
- MongoDB connection must be configured
- Existing ContentChunk documents in MongoDB

**Output:**
- Shows progress for each batch
- Displays summary of migrated, failed, and total items
- Shows ChromaDB statistics after migration

**Note:** After migration, you can optionally run `cleanup-mongodb-chunks.js` to remove MongoDB chunks.

### cleanup-mongodb-chunks.js

Deletes ContentChunk documents from MongoDB after verifying ChromaDB migration.

**Usage:**
```bash
cd backend
node scripts/cleanup-mongodb-chunks.js
```

**⚠️  WARNING:** This will permanently delete all ContentChunk documents from MongoDB!

**What it does:**
- Checks ChromaDB stats
- Checks MongoDB chunk count
- Deletes all ContentChunk documents from MongoDB
- Shows deletion summary

**Requirements:**
- ChromaDB server must be running
- MongoDB connection must be configured
- Migration should be completed first

**Note:** Only run this after verifying that ChromaDB migration was successful and the system is working correctly.
