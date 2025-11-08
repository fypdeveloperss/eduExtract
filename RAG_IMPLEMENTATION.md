# RAG (Retrieval-Augmented Generation) Implementation Guide

## Overview

This document describes the RAG implementation for the EduExtract chatbot, which replaces the simple MongoDB-based context retrieval with a sophisticated vector-based semantic search system.

## Architecture

### Components

1. **EmbeddingService** (`backend/services/embeddingService.js`)
   - Generates vector embeddings using OpenAI's embedding API
   - Handles batch processing for efficiency
   - Includes caching to reduce API calls
   - Calculates cosine similarity between embeddings

2. **TextChunker** (`backend/utils/textChunker.js`)
   - Splits large content into smaller, manageable chunks
   - Handles different content types (blog, quiz, flashcards, slides)
   - Maintains sentence boundaries for better chunk quality
   - Supports configurable chunk size and overlap

3. **ChromaService** (`backend/services/chromaService.js`)
   - Manages ChromaDB vector database for efficient similarity search
   - Handles vector storage and retrieval
   - Provides optimized vector search operations
   - Persistent storage in `backend/chroma_db/` directory

4. **RAGService** (`backend/services/ragService.js`)
   - Orchestrates the RAG pipeline
   - Processes content and creates embeddings
   - Performs semantic search to retrieve relevant chunks
   - Builds context strings for LLM prompts

## How It Works

### 1. Content Processing (Indexing)

When content is generated (blog, quiz, flashcards, etc.):

1. Content is saved to `GeneratedContent` collection (existing behavior)
2. Content is automatically processed for RAG:
   - Content is chunked based on type
   - Each chunk is embedded using Hugging Face or OpenAI's embedding API
   - Chunks with embeddings are stored in ChromaDB vector database

### 2. Query Processing (Retrieval)

When a user asks a question in the chatbot:

1. User's query is embedded using the same embedding model
2. Semantic search finds the most relevant chunks:
   - Calculates cosine similarity between query embedding and stored chunk embeddings
   - Filters by minimum similarity threshold (default: 0.7)
   - Returns top N most relevant chunks (default: 5)
3. Retrieved chunks are combined with current session content
4. Context is formatted into a prompt for the LLM
5. LLM generates response using the retrieved context

## Benefits Over Simple Context Retrieval

1. **Semantic Understanding**: Finds relevant content even if exact keywords don't match
2. **Scalability**: Works efficiently with large amounts of content
3. **Relevance**: Only retrieves content that's actually relevant to the query
4. **Efficiency**: Doesn't send entire content history to LLM, only relevant chunks
5. **Accuracy**: Better context leads to more accurate responses

## Configuration

### Environment Variables

Add to your `.env` file:

**Option 1: Hugging Face (Free, Recommended)**
```env
EMBEDDING_PROVIDER=huggingface
# HUGGINGFACE_API_KEY=optional_for_higher_rate_limits
```

**Option 2: OpenAI (Paid)**
```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
```

### Embedding Models

**Hugging Face (Default - Free):**
- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Free tier: No API key required
- 384 dimensions
- Fast and efficient
- Rate limits: ~30 requests/second without API key

**OpenAI (Optional - Paid):**
- Model: `text-embedding-3-small`
- Cost: ~$0.02 per 1M tokens
- 1536 dimensions
- Higher quality embeddings

### Chunking Parameters

Default settings in `TextChunker`:
- `chunkSize`: 1000 characters
- `chunkOverlap`: 200 characters
- `minChunkSize`: 100 characters

### RAG Search Parameters

Default settings in `RAGService.retrieveRelevantChunks()`:
- `limit`: 5 chunks
- `minSimilarity`: 0.7 (70% similarity threshold)

## Database Architecture

### ChromaDB Vector Database

**Collection:** `eduextract_chunks`

**Storage Location:** `backend/chroma_db/` (persistent local storage)

**Data Structure:**
- **ID**: `{userId}_{contentId}_{chunkIndex}` (unique identifier)
- **Embedding**: Vector array (384 dimensions for Hugging Face, 1536 for OpenAI)
- **Document**: Text content of the chunk
- **Metadata**: 
  ```javascript
  {
    userId: String,
    contentId: String,
    contentType: String,
    chunkIndex: Number,
    ...additional metadata
  }
  ```

### MongoDB (Metadata Only)

The `GeneratedContent` collection still stores the original content in MongoDB. ChromaDB handles all vector operations.

### Benefits of ChromaDB

- **Optimized Vector Search**: Native similarity search optimized for vectors
- **Fast Retrieval**: Much faster than in-memory cosine similarity calculations
- **Scalability**: Handles millions of vectors efficiently
- **Persistent Storage**: Data persists across server restarts
- **Metadata Filtering**: Can filter by userId, contentType, etc. during search

## API Changes

### Chat Endpoint (`/api/chat`)

**Before**: Used simple context retrieval from MongoDB
**After**: Uses RAG to retrieve semantically relevant chunks

The endpoint signature remains the same, but the internal implementation now:
1. Embeds the user's query
2. Performs semantic search
3. Builds context from retrieved chunks
4. Sends enhanced context to LLM

## Migration

### Migration from MongoDB to ChromaDB

If you have existing ContentChunk documents in MongoDB, migrate them to ChromaDB:

```bash
cd backend
node scripts/migrate-to-chromadb.js
```

This will:
1. Read all ContentChunk documents from MongoDB
2. Add them to ChromaDB with embeddings
3. Preserve all metadata
4. Show migration progress and statistics

After migration, you can optionally clean up MongoDB chunks:

```bash
node scripts/cleanup-mongodb-chunks.js
```

⚠️ **Warning**: Only run cleanup after verifying ChromaDB is working correctly!

### For Existing Content (New RAG Processing)

To process existing content for RAG:

```javascript
const RAGService = require('./services/ragService');
const GeneratedContent = require('./models/GeneratedContent');

async function migrateExistingContent() {
  const ragService = new RAGService();
  const contents = await GeneratedContent.find({});
  
  for (const content of contents) {
    try {
      await ragService.processContent(
        content.userId,
        content._id,
        content.type,
        content.contentData || content.content,
        { migrated: true }
      );
      console.log(`Processed content ${content._id}`);
    } catch (error) {
      console.error(`Error processing ${content._id}:`, error);
    }
  }
}
```

## Performance Considerations

1. **Embedding Generation**: 
   - Cached to avoid redundant API calls
   - Batch processing for multiple chunks
   - Async processing doesn't block content generation

2. **Similarity Search**:
   - Uses ChromaDB's native vector search (highly optimized)
   - Fast similarity search even with large datasets
   - Metadata filtering for efficient queries
   - Persistent storage ensures data survives server restarts

3. **Chunking**:
   - Happens synchronously but is fast
   - Can be optimized for specific content types

## Cost Considerations

### Hugging Face Embeddings (Default - Free)

- **Free tier**: No cost, no API key required
- Rate limits: ~30 requests/second (sufficient for most use cases)
- With API key: Higher rate limits available

### OpenAI Embeddings (Optional - Paid)

- `text-embedding-3-small`: ~$0.02 per 1M tokens
- Average chunk: ~250 tokens
- Cost per content item: ~$0.00005 (very low)

### Optimization Tips

1. Use Hugging Face (free) by default - no cost!
2. Cache embeddings (already implemented)
3. Batch embedding requests
4. Only process new content (existing content can be migrated gradually)
5. Add Hugging Face API key only if you need higher rate limits

## Troubleshooting

### Embeddings Not Generated

**For Hugging Face (Default):**
- Check internet connection (Hugging Face requires internet access)
- First request may take longer (model loading)
- Check error logs for specific API errors
- If rate limited, add `HUGGINGFACE_API_KEY` for higher limits

**For OpenAI:**
- Check `OPENAI_API_KEY` is set correctly
- Verify `EMBEDDING_PROVIDER=openai` is set
- Verify OpenAI API quota/credits
- Check error logs for specific API errors

### Low Relevance Results

- Adjust `minSimilarity` threshold (lower = more results, higher = more relevant)
- Increase `limit` to retrieve more chunks
- Check if content was properly chunked

### Performance Issues

- Ensure MongoDB indexes are created
- Consider reducing chunk size for faster processing
- Use batch processing for migrations

## Future Enhancements

1. **MongoDB Atlas Vector Search**: For production-scale deployments
2. **Hybrid Search**: Combine semantic search with keyword search
3. **Re-ranking**: Use a re-ranker model to improve relevance
4. **Metadata Filtering**: Filter chunks by content type, date, etc.
5. **Multi-modal**: Support for images, diagrams, etc.

## Testing

To test the RAG implementation:

1. Generate some content (blog, quiz, etc.)
2. Wait a few seconds for RAG processing
3. Ask questions in the chatbot
4. Verify responses reference relevant content
5. Check logs for RAG retrieval information

## Support

For issues or questions:
- Check error logs in backend console
- Verify environment variables
- Ensure MongoDB connection is working
- Check OpenAI API status

