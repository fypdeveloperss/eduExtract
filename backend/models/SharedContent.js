const mongoose = require('mongoose');

const sharedContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // Can store any type of content
    required: true
  },
  contentType: {
    type: String,
    required: true,
    enum: ['document', 'slide', 'quiz', 'flashcard', 'summary', 'note', 'other']
  },
  collaborationSpaceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'CollaborationSpace'
  },
  createdBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  createdByName: {
    type: String,
    required: true
  },
  lastModifiedBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  lastModifiedByName: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'published'],
    default: 'draft'
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String,
    uploadedBy: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  permissions: {
    canView: [{
      type: String,
      ref: 'User'
    }],
    canEdit: [{
      type: String,
      ref: 'User'
    }],
    canApprove: [{
      type: String,
      ref: 'User'
    }]
  },
  versionHistory: [{
    version: {
      type: Number,
      required: true
    },
    content: {
      type: mongoose.Schema.Types.Mixed
    },
    modifiedBy: {
      type: String,
      required: true,
      ref: 'User'
    },
    modifiedByName: {
      type: String,
      required: true
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    changes: {
      type: mongoose.Schema.Types.Mixed
    },
    comment: {
      type: String,
      trim: true
    }
  }],
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedBy: {
    type: String,
    ref: 'User'
  },
  lockedAt: {
    type: Date
  },
  lockExpiry: {
    type: Date
  },
  stats: {
    views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    collaborators: {
      type: Number,
      default: 0
    }
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

// Indexes for better performance
sharedContentSchema.index({ collaborationSpaceId: 1, createdAt: -1 });
sharedContentSchema.index({ createdBy: 1 });
sharedContentSchema.index({ contentType: 1 });
sharedContentSchema.index({ status: 1 });
sharedContentSchema.index({ tags: 1 });

// Update the updatedAt field before saving
sharedContentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SharedContent', sharedContentSchema);
