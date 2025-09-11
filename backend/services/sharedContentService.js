const SharedContent = require('../models/SharedContent');
const ChangeRequest = require('../models/ChangeRequest');
const CollaborationSpace = require('../models/CollaborationSpace');

class SharedContentService {
  constructor() {
    // Will use global collaborationService once it's available
  }

  getCollaborationService() {
    return global.collaborationService;
  }

  // ===== CONTENT MANAGEMENT =====

  async createSharedContent(contentData, collaborationSpaceId, userId, userName) {
    try {
      const collaborationService = this.getCollaborationService();
      if (!collaborationService) {
        throw new Error('Collaboration service not available');
      }

      // Verify user has access to the collaboration space
      const space = await collaborationService.getCollaborationSpaceById(collaborationSpaceId, userId);
      
      // Check if user can create content
      if (!collaborationService.canUserPerformAction(space, userId, 'create_content')) {
        throw new Error('Permission denied: You cannot create content in this space');
      }

      const content = new SharedContent({
        ...contentData,
        collaborationSpaceId,
        createdBy: userId,
        createdByName: userName,
        lastModifiedBy: userId,
        lastModifiedByName: userName,
        permissions: {
          canView: [userId],
          canEdit: [userId],
          canApprove: space.ownerId === userId ? [userId] : [space.ownerId, userId]
        }
      });

      await content.save();

      // Update space stats
      await CollaborationSpace.findByIdAndUpdate(
        collaborationSpaceId,
        {
          $inc: { 'stats.totalContent': 1 },
          $set: { 'stats.lastActivity': new Date() }
        }
      );

      return content;
    } catch (error) {
      throw new Error(`Failed to create shared content: ${error.message}`);
    }
  }

  async getSharedContent(collaborationSpaceId, userId, page = 1, limit = 20, filters = {}) {
    try {
      const collaborationService = this.getCollaborationService();
      if (!collaborationService) {
        throw new Error('Collaboration service not available');
      }

      // Verify user has access to the collaboration space
      await collaborationService.getCollaborationSpaceById(collaborationSpaceId, userId);

      const skip = (page - 1) * limit;
      let query = { collaborationSpaceId };

      // Add filters
      if (filters.contentType) {
        query.contentType = filters.contentType;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.createdBy) {
        query.createdBy = filters.createdBy;
      }

      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } }
        ];
      }

      const content = await SharedContent.find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await SharedContent.countDocuments(query);

      return {
        content,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get shared content: ${error.message}`);
    }
  }

  async getSharedContentById(contentId, userId) {
    try {
      const content = await SharedContent.findById(contentId);
      
      if (!content) {
        throw new Error('Content not found');
      }

      // Verify user has access to the collaboration space
      const space = await CollaborationService.getCollaborationSpaceById(content.collaborationSpaceId, userId);

      // Check if user can view this content
      if (!this.canUserAccessContent(content, userId, space)) {
        throw new Error('Permission denied: You cannot access this content');
      }

      // Increment view count
      await SharedContent.findByIdAndUpdate(contentId, {
        $inc: { 'stats.views': 1 }
      });

      return content;
    } catch (error) {
      throw new Error(`Failed to get shared content: ${error.message}`);
    }
  }

  async updateSharedContent(contentId, updateData, userId, userName) {
    try {
      const content = await SharedContent.findById(contentId);
      
      if (!content) {
        throw new Error('Content not found');
      }

      // Verify user has access to the collaboration space
      const space = await CollaborationService.getCollaborationSpaceById(content.collaborationSpaceId, userId);

      // Check permissions based on content status
      if (content.status === 'published') {
        // Published content requires change request
        throw new Error('Published content cannot be edited directly. Please create a change request.');
      }

      // Check if user can edit this content
      const canEdit = this.canUserEditContent(content, userId, space);
      if (!canEdit) {
        throw new Error('Permission denied: You cannot edit this content');
      }

      // Update allowed fields
      const allowedFields = ['title', 'content', 'tags', 'attachments'];
      const filteredUpdate = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredUpdate[field] = updateData[field];
        }
      });

      // Update metadata
      filteredUpdate.lastModifiedBy = userId;
      filteredUpdate.lastModifiedByName = userName;
      filteredUpdate.version = content.version + 1;

      Object.assign(content, filteredUpdate);
      await content.save();

      // Update space last activity
      await CollaborationSpace.findByIdAndUpdate(
        content.collaborationSpaceId,
        { $set: { 'stats.lastActivity': new Date() } }
      );

      return content;
    } catch (error) {
      throw new Error(`Failed to update shared content: ${error.message}`);
    }
  }

  async deleteSharedContent(contentId, userId) {
    try {
      const content = await SharedContent.findById(contentId);
      
      if (!content) {
        throw new Error('Content not found');
      }

      // Verify user has access to the collaboration space
      const space = await CollaborationService.getCollaborationSpaceById(content.collaborationSpaceId, userId);

      // Check if user can delete this content
      const canDelete = content.createdBy === userId || 
                       CollaborationService.canUserPerformAction(space, userId, 'delete_content');
                       
      if (!canDelete) {
        throw new Error('Permission denied: You cannot delete this content');
      }

      await SharedContent.findByIdAndDelete(contentId);

      // Update space stats
      await CollaborationSpace.findByIdAndUpdate(
        content.collaborationSpaceId,
        {
          $inc: { 'stats.totalContent': -1 },
          $set: { 'stats.lastActivity': new Date() }
        }
      );

      return { message: 'Content deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete shared content: ${error.message}`);
    }
  }

  async updateContentStatus(contentId, newStatus, userId) {
    try {
      const content = await SharedContent.findById(contentId);
      
      if (!content) {
        throw new Error('Content not found');
      }

      // Verify user has access to the collaboration space
      const space = await CollaborationService.getCollaborationSpaceById(content.collaborationSpaceId, userId);

      // Check if user can approve content
      if (newStatus === 'approved' || newStatus === 'published') {
        if (!CollaborationService.canUserPerformAction(space, userId, 'approve_changes')) {
          throw new Error('Permission denied: You cannot approve content');
        }
      }

      content.status = newStatus;
      await content.save();

      return content;
    } catch (error) {
      throw new Error(`Failed to update content status: ${error.message}`);
    }
  }

  // ===== PERMISSION HELPERS =====

  canUserAccessContent(content, userId, space) {
    // Owner and admins can access all content
    if (space.ownerId === userId || CollaborationService.getUserPermission(space, userId) === 'admin') {
      return true;
    }

    // Content creator can access their own content
    if (content.createdBy === userId) {
      return true;
    }

    // Check specific content permissions
    if (content.permissions.canView.includes(userId)) {
      return true;
    }

    // Check if user has general access to the space
    return CollaborationService.canUserPerformAction(space, userId, 'view_content');
  }

  canUserEditContent(content, userId, space) {
    // Owner and admins can edit all content
    if (space.ownerId === userId || CollaborationService.getUserPermission(space, userId) === 'admin') {
      return true;
    }

    // Content creator can edit their own content
    if (content.createdBy === userId) {
      return true;
    }

    // Check specific edit permissions
    if (content.permissions.canEdit.includes(userId)) {
      return true;
    }

    // Check if user has general edit access to the space
    return CollaborationService.canUserPerformAction(space, userId, 'edit_content');
  }

  // ===== CONTENT VERSIONING =====

  async getContentVersions(contentId, userId) {
    try {
      const content = await SharedContent.findById(contentId);
      
      if (!content) {
        throw new Error('Content not found');
      }

      // Verify user has access
      const space = await CollaborationService.getCollaborationSpaceById(content.collaborationSpaceId, userId);
      
      if (!this.canUserAccessContent(content, userId, space)) {
        throw new Error('Permission denied: You cannot access this content');
      }

      // For now, return current version info
      // In a full implementation, you'd store version history
      return {
        currentVersion: content.version,
        versions: [{
          version: content.version,
          createdAt: content.updatedAt,
          createdBy: content.lastModifiedBy,
          createdByName: content.lastModifiedByName
        }]
      };
    } catch (error) {
      throw new Error(`Failed to get content versions: ${error.message}`);
    }
  }

  // ===== CONTENT SEARCH =====

  async searchContent(query, userId, filters = {}) {
    try {
      // Get user's accessible collaboration spaces
      const userSpaces = await CollaborationService.getUserCollaborationSpaces(userId, 1, 1000);
      const spaceIds = userSpaces.spaces.map(space => space._id);

      if (spaceIds.length === 0) {
        return { content: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0 } };
      }

      let searchQuery = {
        collaborationSpaceId: { $in: spaceIds }
      };

      // Add text search
      if (query) {
        searchQuery.$or = [
          { title: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ];
      }

      // Add filters
      if (filters.contentType) {
        searchQuery.contentType = filters.contentType;
      }

      if (filters.status) {
        searchQuery.status = filters.status;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const content = await SharedContent.find(searchQuery)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('collaborationSpaceId', 'title')
        .lean();

      const total = await SharedContent.countDocuments(searchQuery);

      return {
        content,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to search content: ${error.message}`);
    }
  }
}

module.exports = new SharedContentService();
