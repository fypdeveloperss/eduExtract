const mongoose = require('mongoose');

const forumTopicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumCategory',
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
  viewCount: {
    type: Number,
    default: 0
  },
  replyCount: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  lastPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumPost',
    default: null
  },
  lastPostAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Update reply count when posts are added/removed
forumTopicSchema.methods.updateReplyCount = async function() {
  const ForumPost = mongoose.model('ForumPost');
  const count = await ForumPost.countDocuments({ topicId: this._id });
  this.replyCount = count;
  await this.save();
};

// Update last post info
forumTopicSchema.methods.updateLastPost = async function(postId, postDate) {
  this.lastPostId = postId;
  this.lastPostAt = postDate;
  await this.save();
};

module.exports = mongoose.model('ForumTopic', forumTopicSchema);
