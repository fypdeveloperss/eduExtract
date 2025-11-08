const axios = require('axios');

/**
 * Embedding Service
 * Handles text embedding generation using multiple providers
 * Supports: OpenAI, Hugging Face (free alternative)
 */
class EmbeddingService {
  constructor() {
    // Determine which provider to use
    this.provider = process.env.EMBEDDING_PROVIDER || 'huggingface'; // 'openai' or 'huggingface'
    
    // Provider-specific configuration
    if (this.provider === 'openai') {
      const OpenAI = require('openai');
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      this.model = 'text-embedding-3-small';
      this.dimensions = 1536;
    } else {
      // Hugging Face configuration (free alternative)
      this.hfApiKey = process.env.HUGGINGFACE_API_KEY || null; // Optional, works without key for public models
      this.model = 'sentence-transformers/all-MiniLM-L6-v2'; // Free, fast, 384 dimensions
      this.dimensions = 384;
      // Use the correct Hugging Face Inference API endpoint
      this.hfApiUrl = `https://api-inference.huggingface.co/models/${this.model}`;
    }
    
    // Cache for embeddings to avoid redundant API calls
    this.embeddingCache = new Map();
    this.cacheMaxSize = 1000; // Maximum cache size
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text must be a non-empty string');
    }

    // Normalize text
    const normalizedText = text.trim();
    
    // Check cache first
    const cacheKey = this.getCacheKey(normalizedText);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }

    try {
      let embedding;

      if (this.provider === 'openai') {
        // Use OpenAI embeddings
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: normalizedText,
          dimensions: this.dimensions
        });
        embedding = response.data[0].embedding;
      } else {
        // Use Hugging Face embeddings (free alternative)
        // Retry logic for Hugging Face (model might be loading)
        let embedding = null;
        let lastError = null;
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await axios.post(
              this.hfApiUrl,
              { inputs: normalizedText },
              {
                headers: {
                  ...(this.hfApiKey && { Authorization: `Bearer ${this.hfApiKey}` }),
                  'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 second timeout (model loading can take time)
              }
            );

            // Handle different response formats from Hugging Face
            if (Array.isArray(response.data)) {
              // If response is array of arrays, take first element
              embedding = Array.isArray(response.data[0]) ? response.data[0] : response.data;
            } else if (response.data && Array.isArray(response.data[0])) {
              embedding = response.data[0];
            } else if (Array.isArray(response.data)) {
              embedding = response.data;
            } else {
              throw new Error('Unexpected response format from Hugging Face');
            }
            
            // Ensure it's a flat array
            if (!Array.isArray(embedding) || embedding.length === 0) {
              throw new Error('Invalid embedding format from Hugging Face');
            }
            
            // Success - break out of retry loop
            break;
          } catch (error) {
            lastError = error;
            
            // If it's a 503 (model loading) or 410 (deprecated), wait and retry
            if (error.response) {
              const status = error.response.status;
              if (status === 503 || status === 410) {
                if (attempt < maxRetries) {
                  const waitTime = attempt * 2000; // 2s, 4s, 6s
                  console.log(`Hugging Face model loading (${status}), waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                  continue;
                }
              }
            }
            
            // For other errors or max retries reached, throw
            if (attempt === maxRetries) {
              throw error;
            }
          }
        }
        
        if (!embedding) {
          throw lastError || new Error('Failed to get embedding after retries');
        }
      }

      // Cache the embedding
      this.cacheEmbedding(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      if (error.response) {
        console.error('API Response:', error.response.status, error.response.data);
      }
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} Array of embedding vectors
   */
  async generateEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts must be a non-empty array');
    }

    // Filter out empty texts and normalize
    const validTexts = texts
      .map(text => typeof text === 'string' ? text.trim() : String(text))
      .filter(text => text.length > 0);

    if (validTexts.length === 0) {
      throw new Error('No valid texts to embed');
    }

    // Check cache for all texts first
    const results = [];
    const textsToEmbed = [];
    const textIndices = [];

    validTexts.forEach((text, index) => {
      const cacheKey = this.getCacheKey(text);
      if (this.embeddingCache.has(cacheKey)) {
        results[index] = this.embeddingCache.get(cacheKey);
      } else {
        textsToEmbed.push(text);
        textIndices.push(index);
      }
    });

    // Generate embeddings for texts not in cache
    if (textsToEmbed.length > 0) {
      try {
        if (this.provider === 'openai') {
          // OpenAI batch processing
          const batchSize = 100;
          const batches = [];
          
          for (let i = 0; i < textsToEmbed.length; i += batchSize) {
            batches.push(textsToEmbed.slice(i, i + batchSize));
          }

          for (const batch of batches) {
            const response = await this.openai.embeddings.create({
              model: this.model,
              input: batch,
              dimensions: this.dimensions
            });

            // Store embeddings in results array at correct indices
            response.data.forEach((item, batchIndex) => {
              const originalIndex = textIndices[textsToEmbed.indexOf(batch[batchIndex])];
              const embedding = item.embedding;
              results[originalIndex] = embedding;
              
              // Cache the embedding
              const cacheKey = this.getCacheKey(batch[batchIndex]);
              this.cacheEmbedding(cacheKey, embedding);
            });
          }
        } else {
          // Hugging Face batch processing (process one at a time to avoid rate limits)
          // Hugging Face free tier has rate limits, so we process sequentially
          for (let i = 0; i < textsToEmbed.length; i++) {
            const text = textsToEmbed[i];
            const originalIndex = textIndices[i];
            
            let embedding = null;
            let lastError = null;
            const maxRetries = 3;
            
            // Retry logic for each text
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                const response = await axios.post(
                  this.hfApiUrl,
                  { inputs: text },
                  {
                    headers: {
                      ...(this.hfApiKey && { Authorization: `Bearer ${this.hfApiKey}` }),
                      'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60 second timeout
                  }
                );

                // Handle different response formats
                if (Array.isArray(response.data)) {
                  embedding = Array.isArray(response.data[0]) ? response.data[0] : response.data;
                } else if (response.data && Array.isArray(response.data[0])) {
                  embedding = response.data[0];
                } else if (Array.isArray(response.data)) {
                  embedding = response.data;
                } else {
                  throw new Error('Unexpected response format');
                }

                if (!Array.isArray(embedding) || embedding.length === 0) {
                  throw new Error('Invalid embedding format');
                }

                // Success - break out of retry loop
                break;
              } catch (error) {
                lastError = error;
                
                // Handle 503 (model loading) or 410 (deprecated endpoint)
                if (error.response) {
                  const status = error.response.status;
                  if (status === 503 || status === 410) {
                    if (attempt < maxRetries) {
                      const waitTime = attempt * 2000; // 2s, 4s, 6s
                      console.log(`Hugging Face error (${status}) for text ${i}, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`);
                      await new Promise(resolve => setTimeout(resolve, waitTime));
                      continue;
                    }
                  }
                }
                
                // For other errors or max retries, log and continue to next text
                if (attempt === maxRetries) {
                  console.error(`Error embedding text ${i} after ${maxRetries} attempts:`, error.message);
                  if (error.response) {
                    console.error(`Status: ${error.response.status}, Data:`, error.response.data);
                  }
                  break; // Move to next text
                }
              }
            }
            
            if (embedding) {
              results[originalIndex] = embedding;
              
              // Cache the embedding
              const cacheKey = this.getCacheKey(text);
              this.cacheEmbedding(cacheKey, embedding);
            } else {
              console.warn(`Failed to embed text ${i} after all retries, skipping...`);
            }

            // Small delay to respect rate limits (free tier)
            if (i < textsToEmbed.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
            }
          }
        }
      } catch (error) {
        console.error('Error generating batch embeddings:', error);
        throw new Error(`Failed to generate embeddings: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {number[]} embedding1 - First embedding vector
   * @param {number[]} embedding2 - Second embedding vector
   * @returns {number} Cosine similarity score (0 to 1)
   */
  cosineSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Get cache key for text
   * @param {string} text - Text to create cache key for
   * @returns {string} Cache key
   */
  getCacheKey(text) {
    // Use a simple hash for cache key
    return Buffer.from(text).toString('base64').substring(0, 100);
  }

  /**
   * Cache an embedding
   * @param {string} key - Cache key
   * @param {number[]} embedding - Embedding vector
   */
  cacheEmbedding(key, embedding) {
    if (this.embeddingCache.size >= this.cacheMaxSize) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    this.embeddingCache.set(key, embedding);
  }

  /**
   * Clear the embedding cache
   */
  clearCache() {
    this.embeddingCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.embeddingCache.size,
      maxSize: this.cacheMaxSize
    };
  }
}

module.exports = EmbeddingService;

