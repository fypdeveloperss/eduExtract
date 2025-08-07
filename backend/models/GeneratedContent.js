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
  }
});

module.exports = mongoose.model('GeneratedContent', generatedContentSchema); 