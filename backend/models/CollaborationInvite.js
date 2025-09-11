const mongoose = require('mongoose');

const collaborationInviteSchema = new mongoose.Schema({
  collaborationSpaceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'CollaborationSpace'
  },
  spaceName: {
    type: String,
    required: true
  },
  invitedBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  invitedByName: {
    type: String,
    required: true
  },
  invitedEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  invitedUserId: {
    type: String,
    ref: 'User',
    default: null
  },
  permission: {
    type: String,
    required: true,
    enum: ['view', 'edit', 'admin'],
    default: 'view'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
    default: 'pending'
  },
  inviteToken: {
    type: String,
    required: true,
    unique: true
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  responseMessage: {
    type: String,
    trim: true,
    maxlength: 300
  },
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
collaborationInviteSchema.index({ inviteToken: 1 });
collaborationInviteSchema.index({ collaborationSpaceId: 1, status: 1 });
collaborationInviteSchema.index({ invitedEmail: 1, status: 1 });
collaborationInviteSchema.index({ invitedUserId: 1 });
collaborationInviteSchema.index({ expiresAt: 1 });

// Auto-expire invites
collaborationInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Update the updatedAt field before saving
collaborationInviteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('CollaborationInvite', collaborationInviteSchema);
