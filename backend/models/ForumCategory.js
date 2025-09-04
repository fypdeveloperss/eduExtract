const mongoose = require('mongoose');

const forumCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  topicCount: {
    type: Number,
    default: 0
  },
  lastTopic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumTopic',
    default: null
  },
  lastPostAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Update topic count when topics are added/removed
forumCategorySchema.methods.updateTopicCount = async function() {
  const ForumTopic = mongoose.model('ForumTopic');
  const count = await ForumTopic.countDocuments({ categoryId: this._id });
  this.topicCount = count;
  await this.save();
};

module.exports = mongoose.model('ForumCategory', forumCategorySchema);
