const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  name: {
    type: String,
    required: false,
    default: 'Unknown User'
  },
  email: {
    type: String,
    required: true
  },
  permission: {
    type: String,
    enum: ['view', 'edit', 'admin'],
    default: 'view'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  invitedBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive'],
    default: 'pending'
  }
});

const collaborationSpaceSchema = new mongoose.Schema({
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
  ownerId: {
    type: String,
    required: true,
    ref: 'User'
  },
  ownerName: {
    type: String,
    required: true
  },
  collaborators: [collaboratorSchema],
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    required: true,
    enum: ['academic', 'research', 'project', 'study-group', 'other']
  },
  privacy: {
    type: String,
    enum: ['public', 'private', 'restricted'],
    default: 'private'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowGuestView: {
      type: Boolean,
      default: false
    },
    requireApprovalForJoin: {
      type: Boolean,
      default: true
    },
    autoApproveJoinRequests: {
      type: Boolean,
      default: false
    },
    enableComments: {
      type: Boolean,
      default: true
    },
    enableVersioning: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    totalCollaborators: {
      type: Number,
      default: 0
    },
    totalContent: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    pendingJoinRequests: {
      type: Number,
      default: 0
    },
    pendingChangeRequests: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
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
collaborationSpaceSchema.index({ ownerId: 1, createdAt: -1 });
collaborationSpaceSchema.index({ 'collaborators.userId': 1 });
collaborationSpaceSchema.index({ category: 1, privacy: 1 });
collaborationSpaceSchema.index({ tags: 1 });

// Update the updatedAt field before saving
collaborationSpaceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  // Update total collaborators count
  this.stats.totalCollaborators = this.collaborators.filter(c => c.status === 'active').length;
  next();
});

module.exports = mongoose.model('CollaborationSpace', collaborationSpaceSchema);
