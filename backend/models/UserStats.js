const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  // Reference to user
  userId: {
    type: String,
    required: true,
    unique: true,
    ref: 'User'
  },
  
  // Content statistics
  totalUploads: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalViews: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalLikes: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalDownloads: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Reputation system
  reputationScore: {
    type: Number,
    default: 0,
    min: 0
  },
  
  reputationLevel: {
    type: String,
    enum: ['newcomer', 'contributor', 'expert', 'master', 'legend'],
    default: 'newcomer'
  },
  
  // Badges and achievements
  badges: [{
    type: String,
    enum: [
      'first-upload',           // First content upload
      'verified-creator',        // Verified content creator
      'top-contributor',         // High-quality content
      'popular-content',         // Content with many views
      'helpful-creator',         // Many helpful reviews
      'consistent-uploader',     // Regular uploads
      'quality-content',         // High-rated content
      'community-favorite'       // Loved by community
    ]
  }],
  
  // Social connections
  followers: [{
    type: String,
    ref: 'User'
  }],
  
  following: [{
    type: String,
    ref: 'User'
  }],
  
  // Content performance metrics
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  totalRatings: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Engagement metrics
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  joinDate: {
    type: Date,
    default: Date.now
  },
  
  // Content type distribution
  contentTypeStats: {
    blog: { type: Number, default: 0 },
    slides: { type: Number, default: 0 },
    flashcards: { type: Number, default: 0 },
    quiz: { type: Number, default: 0 },
    summary: { type: Number, default: 0 },
    personal: { type: Number, default: 0 }
  },
  
  // Category expertise
  categoryExpertise: [{
    category: {
      type: String,
      enum: ['mathematics', 'science', 'history', 'literature', 'languages', 'arts', 'technology', 'business', 'health', 'other']
    },
    uploads: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 }
  }]
});

// Add indexes for better query performance
userStatsSchema.index({ reputationScore: -1 });
userStatsSchema.index({ totalUploads: -1 });
userStatsSchema.index({ totalViews: -1 });
userStatsSchema.index({ lastActive: -1 });

// Update lastActive timestamp before saving
userStatsSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

// Calculate reputation level based on score
userStatsSchema.pre('save', function(next) {
  if (this.reputationScore >= 10000) {
    this.reputationLevel = 'legend';
  } else if (this.reputationScore >= 5000) {
    this.reputationLevel = 'master';
  } else if (this.reputationScore >= 1000) {
    this.reputationLevel = 'expert';
  } else if (this.reputationScore >= 100) {
    this.reputationLevel = 'contributor';
  } else {
    this.reputationLevel = 'newcomer';
  }
  next();
});

// Virtual for follower count
userStatsSchema.virtual('followerCount').get(function() {
  return this.followers.length;
});

// Virtual for following count
userStatsSchema.virtual('followingCount').get(function() {
  return this.following.length;
});

// Virtual for total content count
userStatsSchema.virtual('totalContent').get(function() {
  return this.totalUploads;
});

// Ensure virtual fields are serialized
userStatsSchema.set('toJSON', { virtuals: true });
userStatsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('UserStats', userStatsSchema);
