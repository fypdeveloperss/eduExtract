const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumTopic',
    required: true
  },
  authorId: {
    type: String,
    required: true,
    ref: 'User'
  },
  authorName: {
    type: String,
    required: true,
    trim: true
  },
  authorEmail: {
    type: String,
    required: true,
    trim: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editReason: {
    type: String,
    trim: true,
    maxlength: 200
  },
  editedAt: {
    type: Date,
    default: null
  },
  upvoteCount: {
    type: Number,
    default: 0
  },
  downvoteCount: {
    type: Number,
    default: 0
  },
  voters: {
    type: Map,
    of: Number,
    default: {}
  },
}, {
  timestamps: true
});

// Update topic's last post info when a new post is created
forumPostSchema.post('save', async function() {
  const ForumTopic = mongoose.model('ForumTopic');
  const topic = await ForumTopic.findById(this.topicId);
  if (topic) {
    await topic.updateLastPost(this._id, this.createdAt);
    await topic.updateReplyCount();
  }
});

// Update topic's reply count when a post is deleted
forumPostSchema.post('deleteOne', { document: true, query: false }, async function() {
  const ForumTopic = mongoose.model('ForumTopic');
  const topic = await ForumTopic.findById(this.topicId);
  if (topic) {
    await topic.updateReplyCount();
  }
});

module.exports = mongoose.model('ForumPost', forumPostSchema);
