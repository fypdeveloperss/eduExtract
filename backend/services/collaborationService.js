const CollaborationSpace = require('../models/CollaborationSpace');
const SharedContent = require('../models/SharedContent');
const ChangeRequest = require('../models/ChangeRequest');
const CollaborationInvite = require('../models/CollaborationInvite');
const User = require('../models/User');
const crypto = require('crypto');

class CollaborationService {
  constructor(socketManager = null) {
    this.socketManager = socketManager;
  }

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
      } else if (role === 'public') {
        // Show public spaces that user is not already a member of
        query = {
          privacy: 'public',
          ownerId: { $ne: userId },
          'collaborators.userId': { $ne: userId }
        };
      } else {
        // All spaces where user is owner, active collaborator, OR public spaces
        query = {
          $or: [
            { ownerId: userId },
            {
              'collaborators.userId': userId,
              'collaborators.status': 'active'
            },
            {
              privacy: 'public',
              ownerId: { $ne: userId },
              'collaborators.userId': { $ne: userId }
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

  async updateMemberPermission(spaceId, targetUserId, newPermission, adminUserId) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      if (!space) {
        throw new Error('Collaboration space not found');
      }

      // Check if admin has permission to modify roles
      const adminPermission = this.getUserPermission(space, adminUserId);
      if (!this.hasPermission(adminPermission, 'admin')) {
        throw new Error('Insufficient permissions to modify member roles');
      }

      // Find the collaborator to update
      const collaboratorIndex = space.collaborators.findIndex(
        c => c.userId === targetUserId && c.status === 'active'
      );

      if (collaboratorIndex === -1) {
        throw new Error('Collaborator not found');
      }

      // Update permission
      space.collaborators[collaboratorIndex].permission = newPermission;
      
      // Update last activity
      space.stats.lastActivity = new Date();
      
      await space.save();

      // Notify the updated user and space members
      if (global.socketManager) {
        global.socketManager.notifyUser(targetUserId, 'permission-updated', {
          spaceId: space._id,
          newPermission,
          updatedBy: adminUserId,
          timestamp: new Date()
        });

        global.socketManager.notifySpace(spaceId, 'member-permission-updated', {
          userId: targetUserId,
          newPermission,
          updatedBy: adminUserId,
          timestamp: new Date()
        });
      }

      return space;
    } catch (error) {
      throw new Error(`Failed to update member permission: ${error.message}`);
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
      console.log('Starting invite process:', { spaceId, inviteData, inviterId, inviterName });
      
      const space = await CollaborationSpace.findById(spaceId);
      
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found');
      }

      console.log('Space found:', space.title);

      // Check if inviter has admin permission
      const inviterPermission = this.getUserPermission(space, inviterId);
      console.log('Inviter permission:', inviterPermission);
      
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

      // Find the user by email to get their userId
      const invitedUser = await User.findOne({ email: inviteData.email.toLowerCase() });
      console.log('Invited user found:', invitedUser ? invitedUser.name : 'Not found');

      // Check for existing pending invite
      const existingInvite = await CollaborationInvite.findOne({
        collaborationSpaceId: spaceId,
        invitedEmail: inviteData.email.toLowerCase(),
        status: 'pending'
      });

      console.log('Existing invite check:', existingInvite);

      if (existingInvite) {
        // Check if the existing invite is expired
        const now = new Date();
        if (existingInvite.expiresAt && existingInvite.expiresAt < now) {
          console.log('Found expired invite, removing it');
          await CollaborationInvite.deleteOne({ _id: existingInvite._id });
        } else {
          throw new Error('Invitation already sent to this email. Please wait for the user to respond or cancel the existing invitation.');
        }
      }

      // Generate unique invite token
      const inviteToken = crypto.randomBytes(32).toString('hex');
      console.log('Generated invite token:', inviteToken);

      // Create invitation
      const invite = new CollaborationInvite({
        collaborationSpaceId: spaceId,
        spaceName: space.title,
        invitedBy: inviterId,
        invitedByName: inviterName,
        invitedEmail: inviteData.email.toLowerCase(),
        invitedUserId: invitedUser ? invitedUser.uid : null, // Link to user if they exist
        permission: inviteData.permission || 'view',
        inviteToken,
        message: inviteData.message || ''
      });

      console.log('Saving invite:', invite);
      await invite.save();
      console.log('Invite saved successfully');

      // Send real-time notification if user is online
      if (invitedUser && this.socketManager) {
        this.socketManager.notifyUser(invitedUser.uid, 'collaboration_invite', {
          type: 'collaboration_invite',
          title: 'New Collaboration Invitation',
          message: `${inviterName} invited you to collaborate on "${space.title}"`,
          spaceId: spaceId,
          inviteId: invite._id,
          inviteToken: invite.inviteToken
        });
      }

      const inviteUrl = `${process.env.FRONTEND_URL}/collaborate/invite/${inviteToken}`;
      console.log('Generated invite URL:', inviteUrl);

      return {
        invite,
        inviteUrl,
        userExists: !!invitedUser,
        message: invitedUser ? 
          'Invitation sent successfully. The user will see it in their dashboard.' : 
          'Invitation sent. The user will need to register with this email to see the invitation.'
      };
    } catch (error) {
      console.error('Error in inviteCollaborator:', error);
      throw new Error(`Failed to invite collaborator: ${error.message}`);
    }
  }

  async joinPublicSpace(spaceId, userId, userName, userEmail) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found');
      }

      if (space.privacy !== 'public') {
        throw new Error('This space is not public and requires an invitation');
      }

      // Check if user is already a member
      const isOwner = space.ownerId === userId;
      const existingCollaborator = space.collaborators.find(
        c => c.userId === userId && c.status === 'active'
      );

      if (isOwner || existingCollaborator) {
        throw new Error('You are already a member of this collaboration space');
      }

      // Get user details
      const user = await User.findOne({ uid: userId });
      if (!user) {
        throw new Error('User not found');
      }

      // Add user as collaborator with default 'view' permission for public spaces
      space.collaborators.push({
        userId,
        name: userName || user.name,
        email: userEmail || user.email,
        permission: 'view', // Default permission for public space joins
        status: 'active',
        joinedAt: new Date()
      });

      space.stats.lastActivity = new Date();
      space.stats.totalCollaborators = space.collaborators.filter(c => c.status === 'active').length;
      
      await space.save();

      // Notify existing members via socket
      if (global.socketManager) {
        global.socketManager.notifySpace(spaceId, 'member-joined', {
          userId,
          userName: userName || user.name,
          joinedAt: new Date()
        });
      }

      return space;
    } catch (error) {
      throw new Error(`Failed to join space: ${error.message}`);
    }
  }

  async getInviteDetails(inviteToken) {
    try {
      const invite = await CollaborationInvite.findOne({
        inviteToken,
        status: 'pending'
      }).select('-_id -__v -collaborationSpaceId');

      if (!invite) {
        throw new Error('Invalid or expired invitation');
      }

      if (invite.expiresAt < new Date()) {
        throw new Error('Invitation has expired');
      }

      return invite;
    } catch (error) {
      throw new Error(`Failed to get invite details: ${error.message}`);
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

      const publicSpaces = await CollaborationSpace.countDocuments({
        isPublic: true,
        isActive: true,
        ownerId: { $ne: userId },
        'collaborators.userId': { $ne: userId }
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
        publicSpaces,
        totalSpaces: ownedSpaces + collaboratingSpaces,
        totalContent,
        pendingInvites
      };
    } catch (error) {
      throw new Error(`Failed to get collaboration stats: ${error.message}`);
    }
  }

  // ===== INVITATION MANAGEMENT =====

  async getUserInvitations(userId) {
    try {
      console.log('Getting invitations for userId:', userId);
      
      // Get user email to find invitations
      const user = await User.findOne({ uid: userId });
      if (!user) {
        throw new Error('User not found');
      }

      console.log('User found:', {
        name: user.name,
        email: user.email,
        uid: user.uid
      });

      // Find invitations by both userId and email (for backwards compatibility)
      const invitations = await CollaborationInvite.find({
        $or: [
          { invitedUserId: userId },
          { invitedEmail: user.email.toLowerCase() }
        ],
        status: 'pending'
      }).populate('collaborationSpaceId').sort({ createdAt: -1 });

      console.log('Found invitations:', invitations.length);
      invitations.forEach(invite => {
        console.log('Invitation details:', {
          id: invite._id,
          spaceName: invite.spaceName,
          invitedEmail: invite.invitedEmail,
          invitedUserId: invite.invitedUserId,
          status: invite.status,
          collaborationSpaceId: invite.collaborationSpaceId ? {
            _id: invite.collaborationSpaceId._id,
            title: invite.collaborationSpaceId.title,
            privacy: invite.collaborationSpaceId.privacy
          } : 'NOT POPULATED'
        });
      });

      console.log('Returning invitations to frontend:', invitations.map(inv => ({
        _id: inv._id,
        spaceName: inv.spaceName,
        invitedByName: inv.invitedByName,
        permission: inv.permission,
        message: inv.message,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        collaborationSpaceId: inv.collaborationSpaceId
      })));

      // Update invitations that don't have invitedUserId set
      const updatePromises = invitations
        .filter(invite => !invite.invitedUserId)
        .map(invite => {
          invite.invitedUserId = userId;
          return invite.save();
        });
      
      if (updatePromises.length > 0) {
        console.log('Updating invitations without userId:', updatePromises.length);
        await Promise.all(updatePromises);
      }

      return invitations;
    } catch (error) {
      console.error('Error in getUserInvitations:', error);
      throw new Error(`Failed to get user invitations: ${error.message}`);
    }
  }

  async acceptInvitation(inviteId, userId) {
    try {
      const user = await User.findOne({ uid: userId });
      if (!user) {
        throw new Error('User not found');
      }

      const invite = await CollaborationInvite.findOne({
        _id: inviteId,
        $or: [
          { invitedUserId: userId },
          { invitedEmail: user.email.toLowerCase() }
        ],
        status: 'pending'
      });

      if (!invite) {
        throw new Error('Invitation not found or already processed');
      }

      // Check if invitation is expired
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        invite.status = 'expired';
        await invite.save();
        throw new Error('Invitation has expired');
      }

      // Get the collaboration space
      const space = await CollaborationSpace.findById(invite.collaborationSpaceId);
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found or inactive');
      }

      // Check if user is already a collaborator
      const existingCollaborator = space.collaborators.find(
        c => c.userId === userId && c.status === 'active'
      );

      if (existingCollaborator) {
        // Update invitation status and return success
        invite.status = 'accepted';
        invite.acceptedAt = new Date();
        await invite.save();
        return { space, message: 'You are already a member of this collaboration space' };
      }

      // Add user as collaborator
      space.collaborators.push({
        userId: userId,
        name: user.name,
        email: user.email,
        permission: invite.permission,
        status: 'active',
        joinedAt: new Date(),
        invitedBy: invite.invitedBy
      });

      space.stats.lastActivity = new Date();
      space.stats.totalCollaborators = space.collaborators.filter(c => c.status === 'active').length;

      await space.save();

      // Update invitation status
      invite.status = 'accepted';
      invite.acceptedAt = new Date();
      await invite.save();

      // Send real-time notification to space owner and other collaborators
      if (this.socketManager) {
        // Notify space owner
        this.socketManager.notifyUser(space.ownerId, 'member_joined', {
          type: 'member_joined',
          title: 'New Member Joined',
          message: `${user.name} joined your collaboration space "${space.title}"`,
          spaceId: space._id,
          userId: userId
        });

        // Notify other collaborators
        space.collaborators.forEach(collaborator => {
          if (collaborator.userId !== userId && collaborator.userId !== space.ownerId) {
            this.socketManager.notifyUser(collaborator.userId, 'member_joined', {
              type: 'member_joined',
              title: 'New Member Joined',
              message: `${user.name} joined the collaboration space "${space.title}"`,
              spaceId: space._id,
              userId: userId
            });
          }
        });
      }

      return { 
        space, 
        message: 'Successfully joined the collaboration space',
        permission: invite.permission
      };
    } catch (error) {
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }
  }

  async declineInvitation(inviteId, userId) {
    try {
      const user = await User.findOne({ uid: userId });
      if (!user) {
        throw new Error('User not found');
      }

      const invite = await CollaborationInvite.findOne({
        _id: inviteId,
        $or: [
          { invitedUserId: userId },
          { invitedEmail: user.email.toLowerCase() }
        ],
        status: 'pending'
      });

      if (!invite) {
        throw new Error('Invitation not found or already processed');
      }

      // Update invitation status
      invite.status = 'declined';
      await invite.save();

      // Send notification to inviter
      if (this.socketManager) {
        this.socketManager.notifyUser(invite.invitedBy, 'invite_declined', {
          type: 'invite_declined',
          title: 'Invitation Declined',
          message: `${user.name} declined your invitation to join "${invite.spaceName}"`,
          spaceId: invite.collaborationSpaceId
        });
      }

      return { message: 'Invitation declined successfully' };
    } catch (error) {
      throw new Error(`Failed to decline invitation: ${error.message}`);
    }
  }

  async getPendingInvites(spaceId, userId) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found');
      }

      // Check if user has permission to view invites
      const userPermission = this.getUserPermission(space, userId);
      if (userPermission !== 'admin' && space.ownerId !== userId) {
        throw new Error('Permission denied: Only owners and admins can view pending invitations');
      }

      const pendingInvites = await CollaborationInvite.find({
        collaborationSpaceId: spaceId,
        status: 'pending'
      }).sort({ createdAt: -1 });

      return pendingInvites;
    } catch (error) {
      throw new Error(`Failed to get pending invites: ${error.message}`);
    }
  }

  async cancelInvite(spaceId, inviteId, userId) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      if (!space || !space.isActive) {
        throw new Error('Collaboration space not found');
      }

      // Check if user has permission to cancel invites
      const userPermission = this.getUserPermission(space, userId);
      if (userPermission !== 'admin' && space.ownerId !== userId) {
        throw new Error('Permission denied: Only owners and admins can cancel invitations');
      }

      const invite = await CollaborationInvite.findOne({
        _id: inviteId,
        collaborationSpaceId: spaceId,
        status: 'pending'
      });

      if (!invite) {
        throw new Error('Invitation not found or already processed');
      }

      invite.status = 'cancelled';
      await invite.save();

      return { message: 'Invitation cancelled successfully' };
    } catch (error) {
      throw new Error(`Failed to cancel invite: ${error.message}`);
    }
  }

  async cleanupExpiredInvites() {
    try {
      const now = new Date();
      const result = await CollaborationInvite.deleteMany({
        status: 'pending',
        expiresAt: { $lt: now }
      });

      console.log(`Cleaned up ${result.deletedCount} expired invitations`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired invites:', error);
      throw new Error(`Failed to cleanup expired invites: ${error.message}`);
    }
  }

  // Method for testing - remove specific invitation
  async removeInvitationByEmail(email, spaceId = null) {
    try {
      const query = {
        invitedEmail: email.toLowerCase(),
        status: 'pending'
      };
      
      if (spaceId) {
        query.collaborationSpaceId = spaceId;
      }

      const result = await CollaborationInvite.deleteMany(query);
      console.log(`Removed ${result.deletedCount} invitations for email: ${email}`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error removing invitation:', error);
      throw new Error(`Failed to remove invitation: ${error.message}`);
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

  async updateMemberPermissionEnhanced(spaceId, targetUserId, newPermission, adminUserId) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      if (!space) {
        throw new Error('Collaboration space not found');
      }

      // Check if admin has permission to modify roles
      const adminPermission = this.getUserPermission(space, adminUserId);
      if (!this.hasPermission(adminPermission, 'admin')) {
        throw new Error('Insufficient permissions to modify member roles');
      }

      // Find the collaborator to update
      const collaboratorIndex = space.collaborators.findIndex(
        c => c.userId === targetUserId && c.status === 'active'
      );

      if (collaboratorIndex === -1) {
        throw new Error('Collaborator not found');
      }

      // Update permission
      space.collaborators[collaboratorIndex].permission = newPermission;
      
      // Update last activity
      space.stats.lastActivity = new Date();
      
      await space.save();

      // Notify the updated user and space members
      if (global.socketManager) {
        global.socketManager.notifyUser(targetUserId, 'permission-updated', {
          spaceId: space._id,
          newPermission,
          updatedBy: adminUserId,
          timestamp: new Date()
        });

        global.socketManager.notifySpace(spaceId, 'member-permission-updated', {
          userId: targetUserId,
          newPermission,
          updatedBy: adminUserId,
          timestamp: new Date()
        });
      }

      return space;
    } catch (error) {
      throw new Error(`Failed to update member permission: ${error.message}`);
    }
  }
}

module.exports = CollaborationService;
