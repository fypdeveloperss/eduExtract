const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true // For faster queries by user
  },
  sessionId: {
    type: String,
    required: true,
    index: true // For faster queries by session
  },
  messages: [{
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant', 'system']
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  relatedContentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeneratedContent'
  }],
  contextSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
chatHistorySchema.index({ userId: 1, createdAt: -1 });
chatHistorySchema.index({ sessionId: 1 });
chatHistorySchema.index({ userId: 1, isActive: 1 });

// Update the updatedAt field before saving
chatHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to add a message
chatHistorySchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata
  });
  return this.save();
};

// Instance method to get recent messages
chatHistorySchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .reverse(); // Reverse to get chronological order
};

// Static method to find active session for user
chatHistorySchema.statics.findActiveSession = function(userId) {
  return this.findOne({ userId, isActive: true })
    .sort({ updatedAt: -1 });
};

// Static method to create new session
chatHistorySchema.statics.createSession = function(userId, sessionId, initialContext = {}) {
  return this.create({
    userId,
    sessionId,
    contextSnapshot: initialContext,
    messages: [],
    relatedContentIds: []
  });
};

// Static method to get user's chat history
chatHistorySchema.statics.getUserHistory = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('sessionId messages createdAt updatedAt isActive')
    .lean();
};

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
