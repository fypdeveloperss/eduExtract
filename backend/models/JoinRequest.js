const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  requesterId: {
    type: String,
    required: true,
    ref: 'User'
  },
  requesterName: {
    type: String,
    required: true
  },
  requesterEmail: {
    type: String,
    required: true
  },
  spaceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'CollaborationSpace'
  },
  spaceName: {
    type: String,
    required: true
  },
  spaceOwnerId: {
    type: String,
    required: true,
    ref: 'User'
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedPermission: {
    type: String,
    enum: ['view', 'edit'],
    default: 'view'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String,
    ref: 'User'
  },
  reviewMessage: {
    type: String,
    trim: true,
    maxlength: 300
  },
  autoApproved: {
    type: Boolean,
    default: false
  }
});

// Compound index to prevent duplicate requests
joinRequestSchema.index({ requesterId: 1, spaceId: 1 }, { unique: true });

// Indexes for efficient queries
joinRequestSchema.index({ spaceId: 1, status: 1 });
joinRequestSchema.index({ requesterId: 1, status: 1 });
joinRequestSchema.index({ spaceOwnerId: 1, status: 1 });
joinRequestSchema.index({ createdAt: -1 });

// Pre-save middleware to set reviewed date
joinRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'pending' && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('JoinRequest', joinRequestSchema);