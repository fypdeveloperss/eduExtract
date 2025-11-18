const { ChromaClient } = require('chromadb');
const path = require('path');
const fs = require('fs');

/**
 * ChromaDB Service
 * Manages vector storage and similarity search using ChromaDB
 * Uses embedded ChromaDB (local file-based) for simplicity
 */
class ChromaService {
  constructor() {
    // Set up persistent storage directory
    const chromaDbPath = path.join(__dirname, '../chroma_db');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(chromaDbPath)) {
      fs.mkdirSync(chromaDbPath, { recursive: true });
    }

    // Initialize ChromaDB client
    // ChromaDB requires a server to be running
    // Default: http://localhost:8000 (if running via Docker)
    // Or set CHROMADB_URL environment variable
    const chromaDbUrl = process.env.CHROMADB_URL || 'http://localhost:8000';
    
    try {
      console.log(`Initializing ChromaDB connection to: ${chromaDbUrl}`);
      
      // Initialize client with proper configuration
      this.client = new ChromaClient({
        path: chromaDbUrl
      });
      
      console.log(`✅ ChromaDB client initialized for: ${chromaDbUrl}`);
    } catch (error) {
      console.error('❌ Error initializing ChromaDB client:', error);
      throw error;
    }
    
    this.collectionName = 'eduextract_chunks';
    this.collection = null;
    this.initialized = false;
  }

  /**
   * Initialize ChromaDB collection
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log(`🔄 Initializing ChromaDB collection: ${this.collectionName}`);
      
      // Test connection first
      console.log('🔗 Testing ChromaDB connection...');
      const collections = await this.client.listCollections();
      console.log('✅ ChromaDB connection successful');
      
      const collectionExists = collections && collections.some(c => 
        (typeof c === 'string' ? c === this.collectionName : c.name === this.collectionName)
      );

      if (collectionExists) {
        this.collection = await this.client.getCollection({ name: this.collectionName });
        console.log(`✅ Connected to existing ChromaDB collection: ${this.collectionName}`);
      } else {
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: { 
            description: 'EduExtract content chunks with embeddings',
            createdAt: new Date().toISOString()
          }
        });
        console.log(`✅ Created new ChromaDB collection: ${this.collectionName}`);
      }

      this.initialized = true;
      console.log('🎉 ChromaDB initialization complete');
    } catch (error) {
      console.error('❌ Error initializing ChromaDB:', error);
      console.error('Full error details:', {
        message: error.message,
        cause: error.cause,
        stack: error.stack
      });
      
      // Don't throw the error immediately - let's provide a fallback
      console.log('⚠️  ChromaDB unavailable - operating in degraded mode');
      this.initialized = false;
    }
  }

  /**
   * Add chunks with embeddings to ChromaDB
   * @param {Array} chunks - Array of chunk objects with embeddings
   * @returns {Promise<Array>} Array of ChromaDB IDs
   */
  async addChunks(chunks) {
    await this.initialize();

    if (!chunks || chunks.length === 0) {
      return [];
    }

    const ids = [];
    const embeddings = [];
    const documents = [];
    const metadatas = [];

    chunks.forEach((chunk) => {
      // Create unique ID: userId_contentId_chunkIndex
      const id = `${chunk.userId}_${chunk.contentId}_${chunk.chunkIndex}`;
      ids.push(id);
      embeddings.push(chunk.embedding);
      documents.push(chunk.text);
      metadatas.push({
        userId: chunk.userId,
        contentId: chunk.contentId.toString(),
        contentType: chunk.contentType,
        chunkIndex: chunk.chunkIndex,
        ...(chunk.metadata || {})
      });
    });

    try {
      await this.collection.add({
        ids,
        embeddings,
        documents,
        metadatas
      });

      console.log(`✅ Added ${ids.length} chunks to ChromaDB`);
      return ids;
    } catch (error) {
      console.error('Error adding chunks to ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Query similar chunks using vector similarity search
   * @param {Array} queryEmbedding - Query embedding vector
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Similar chunks with scores
   */
  async querySimilar(queryEmbedding, options = {}) {
    await this.initialize();

    const {
      userId,
      contentType,
      limit = 5,
      minSimilarity = 0.7,
      excludeContentIds = [],
      includeOnlyContentIds = null
    } = options;

    // Build where clause for filtering
    const where = {};
    if (userId) {
      where.userId = userId;
    }
    if (contentType) {
      where.contentType = contentType;
    }
    if (excludeContentIds.length > 0) {
      where.contentId = { $nin: excludeContentIds.map(id => id.toString()) };
    }
    if (includeOnlyContentIds && includeOnlyContentIds.length > 0) {
      where.contentId = { $in: includeOnlyContentIds.map(id => id.toString()) };
    }

    try {
      const queryOptions = {
        queryEmbeddings: [queryEmbedding],
        nResults: limit * 2, // Get more results to filter
      };

      // Only add where clause if we have filters
      // ChromaDB where clause format: { field: { $operator: value } }
      if (Object.keys(where).length > 0) {
        queryOptions.where = where;
      }

      const results = await this.collection.query(queryOptions);

      // Process results
      const chunks = [];
      if (results.ids && results.ids[0] && results.ids[0].length > 0) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const distance = results.distances && results.distances[0] ? results.distances[0][i] : null;
          
          // Convert distance to similarity
          // ChromaDB uses cosine distance: similarity = 1 - distance
          // Distance ranges from 0 (identical) to 2 (opposite)
          // Similarity = 1 - (distance / 2) for normalized cosine distance
          let similarity;
          if (distance !== null && distance !== undefined) {
            // Normalize: distance 0-2 maps to similarity 1-0
            similarity = Math.max(0, 1 - (distance / 2));
          } else {
            // Fallback: if no distance provided, assume good match
            similarity = 0.8;
          }

          if (similarity >= minSimilarity) {
            chunks.push({
              id: results.ids[0][i],
              text: results.documents && results.documents[0] ? results.documents[0][i] : '',
              metadata: results.metadatas && results.metadatas[0] ? (results.metadatas[0][i] || {}) : {},
              similarity,
              distance: distance || 0
            });
          }
        }
      }

      // Sort by similarity (descending) and limit
      const sortedChunks = chunks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return sortedChunks;
    } catch (error) {
      console.error('Error querying ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Delete chunks by contentId
   * @param {string} contentId - Content ID to delete chunks for
   * @returns {Promise<number>} Number of deleted chunks
   */
  async deleteByContentId(contentId) {
    await this.initialize();

    try {
      // Query to find all chunks with this contentId
      const results = await this.collection.get({
        where: { contentId: contentId.toString() }
      });

      if (results && results.ids && results.ids.length > 0) {
        await this.collection.delete({ ids: results.ids });
        console.log(`✅ Deleted ${results.ids.length} chunks from ChromaDB for contentId: ${contentId}`);
        return results.ids.length;
      }

      return 0;
    } catch (error) {
      console.error('Error deleting chunks from ChromaDB:', error);
      // Don't throw - allow graceful degradation
      return 0;
    }
  }

  /**
   * Delete chunks by userId
   * @param {string} userId - User ID to delete chunks for
   * @returns {Promise<number>} Number of deleted chunks
   */
  async deleteByUserId(userId) {
    await this.initialize();

    try {
      const results = await this.collection.get({
        where: { userId }
      });

      if (results && results.ids && results.ids.length > 0) {
        await this.collection.delete({ ids: results.ids });
        console.log(`✅ Deleted ${results.ids.length} chunks from ChromaDB for userId: ${userId}`);
        return results.ids.length;
      }

      return 0;
    } catch (error) {
      console.error('Error deleting chunks from ChromaDB:', error);
      // Don't throw - allow graceful degradation
      return 0;
    }
  }

  /**
   * Get collection stats
   * @returns {Promise<Object>} Collection statistics
   */
  async getStats() {
    await this.initialize();

    try {
      const count = await this.collection.count();
      return {
        collectionName: this.collectionName,
        chunkCount: count || 0
      };
    } catch (error) {
      console.error('Error getting ChromaDB stats:', error);
      return {
        collectionName: this.collectionName,
        chunkCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Check if ChromaDB is ready
   * @returns {boolean} Whether ChromaDB is initialized
   */
  isReady() {
    return this.initialized;
  }
}

module.exports = ChromaService;

