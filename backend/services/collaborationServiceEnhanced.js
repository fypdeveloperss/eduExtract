const CollaborationSpace = require('../models/CollaborationSpace');
const SharedContent = require('../models/SharedContent');
const ChangeRequest = require('../models/ChangeRequest');
const CollaborationInvite = require('../models/CollaborationInvite');
const User = require('../models/User');
const crypto = require('crypto');

class CollaborationService {
  // ===== COLLABORATION SPACE MANAGEMENT =====

  async createCollaborationSpace(spaceData, ownerId, ownerName, ownerEmail) {
    try {
      const space = new CollaborationSpace({
        ...spaceData,
        ownerId,
        ownerName: ownerName || 'Unknown User',
        collaborators: [{
          userId: ownerId,
          name: ownerName || 'Unknown User',
          email: ownerEmail,
          permission: 'admin',
          status: 'active',
          invitedBy: ownerId,
          joinedAt: new Date()
        }]
      });

      await space.save();
      return space;
    } catch (error) {
      throw new Error(`Failed to create collaboration space: ${error.message}`);
    }
  }

  async getUserCollaborationSpaces(userId, page = 1, limit = 20, role = 'all') {
    try {
      const skip = (page - 1) * limit;
      let query = {};

      if (role === 'owner') {
        query.ownerId = userId;
      } else if (role === 'collaborator') {
        query = {
          'collaborators.userId': userId,
          'collaborators.status': 'active',
          ownerId: { $ne: userId }
        };
      } else {
        // All spaces where user is owner or active collaborator
        query = {
          $or: [
            { ownerId: userId },
            {
              'collaborators.userId': userId,
              'collaborators.status': 'active'
            }
          ]
        };
      }

      query.isActive = true;

      const spaces = await CollaborationSpace.find(query)
        .sort({ 'stats.lastActivity': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await CollaborationSpace.countDocuments(query);

      return {
        spaces,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get collaboration spaces: ${error.message}`);
    }
  }

  async getCollaborationSpaceById(spaceId, userId) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found');
      }

      // Check if user has access
      const hasAccess = this.checkUserAccess(space, userId);
      if (!hasAccess) {
        throw new Error('Access denied to this collaboration space');
      }

      return space;
    } catch (error) {
      throw new Error(`Failed to get collaboration space: ${error.message}`);
    }
  }

  // ===== REAL-TIME COLLABORATION SUPPORT =====

  async checkUserSpaceAccess(userId, spaceId) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      if (!space || !space.isActive) {
        return false;
      }
      return this.checkUserAccess(space, userId);
    } catch (error) {
      console.error('Error checking user space access:', error);
      return false;
    }
  }

  async checkUserSpacePermissions(userId, spaceId, requiredPermission = 'view') {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      if (!space || !space.isActive) {
        return false;
      }

      const userPermission = this.getUserPermission(space, userId);
      return this.hasPermission(userPermission, requiredPermission);
    } catch (error) {
      console.error('Error checking user space permissions:', error);
      return false;
    }
  }

  async checkUserContentPermissions(userId, spaceId, contentId, requiredPermission = 'view') {
    try {
      // First check space permissions
      const hasSpacePermission = await this.checkUserSpacePermissions(userId, spaceId, requiredPermission);
      if (!hasSpacePermission) {
        return false;
      }

      // Additional content-specific permission checks can be added here
      const content = await SharedContent.findById(contentId);
      if (!content || content.collaborationSpaceId.toString() !== spaceId) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking user content permissions:', error);
      return false;
    }
  }

  async saveContentVersion(contentId, changes, userId) {
    try {
      const content = await SharedContent.findById(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      // Create a version snapshot before applying changes
      const versionSnapshot = {
        version: content.version,
        content: content.content,
        modifiedBy: content.lastModifiedBy,
        modifiedByName: content.lastModifiedByName,
        modifiedAt: content.updatedAt,
        changes: changes
      };

      // Save version history
      if (!content.versionHistory) {
        content.versionHistory = [];
      }
      content.versionHistory.push(versionSnapshot);

      // Apply changes to content
      if (changes.content) {
        content.content = changes.content;
      }
      if (changes.title) {
        content.title = changes.title;
      }

      // Update metadata
      content.version += 1;
      content.lastModifiedBy = userId;
      content.updatedAt = new Date();

      // Get user info for lastModifiedByName
      const user = await User.findOne({ firebaseUID: userId });
      if (user) {
        content.lastModifiedByName = user.username || user.email;
      }

      await content.save();

      // Notify space members of the update
      if (global.socketManager) {
        global.socketManager.notifySpace(
          content.collaborationSpaceId.toString(),
          'content-version-saved',
          {
            contentId: content._id,
            version: content.version,
            modifiedBy: {
              userId,
              name: content.lastModifiedByName
            },
            timestamp: new Date()
          },
          userId
        );
      }

      return content;
    } catch (error) {
      throw new Error(`Failed to save content version: ${error.message}`);
    }
  }

  async getActiveCollaborators(spaceId) {
    try {
      if (!global.socketManager) {
        return [];
      }

      const socketManager = global.socketManager;
      const activeUsers = [];
      
      if (socketManager.collaborationRooms.has(spaceId)) {
        const socketIds = socketManager.collaborationRooms.get(spaceId);
        for (const socketId of socketIds) {
          const userData = socketManager.socketUsers.get(socketId);
          if (userData) {
            activeUsers.push(userData);
          }
        }
      }

      return activeUsers;
    } catch (error) {
      console.error('Error getting active collaborators:', error);
      return [];
    }
  }

  // ===== ENHANCED PERMISSION SYSTEM =====

  hasPermission(userPermission, requiredPermission) {
    const permissionLevels = {
      'view': 1,
      'edit': 2,
      'admin': 3
    };

    const userLevel = permissionLevels[userPermission] || 0;
    const requiredLevel = permissionLevels[requiredPermission] || 0;

    return userLevel >= requiredLevel;
  }

  // ===== SPACE INVITATION MANAGEMENT =====

  async inviteCollaborator(spaceId, inviteData, inviterId, inviterName) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found');
      }

      // Check if inviter has admin permissions
      const inviterPermission = this.getUserPermission(space, inviterId);
      if (!this.hasPermission(inviterPermission, 'admin')) {
        throw new Error('Insufficient permissions to invite collaborators');
      }

      // Check if user is already a collaborator
      const existingCollaborator = space.collaborators.find(
        c => c.email === inviteData.email && c.status === 'active'
      );
      if (existingCollaborator) {
        throw new Error('User is already a collaborator');
      }

      // Check for existing pending invite
      const existingInvite = await CollaborationInvite.findOne({
        collaborationSpaceId: spaceId,
        email: inviteData.email,
        status: 'pending'
      });
      if (existingInvite) {
        throw new Error('Invite already sent to this user');
      }

      // Create invite token
      const inviteToken = crypto.randomBytes(32).toString('hex');
      
      // Create invite
      const invite = new CollaborationInvite({
        collaborationSpaceId: spaceId,
        spaceName: space.title,
        email: inviteData.email,
        permission: inviteData.permission || 'view',
        invitedBy: inviterId,
        invitedByName: inviterName,
        inviteToken,
        message: inviteData.message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      await invite.save();

      // Update space stats
      space.stats.totalInvites = (space.stats.totalInvites || 0) + 1;
      space.stats.lastActivity = new Date();
      await space.save();

      // Notify space members
      if (global.socketManager) {
        global.socketManager.notifySpace(spaceId, 'member-invited', {
          email: inviteData.email,
          permission: inviteData.permission,
          invitedBy: inviterName,
          timestamp: new Date()
        });
      }

      return invite;
    } catch (error) {
      throw new Error(`Failed to invite collaborator: ${error.message}`);
    }
  }

  async acceptInvite(inviteToken, userId, userName, userEmail) {
    try {
      const invite = await CollaborationInvite.findOne({
        inviteToken,
        status: 'pending'
      });

      if (!invite) {
        throw new Error('Invalid or expired invite');
      }

      if (invite.expiresAt < new Date()) {
        invite.status = 'expired';
        await invite.save();
        throw new Error('Invite has expired');
      }

      const space = await CollaborationSpace.findById(invite.collaborationSpaceId);
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found');
      }

      // Check if user is already a collaborator
      const existingCollaborator = space.collaborators.find(
        c => c.userId === userId && c.status === 'active'
      );
      if (existingCollaborator) {
        throw new Error('You are already a member of this space');
      }

      // Add user as collaborator
      space.collaborators.push({
        userId,
        name: userName || userEmail,
        email: userEmail,
        permission: invite.permission,
        status: 'active',
        invitedBy: invite.invitedBy,
        joinedAt: new Date()
      });

      // Update stats
      space.stats.totalCollaborators = space.collaborators.filter(c => c.status === 'active').length;
      space.stats.lastActivity = new Date();

      await space.save();

      // Mark invite as accepted
      invite.status = 'accepted';
      invite.acceptedAt = new Date();
      invite.acceptedBy = userId;
      await invite.save();

      // Notify space members
      if (global.socketManager) {
        global.socketManager.notifySpace(space._id.toString(), 'member-joined', {
          user: {
            userId,
            userName: userName || userEmail,
            userEmail
          },
          permission: invite.permission,
          timestamp: new Date()
        });
      }

      return space;
    } catch (error) {
      throw new Error(`Failed to accept invite: ${error.message}`);
    }
  }

  // ===== UTILITY METHODS =====

  checkUserAccess(space, userId) {
    // Owner always has access
    if (space.ownerId === userId) {
      return true;
    }

    // Check if user is an active collaborator
    const collaborator = space.collaborators.find(
      c => c.userId === userId && c.status === 'active'
    );
    
    return !!collaborator;
  }

  getUserPermission(space, userId) {
    // Owner has admin permission
    if (space.ownerId === userId) {
      return 'admin';
    }

    // Find collaborator permission
    const collaborator = space.collaborators.find(
      c => c.userId === userId && c.status === 'active'
    );

    return collaborator ? collaborator.permission : null;
  }

  canUserPerformAction(space, userId, action) {
    const userPermission = this.getUserPermission(space, userId);
    if (!userPermission) return false;

    const actionPermissions = {
      'view_content': ['view', 'edit', 'admin'],
      'edit_content': ['edit', 'admin'],
      'create_content': ['edit', 'admin'],
      'manage_space': ['admin'],
      'invite_members': ['admin'],
      'remove_members': ['admin']
    };

    return actionPermissions[action]?.includes(userPermission) || false;
  }
}

module.exports = new CollaborationService();
