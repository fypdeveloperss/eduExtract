const mongoose = require('mongoose');

const chatContextSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  context: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
    // TTL index defined in schema.index() below
    // Note: 'expires' field is removed as TTL is handled by the index
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

// Create index for automatic cleanup
chatContextSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 });

module.exports = mongoose.model('ChatContext', chatContextSchema);
