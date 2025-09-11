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

  async updateCollaborationSpace(spaceId, updateData, userId) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      
      if (!space) {
        throw new Error('Collaboration space not found');
      }

      // Check if user is owner or has admin permission
      const userPermission = this.getUserPermission(space, userId);
      if (userPermission !== 'admin' && space.ownerId !== userId) {
        throw new Error('Permission denied: Only owners and admins can update space');
      }

      // Update allowed fields
      const allowedFields = ['title', 'description', 'tags', 'category', 'privacy', 'settings'];
      const filteredUpdate = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredUpdate[field] = updateData[field];
        }
      });

      Object.assign(space, filteredUpdate);
      space.stats.lastActivity = new Date();
      
      await space.save();
      return space;
    } catch (error) {
      throw new Error(`Failed to update collaboration space: ${error.message}`);
    }
  }

  async deleteCollaborationSpace(spaceId, userId) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      
      if (!space) {
        throw new Error('Collaboration space not found');
      }

      // Only owner can delete
      if (space.ownerId !== userId) {
        throw new Error('Permission denied: Only space owner can delete');
      }

      // Soft delete
      space.isActive = false;
      await space.save();

      // Also soft delete related content
      await SharedContent.updateMany(
        { collaborationSpaceId: spaceId },
        { status: 'deleted' }
      );

      return { message: 'Collaboration space deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete collaboration space: ${error.message}`);
    }
  }

  // ===== COLLABORATOR MANAGEMENT =====

  async inviteCollaborator(spaceId, inviteData, inviterId, inviterName) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found');
      }

      // Check if inviter has admin permission
      const inviterPermission = this.getUserPermission(space, inviterId);
      if (inviterPermission !== 'admin' && space.ownerId !== inviterId) {
        throw new Error('Permission denied: Only owners and admins can invite collaborators');
      }

      // Check if user is already a collaborator
      const existingCollaborator = space.collaborators.find(
        c => c.email.toLowerCase() === inviteData.email.toLowerCase() && c.status === 'active'
      );
      
      if (existingCollaborator) {
        throw new Error('User is already a collaborator in this space');
      }

      // Check for existing pending invite
      const existingInvite = await CollaborationInvite.findOne({
        collaborationSpaceId: spaceId,
        invitedEmail: inviteData.email.toLowerCase(),
        status: 'pending'
      });

      if (existingInvite) {
        throw new Error('Invitation already sent to this email');
      }

      // Generate unique invite token
      const inviteToken = crypto.randomBytes(32).toString('hex');

      // Create invitation
      const invite = new CollaborationInvite({
        collaborationSpaceId: spaceId,
        spaceName: space.title,
        invitedBy: inviterId,
        invitedByName: inviterName,
        invitedEmail: inviteData.email.toLowerCase(),
        permission: inviteData.permission || 'view',
        inviteToken,
        message: inviteData.message || ''
      });

      await invite.save();

      // TODO: Send email notification
      // await this.sendInviteEmail(invite);

      return {
        invite,
        inviteUrl: `${process.env.FRONTEND_URL}/collaborate/invite/${inviteToken}`
      };
    } catch (error) {
      throw new Error(`Failed to invite collaborator: ${error.message}`);
    }
  }

  async acceptInvite(inviteToken, userId, userName) {
    try {
      const invite = await CollaborationInvite.findOne({
        inviteToken,
        status: 'pending'
      });

      if (!invite) {
        throw new Error('Invalid or expired invitation');
      }

      if (invite.expiresAt < new Date()) {
        invite.status = 'expired';
        await invite.save();
        throw new Error('Invitation has expired');
      }

      const space = await CollaborationSpace.findById(invite.collaborationSpaceId);
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found or inactive');
      }

      // Check if user is already a collaborator
      const existingCollaborator = space.collaborators.find(
        c => c.userId === userId && c.status === 'active'
      );

      if (existingCollaborator) {
        throw new Error('You are already a member of this collaboration space');
      }

      // Get user details
      const user = await User.findOne({ uid: userId });
      if (!user) {
        throw new Error('User not found');
      }

      // Add user as collaborator
      space.collaborators.push({
        userId,
        name: userName || user.name,
        email: user.email,
        permission: invite.permission,
        status: 'active',
        invitedBy: invite.invitedBy,
        joinedAt: new Date()
      });

      space.stats.lastActivity = new Date();
      await space.save();

      // Update invite status
      invite.status = 'accepted';
      invite.invitedUserId = userId;
      invite.acceptedAt = new Date();
      await invite.save();

      return space;
    } catch (error) {
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }
  }

  async updateCollaboratorPermission(spaceId, collaboratorUserId, newPermission, updaterId) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found');
      }

      // Check if updater has admin permission
      const updaterPermission = this.getUserPermission(space, updaterId);
      if (updaterPermission !== 'admin' && space.ownerId !== updaterId) {
        throw new Error('Permission denied: Only owners and admins can update permissions');
      }

      // Cannot change owner's permission
      if (collaboratorUserId === space.ownerId) {
        throw new Error('Cannot change owner permissions');
      }

      // Find and update collaborator
      const collaborator = space.collaborators.find(
        c => c.userId === collaboratorUserId && c.status === 'active'
      );

      if (!collaborator) {
        throw new Error('Collaborator not found');
      }

      collaborator.permission = newPermission;
      space.stats.lastActivity = new Date();
      await space.save();

      return space;
    } catch (error) {
      throw new Error(`Failed to update collaborator permission: ${error.message}`);
    }
  }

  async removeCollaborator(spaceId, collaboratorUserId, removerId) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found');
      }

      // Check permissions
      const removerPermission = this.getUserPermission(space, removerId);
      if (removerPermission !== 'admin' && space.ownerId !== removerId && removerId !== collaboratorUserId) {
        throw new Error('Permission denied: Only owners, admins, or the collaborator themselves can remove access');
      }

      // Cannot remove owner
      if (collaboratorUserId === space.ownerId) {
        throw new Error('Cannot remove space owner');
      }

      // Find and update collaborator status
      const collaborator = space.collaborators.find(
        c => c.userId === collaboratorUserId && c.status === 'active'
      );

      if (!collaborator) {
        throw new Error('Collaborator not found');
      }

      collaborator.status = 'inactive';
      space.stats.lastActivity = new Date();
      await space.save();

      return space;
    } catch (error) {
      throw new Error(`Failed to remove collaborator: ${error.message}`);
    }
  }

  // ===== PERMISSION HELPERS =====

  checkUserAccess(space, userId) {
    // Owner always has access
    if (space.ownerId === userId) {
      return true;
    }

    // Check if user is an active collaborator
    const collaborator = space.collaborators.find(
      c => c.userId === userId && c.status === 'active'
    );

    if (collaborator) {
      return true;
    }

    // Check if space is public
    if (space.privacy === 'public') {
      return true;
    }

    return false;
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
    const permission = this.getUserPermission(space, userId);
    
    if (!permission) {
      return false;
    }

    const permissions = {
      view: ['view_content', 'view_space'],
      edit: ['view_content', 'view_space', 'create_content', 'edit_content', 'comment'],
      admin: ['view_content', 'view_space', 'create_content', 'edit_content', 'comment', 
              'invite_users', 'manage_permissions', 'delete_content', 'approve_changes']
    };

    return permissions[permission]?.includes(action) || false;
  }

  // ===== SEARCH AND DISCOVERY =====

  async searchPublicSpaces(query, page = 1, limit = 20, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      
      let searchQuery = {
        privacy: 'public',
        isActive: true
      };

      // Add text search
      if (query) {
        searchQuery.$or = [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ];
      }

      // Add filters
      if (filters.category) {
        searchQuery.category = filters.category;
      }

      if (filters.tags && filters.tags.length > 0) {
        searchQuery.tags = { $in: filters.tags };
      }

      const spaces = await CollaborationSpace.find(searchQuery)
        .sort({ 'stats.totalViews': -1, 'stats.lastActivity': -1 })
        .skip(skip)
        .limit(limit)
        .select('-collaborators.email') // Don't expose collaborator emails in public search
        .lean();

      const total = await CollaborationSpace.countDocuments(searchQuery);

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
      throw new Error(`Failed to search collaboration spaces: ${error.message}`);
    }
  }

  // ===== STATS AND ANALYTICS =====

  async getCollaborationStats(userId) {
    try {
      const ownedSpaces = await CollaborationSpace.countDocuments({
        ownerId: userId,
        isActive: true
      });

      const collaboratingSpaces = await CollaborationSpace.countDocuments({
        'collaborators.userId': userId,
        'collaborators.status': 'active',
        ownerId: { $ne: userId },
        isActive: true
      });

      const totalContent = await SharedContent.countDocuments({
        createdBy: userId
      });

      const pendingInvites = await CollaborationInvite.countDocuments({
        invitedUserId: userId,
        status: 'pending'
      });

      return {
        ownedSpaces,
        collaboratingSpaces,
        totalSpaces: ownedSpaces + collaboratingSpaces,
        totalContent,
        pendingInvites
      };
    } catch (error) {
      throw new Error(`Failed to get collaboration stats: ${error.message}`);
    }
  }
}

module.exports = new CollaborationService();
