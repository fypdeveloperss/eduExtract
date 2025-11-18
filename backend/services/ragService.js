const ChromaService = require('./chromaService');
const EmbeddingService = require('./embeddingService');
const TextChunker = require('../utils/textChunker');

/**
 * RAG Service
 * Handles Retrieval-Augmented Generation: embedding, storage, and semantic search
 */
class RAGService {
  constructor() {
    this.embeddingService = new EmbeddingService();
    this.chromaService = new ChromaService();
    this.textChunker = new TextChunker({
      chunkSize: 800, // Reduced to prevent memory issues
      chunkOverlap: 150,
      minChunkSize: 100,
      maxChunks: 50 // Limit maximum chunks per content
    });
  }

  /**
   * Process and store content with embeddings
   * @param {string} userId - User ID
   * @param {string} contentId - GeneratedContent ID
   * @param {string} contentType - Type of content (blog, summary, etc.)
   * @param {*} contentData - Content data to process
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Processing result
   */
  async processContent(userId, contentId, contentType, contentData, metadata = {}) {
    try {
      console.log(`Processing content for RAG: ${contentType}, contentId: ${contentId}`);

      // Try to delete existing chunks for this content (in case of update)
      try {
        await this.chromaService.deleteByContentId(contentId);
      } catch (chromaError) {
        console.log(`⚠️  ChromaDB unavailable for deletion - continuing without vector storage`);
        console.log(`ChromaDB error: ${chromaError.message}`);
      }

      // Chunk the content based on type
      const chunks = this.textChunker.chunkContent(contentData, contentType, {
        userId,
        contentId,
        ...metadata
      });

      if (chunks.length === 0) {
        console.log(`No chunks created for contentId: ${contentId}`);
        return { success: true, chunksCreated: 0 };
      }

      // Generate embeddings for all chunks in batches to avoid memory issues
      const texts = chunks.map(chunk => chunk.text);
      
      // Process embeddings in smaller batches to prevent memory overflow
      const batchSize = 5; // Reduced to 5 to avoid rate limits
      const embeddings = [];
      let successfulEmbeddings = 0;
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        try {
          const batchEmbeddings = await this.embeddingService.generateEmbeddings(batch);
          
          // Filter out null/undefined embeddings (failed ones)
          const validEmbeddings = batchEmbeddings.filter(emb => emb && Array.isArray(emb));
          embeddings.push(...validEmbeddings);
          successfulEmbeddings += validEmbeddings.length;
          
          // Log progress
          if (validEmbeddings.length < batch.length) {
            console.log(`Warning: Only ${validEmbeddings.length}/${batch.length} embeddings succeeded in batch ${Math.floor(i/batchSize) + 1}`);
          }
        } catch (error) {
          console.error(`Error processing embedding batch ${Math.floor(i/batchSize) + 1}:`, error.message);
          // Add null placeholders for failed embeddings
          embeddings.push(...new Array(batch.length).fill(null));
        }
        
        // Longer delay to prevent overwhelming the API and reduce memory pressure
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
      }
      
      // Filter out failed embeddings and adjust chunks accordingly
      const validChunks = [];
      const validEmbeddings = [];
      
      for (let i = 0; i < chunks.length; i++) {
        if (embeddings[i] && Array.isArray(embeddings[i])) {
          validChunks.push(chunks[i]);
          validEmbeddings.push(embeddings[i]);
        }
      }
      
      if (validChunks.length === 0) {
        console.log(`No valid embeddings generated for contentId: ${contentId}`);
        return { success: false, chunksCreated: 0, error: 'All embedding generations failed' };
      }
      
      console.log(`Successfully generated ${validEmbeddings.length}/${chunks.length} embeddings`);
      
      // Use valid chunks and embeddings directly
      // Prepare chunks with embeddings for ChromaDB
      const chunksWithEmbeddings = validChunks.map((chunk, index) => ({
        userId,
        contentId,
        contentType,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        embedding: validEmbeddings[index],
        metadata: {
          ...chunk,
          embeddingGenerated: new Date()
        }
      }));

      // Try to add to ChromaDB
      try {
        await this.chromaService.addChunks(chunksWithEmbeddings);
        console.log(`✅ Successfully stored ${chunksWithEmbeddings.length} chunks in ChromaDB for contentId: ${contentId}`);
      } catch (chromaError) {
        console.log(`⚠️  ChromaDB unavailable for storage - embeddings generated but not stored`);
        console.log(`ChromaDB error: ${chromaError.message}`);
      }

      console.log(`Successfully processed ${chunksWithEmbeddings.length} chunks for contentId: ${contentId}`);

      return {
        success: true,
        chunksCreated: chunksWithEmbeddings.length
      };
    } catch (error) {
      console.error('Error processing content for RAG:', error);
      throw new Error(`Failed to process content for RAG: ${error.message}`);
    }
  }

  /**
   * Retrieve relevant chunks for a query using semantic search
   * @param {string} query - User's query/question
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of relevant chunks with similarity scores
   */
  async retrieveRelevantChunks(query, options = {}) {
    try {
      const {
        userId,
        contentType,
        limit = 5,
        minSimilarity = 0.7,
        excludeContentIds = [],
        includeOnlyContentIds = null,
        includeCurrentSession = true
      } = options;

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Query ChromaDB for similar chunks
      const similarChunks = await this.chromaService.querySimilar(queryEmbedding, {
        userId,
        contentType,
        limit: limit * 2, // Get more chunks initially to filter better
        minSimilarity: minSimilarity * 0.9, // Slightly lower threshold for initial retrieval
        excludeContentIds,
        includeOnlyContentIds
      });

      // Filter chunks by includeOnlyContentIds if specified
      let filteredChunks = similarChunks;
      if (includeOnlyContentIds && includeOnlyContentIds.length > 0) {
        console.log(`Filtering chunks to only include content IDs: ${includeOnlyContentIds}`);
        filteredChunks = similarChunks.filter(chunk => {
          const contentIdStr = chunk.metadata?.contentId || chunk.contentId?.toString();
          return includeOnlyContentIds.includes(contentIdStr);
        });
        console.log(`Filtered ${similarChunks.length} chunks down to ${filteredChunks.length} chunks`);
      }

      // Group by contentId and select best chunks from each content
      const chunksByContent = {};
      filteredChunks.forEach(chunk => {
        const contentIdStr = chunk.metadata?.contentId || chunk.contentId?.toString();
        if (!chunksByContent[contentIdStr]) {
          chunksByContent[contentIdStr] = [];
        }
        chunksByContent[contentIdStr].push(chunk);
      });

      // Select top chunks from each content, prioritizing higher similarity
      const selectedChunks = [];
      Object.values(chunksByContent).forEach(contentChunks => {
        // Sort by similarity and take top 2 from each content
        const topChunks = contentChunks
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 2);
        selectedChunks.push(...topChunks);
      });

      // Sort all selected chunks by similarity and limit
      const finalChunks = selectedChunks
        .filter(chunk => chunk.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return finalChunks;
    } catch (error) {
      console.error('Error retrieving relevant chunks:', error);
      throw new Error(`Failed to retrieve relevant chunks: ${error.message}`);
    }
  }

  /**
   * Build context from retrieved chunks for LLM prompt
   * @param {Array} chunks - Retrieved chunks with similarity scores
   * @param {Object} currentSessionContent - Current session content (non-embedded)
   * @param {Object} originalSource - Original source material
   * @returns {string} Formatted context string
   */
  buildContextFromChunks(chunks, currentSessionContent = {}, originalSource = null) {
    let context = '';

    // Add original source if available (high priority)
    if (originalSource && originalSource.content) {
      context += `ORIGINAL SOURCE MATERIAL:\n`;
      context += `Type: ${originalSource.type}\n`;
      if (originalSource.url) {
        context += `Source: ${originalSource.url}\n`;
      }
      context += `Content: ${this.truncateText(originalSource.content, 1500)}\n\n`;
    }

    // Add current session content (high priority, non-embedded)
    if (Object.keys(currentSessionContent).length > 0) {
      context += `CURRENT SESSION GENERATED CONTENT:\n`;
      Object.keys(currentSessionContent).forEach(type => {
        const content = currentSessionContent[type];
        if (content && content.content) {
          context += `${type.toUpperCase()}:\n`;
          if (typeof content.content === 'string') {
            context += `${this.truncateText(content.content, 1000)}\n\n`;
          } else {
            context += `${JSON.stringify(content.content, null, 2).substring(0, 1000)}...\n\n`;
          }
        }
      });
    }

    // Add retrieved chunks from past content
    if (chunks && chunks.length > 0) {
      context += `RELEVANT CONTENT FROM YOUR LEARNING HISTORY:\n`;
      
      // Group chunks by contentId for better organization
      const chunksByContent = {};
      chunks.forEach(chunk => {
        const contentIdStr = chunk.metadata?.contentId || chunk.contentId?.toString();
        const contentType = chunk.metadata?.contentType || chunk.contentType;
        if (!chunksByContent[contentIdStr]) {
          chunksByContent[contentIdStr] = {
            contentType: contentType,
            chunks: []
          };
        }
        chunksByContent[contentIdStr].chunks.push(chunk);
      });

      Object.values(chunksByContent).forEach(({ contentType, chunks: contentChunks }) => {
        const firstChunk = contentChunks[0];
        const similarity = firstChunk.similarity || 0;
        context += `\n${contentType.toUpperCase()} (Relevance: ${(similarity * 100).toFixed(1)}%):\n`;
        contentChunks.forEach((chunk, index) => {
          const chunkText = chunk.text || chunk.document || '';
          context += `[Chunk ${index + 1}] ${chunkText}\n`;
        });
      });
    }

    return context;
  }

  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Delete all chunks for a user (cleanup)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUserChunks(userId) {
    try {
      const deletedCount = await this.chromaService.deleteByUserId(userId);
      return {
        success: true,
        deletedCount: deletedCount
      };
    } catch (error) {
      console.error('Error deleting user chunks:', error);
      throw new Error(`Failed to delete user chunks: ${error.message}`);
    }
  }

  /**
   * Delete chunks for specific content
   * @param {string} contentId - Content ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteContentChunks(contentId) {
    try {
      const deletedCount = await this.chromaService.deleteByContentId(contentId);
      return {
        success: true,
        deletedCount: deletedCount
      };
    } catch (error) {
      console.error('Error deleting content chunks:', error);
      throw new Error(`Failed to delete content chunks: ${error.message}`);
    }
  }
}

module.exports = RAGService;

