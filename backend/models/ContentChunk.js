const mongoose = require('mongoose');

/**
 * ContentChunk Schema
 * Stores text chunks with their embeddings for RAG (Retrieval-Augmented Generation)
 */
const contentChunkSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeneratedContent',
    required: true,
    index: true
  },
  contentType: {
    type: String,
    required: true,
    enum: ['blog', 'summary', 'flashcards', 'quiz', 'slides', 'transcript', 'document'],
    index: true
  },
  chunkIndex: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number], // Vector embedding array
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for efficient queries
contentChunkSchema.index({ userId: 1, contentType: 1, createdAt: -1 });
contentChunkSchema.index({ contentId: 1, chunkIndex: 1 });

// Static method to find similar chunks using cosine similarity
contentChunkSchema.statics.findSimilarChunks = async function(queryEmbedding, options = {}) {
  const {
    userId,
    contentType,
    limit = 5,
    minSimilarity = 0.7,
    excludeContentIds = []
  } = options;

  // Build query
  const query = {};
  if (userId) query.userId = userId;
  if (contentType) query.contentType = contentType;
  if (excludeContentIds.length > 0) {
    query.contentId = { $nin: excludeContentIds };
  }

  // Get all chunks matching the query
  const chunks = await this.find(query).lean();

  // Calculate cosine similarity for each chunk
  const chunksWithSimilarity = chunks.map(chunk => {
    const similarity = this.calculateCosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      ...chunk,
      similarity
    };
  });

  // Filter by minimum similarity and sort by similarity
  const filteredChunks = chunksWithSimilarity
    .filter(chunk => chunk.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return filteredChunks;
};

// Static method to calculate cosine similarity
contentChunkSchema.statics.calculateCosineSimilarity = function(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
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
};

// Static method to delete chunks by contentId
contentChunkSchema.statics.deleteByContentId = function(contentId) {
  return this.deleteMany({ contentId });
};

// Static method to delete chunks by userId
contentChunkSchema.statics.deleteByUserId = function(userId) {
  return this.deleteMany({ userId });
};

module.exports = mongoose.model('ContentChunk', contentChunkSchema);

