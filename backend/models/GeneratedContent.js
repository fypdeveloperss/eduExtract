const mongoose = require('mongoose');

const generatedContentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['blog', 'summary', 'flashcards', 'quiz', 'slides']
  },
  title: {
    type: String,
    required: true
  },
  // Support both old and new field names for backward compatibility
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: false // Make optional for backward compatibility
  },
  contentData: {
    type: mongoose.Schema.Types.Mixed,
    required: false // Make optional for forward compatibility
  },
  originalText: {
    type: String,
    required: false // Make optional for backward compatibility
  },
  url: {
    type: String,
    required: false // Make optional for forward compatibility
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Quality and flagging fields
  flagged: {
    type: Boolean,
    default: false
  },
  flaggedAt: {
    type: Date,
    required: false
  },
  flaggedBy: {
    type: String,
    required: false,
    ref: 'User'
  },
  flagReason: {
    type: String,
    required: false,
    maxlength: 500
  },
  qualityScore: {
    type: Number,
    required: false,
    min: 0,
    max: 100
  },
  // KnowledgeVault: Advanced tagging and categorization
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  category: {
    type: String,
    required: false,
    enum: ['mathematics', 'science', 'history', 'literature', 'languages', 'arts', 'technology', 'business', 'health', 'other'],
    default: 'other'
  },
  subject: {
    type: String,
    required: false,
    trim: true,
    maxlength: 100
  },
  difficulty: {
    type: String,
    required: false,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  }
});

// Add indexes for better search performance
generatedContentSchema.index({ userId: 1, createdAt: -1 });
generatedContentSchema.index({ tags: 1 });
generatedContentSchema.index({ category: 1, subject: 1 });
generatedContentSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('GeneratedContent', generatedContentSchema); 