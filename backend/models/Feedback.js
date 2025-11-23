const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  // User information
  userId: {
    type: String, // Firebase UID
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Feedback content
  subject: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxLength: 2000
  },
  
  // Feedback type/category
  category: {
    type: String,
    enum: [
      'bug_report',
      'feature_request',
      'general_feedback',
      'user_experience',
      'content_quality',
      'performance_issue',
      'other'
    ],
    default: 'general_feedback',
    index: true
  },
  
  // Rating (optional)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  
  // Admin response
  adminResponse: {
    type: String,
    default: null
  },
  respondedBy: {
    type: String, // Admin UID who responded
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true
  }],
  
  // Metadata
  userAgent: String,
  ipAddress: String,
  
  // Attachments (if any screenshots/files are uploaded)
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    type: String
  }],
  
  // Follow-up flag
  followUpRequired: {
    type: Boolean,
    default: false
  },
  
  // Internal notes for admins
  internalNotes: [{
    note: String,
    addedBy: String, // Admin UID
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: {
    createdAt: 'submittedAt',
    updatedAt: 'lastModified'
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
feedbackSchema.index({ userId: 1, submittedAt: -1 });
feedbackSchema.index({ status: 1, priority: -1, submittedAt: -1 });
feedbackSchema.index({ category: 1, status: 1 });

// Virtual for time since submission
feedbackSchema.virtual('timeSinceSubmission').get(function() {
  const now = new Date();
  const submitted = this.submittedAt;
  const diffMs = now - submitted;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Less than an hour ago';
  }
});

// Method to add internal note
feedbackSchema.methods.addInternalNote = function(note, adminUid) {
  this.internalNotes.push({
    note: note,
    addedBy: adminUid,
    addedAt: new Date()
  });
  return this.save();
};

// Method to update status
feedbackSchema.methods.updateStatus = function(newStatus, adminUid, response = null) {
  this.status = newStatus;
  if (response) {
    this.adminResponse = response;
    this.respondedBy = adminUid;
    this.respondedAt = new Date();
  }
  return this.save();
};

// Static method to get feedback stats
feedbackSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: 1 },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        resolvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  
  const byCategory = await this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const byPriority = await this.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    overview: stats[0] || { totalFeedback: 0, pendingCount: 0, resolvedCount: 0, avgRating: 0 },
    byCategory,
    byPriority
  };
};

module.exports = mongoose.model('Feedback', feedbackSchema);