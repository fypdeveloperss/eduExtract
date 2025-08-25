const mongoose = require('mongoose');

const contentReviewSchema = new mongoose.Schema({
  // Reference to the content being reviewed
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceContent',
    required: true
  },
  
  // Reviewer information
  reviewerId: {
    type: String,
    ref: 'User',
    required: true
  },
  
  // Rating (1-5 stars)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number between 1 and 5'
    }
  },
  
  // Review text
  review: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 1000
  },
  
  // Review categories
  categories: [{
    type: String,
    enum: [
      'accuracy',        // Content accuracy
      'clarity',         // How clear the content is
      'completeness',    // How complete the content is
      'usefulness',      // How useful the content is
      'originality',     // How original the content is
      'presentation'     // How well it's presented
    ]
  }],
  
  // Helpful votes
  helpful: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Users who found this review helpful
  helpfulVotes: [{
    userId: {
      type: String,
      ref: 'User'
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Review status
  status: {
    type: String,
    enum: ['active', 'hidden', 'flagged'],
    default: 'active'
  },
  
  // Flagged content (for moderation)
  flaggedBy: [{
    userId: {
      type: String,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['inappropriate', 'spam', 'offensive', 'misleading', 'other']
    },
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
contentReviewSchema.index({ contentId: 1, createdAt: -1 });
contentReviewSchema.index({ reviewerId: 1 });
contentReviewSchema.index({ rating: 1 });
contentReviewSchema.index({ helpful: -1 });

// Update the updatedAt field before saving
contentReviewSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure one review per user per content
contentReviewSchema.index({ contentId: 1, reviewerId: 1 }, { unique: true });

// Virtual for review age
contentReviewSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for review sentiment
contentReviewSchema.virtual('sentiment').get(function() {
  if (this.rating >= 4) return 'positive';
  if (this.rating >= 3) return 'neutral';
  return 'negative';
});

// Ensure virtual fields are serialized
contentReviewSchema.set('toJSON', { virtuals: true });
contentReviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ContentReview', contentReviewSchema);
