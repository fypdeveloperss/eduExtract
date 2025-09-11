const mongoose = require('mongoose');

const changeRequestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  sharedContentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'SharedContent'
  },
  collaborationSpaceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'CollaborationSpace'
  },
  requestedBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  requestedByName: {
    type: String,
    required: true
  },
  requestType: {
    type: String,
    required: true,
    enum: ['content_edit', 'permission_change', 'content_delete', 'structure_change', 'other']
  },
  changes: {
    type: mongoose.Schema.Types.Mixed, // Store the actual changes or diff
    required: true
  },
  originalContent: {
    type: mongoose.Schema.Types.Mixed, // Store original content for comparison
    required: true
  },
  proposedContent: {
    type: mongoose.Schema.Types.Mixed, // Store proposed changes
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  reviewedBy: {
    type: String,
    ref: 'User',
    default: null
  },
  reviewedByName: {
    type: String,
    default: null
  },
  reviewComments: {
    type: String,
    trim: true,
    maxlength: 500
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  comments: [{
    userId: {
      type: String,
      required: true,
      ref: 'User'
    },
    userName: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
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
  metadata: {
    ipAddress: String,
    userAgent: String,
    platform: String
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
changeRequestSchema.index({ sharedContentId: 1, status: 1 });
changeRequestSchema.index({ collaborationSpaceId: 1, createdAt: -1 });
changeRequestSchema.index({ requestedBy: 1 });
changeRequestSchema.index({ status: 1, priority: 1 });
changeRequestSchema.index({ reviewedBy: 1 });

// Update the updatedAt field before saving
changeRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
