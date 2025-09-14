const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const CollaborationService = require('../services/collaborationService');
const SharedContentService = require('../services/sharedContentService');
const ChangeRequestService = require('../services/changeRequestService');

// Initialize collaboration service (will be updated with socket manager in server.js)
let collaborationService = new CollaborationService();

// Function to set socket manager
function setSocketManager(socketManager) {
  collaborationService = new CollaborationService(socketManager);
}

// ===== COLLABORATION SPACE ROUTES =====

// Create new collaboration space
router.post('/spaces', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName, email: userEmail } = req.user;
    const spaceData = req.body;

    // Ensure we have required user data
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    const space = await collaborationService.createCollaborationSpace(spaceData, userId, userName, userEmail);
    
    res.status(201).json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error creating collaboration space:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's collaboration spaces
router.get('/spaces', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { page = 1, limit = 20, role = 'all' } = req.query;

    const result = await collaborationService.getUserCollaborationSpaces(
      userId, 
      parseInt(page), 
      parseInt(limit), 
      role
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting collaboration spaces:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific collaboration space
router.get('/spaces/:spaceId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;

    const space = await collaborationService.getCollaborationSpaceById(spaceId, userId);
    
    // Also trigger a background stats refresh for the space header
    // This ensures the most up-to-date stats are displayed
    setImmediate(async () => {
      try {
        await collaborationService.updateSpaceStats(space);
      } catch (error) {
        console.error('Background stats update failed:', error);
      }
    });
    
    res.json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error getting collaboration space:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      error: error.message
    });
  }
});

// Update collaboration space
router.put('/spaces/:spaceId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;
    const updateData = req.body;

    const space = await collaborationService.updateCollaborationSpace(spaceId, updateData, userId);
    
    res.json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error updating collaboration space:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete collaboration space
router.delete('/spaces/:spaceId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;

    const result = await collaborationService.deleteCollaborationSpace(spaceId, userId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting collaboration space:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// ===== COLLABORATOR MANAGEMENT =====

// Invite collaborator
router.post('/spaces/:spaceId/invite', verifyToken, async (req, res) => {
  try {
    console.log('Invite request received:', {
      userId: req.user.uid,
      userName: req.user.name,
      spaceId: req.params.spaceId,
      inviteData: req.body
    });
    
    const { uid: userId, name: userName } = req.user;
    const { spaceId } = req.params;
    const inviteData = req.body;

    const result = await collaborationService.inviteCollaborator(spaceId, inviteData, userId, userName);
    
    console.log('Invite sent successfully:', result);
    
    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error inviting collaborator:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's invitations for dashboard
router.get('/invitations', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;

    const invitations = await collaborationService.getUserInvitations(userId);
    
    res.json({
      success: true,
      invitations
    });
  } catch (error) {
    console.error('Error getting user invitations:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// FOR TESTING ONLY - Remove invitation by email
router.delete('/invitations/test/remove/:email', verifyToken, async (req, res) => {
  try {
    const { email } = req.params;
    const { spaceId } = req.query;

    const removedCount = await collaborationService.removeInvitationByEmail(email, spaceId);
    
    res.json({
      success: true,
      message: `Removed ${removedCount} invitations for ${email}`,
      removedCount
    });
  } catch (error) {
    console.error('Error removing invitation:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Accept an invitation from dashboard
router.post('/invitations/:inviteId/accept', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { inviteId } = req.params;

    const result = await collaborationService.acceptInvitation(inviteId, userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Decline an invitation from dashboard
router.post('/invitations/:inviteId/decline', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { inviteId } = req.params;

    const result = await collaborationService.declineInvitation(inviteId, userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get pending invites for a space
router.get('/spaces/:spaceId/invites', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;

    const pendingInvites = await collaborationService.getPendingInvites(spaceId, userId);
    
    res.json({
      success: true,
      invites: pendingInvites
    });
  } catch (error) {
    console.error('Error getting pending invites:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel an invitation
router.delete('/spaces/:spaceId/invites/:inviteId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId, inviteId } = req.params;

    const result = await collaborationService.cancelInvite(spaceId, inviteId, userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error cancelling invite:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Join public collaboration space
router.post('/spaces/:spaceId/join', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName, email: userEmail } = req.user;
    const { spaceId } = req.params;

    const space = await collaborationService.joinPublicSpace(spaceId, userId, userName, userEmail);
    
    res.json({
      success: true,
      space,
      message: 'Successfully joined the collaboration space'
    });
  } catch (error) {
    console.error('Error joining space:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get invitation details
router.get('/invites/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await collaborationService.getInviteDetails(token);
    
    res.json({
      success: true,
      invite
    });
  } catch (error) {
    console.error('Error getting invite details:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Accept collaboration invite
router.post('/invites/:token/accept', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { token } = req.params;
    const { responseMessage } = req.body;

    const space = await collaborationService.acceptInvite(token, userId, userName);
    
    res.json({
      success: true,
      space,
      message: 'Invitation accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update collaborator permission
router.put('/spaces/:spaceId/collaborators/:userId', verifyToken, async (req, res) => {
  try {
    const { uid: updaterId } = req.user;
    const { spaceId, userId: collaboratorUserId } = req.params;
    const { permission } = req.body;

    if (!permission || !['view', 'edit', 'admin'].includes(permission)) {
      return res.status(400).json({
        success: false,
        error: 'Valid permission is required (view, edit, or admin)'
      });
    }

    const space = await collaborationService.updateCollaboratorPermission(
      spaceId, 
      collaboratorUserId, 
      permission, 
      updaterId
    );
    
    res.json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error updating collaborator permission:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Remove collaborator
router.delete('/spaces/:spaceId/collaborators/:userId', verifyToken, async (req, res) => {
  try {
    const { uid: removerId } = req.user;
    const { spaceId, userId: collaboratorUserId } = req.params;

    const space = await collaborationService.removeCollaborator(spaceId, collaboratorUserId, removerId);
    
    res.json({
      success: true,
      space,
      message: 'Collaborator removed successfully'
    });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// ===== SHARED CONTENT ROUTES =====

// Create shared content
router.post('/spaces/:spaceId/content', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { spaceId } = req.params;
    const contentData = req.body;

    const content = await SharedContentService.createSharedContent(
      contentData, 
      spaceId, 
      userId, 
      userName
    );
    
    res.status(201).json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error creating shared content:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Add existing user content to collaboration space
router.post('/spaces/:spaceId/content/add-existing', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { spaceId } = req.params;
    const { contentIds } = req.body;

    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content IDs array is required'
      });
    }

    // First, get the user's content by IDs to ensure they own it
    const GeneratedContent = require('../models/GeneratedContent');
    const userContent = await GeneratedContent.find({
      _id: { $in: contentIds },
      userId: userId
    });

    if (userContent.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid content found for the provided IDs'
      });
    }

    if (userContent.length !== contentIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some content IDs are invalid or you do not have access to them'
      });
    }

    const result = await SharedContentService.addExistingContentToSpace(
      userContent, 
      spaceId, 
      userId, 
      userName
    );
    
    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error adding existing content to space:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get shared content for a space
router.get('/spaces/:spaceId/content', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;
    const { page = 1, limit = 20, contentType, status, createdBy, search } = req.query;

    const filters = { contentType, status, createdBy, search };
    const result = await SharedContentService.getSharedContent(
      spaceId, 
      userId, 
      parseInt(page), 
      parseInt(limit), 
      filters
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting shared content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific shared content
router.get('/content/:contentId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { contentId } = req.params;

    const content = await SharedContentService.getSharedContentById(contentId, userId);
    
    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error getting shared content:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      error: error.message
    });
  }
});

// Update shared content
router.put('/content/:contentId', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { contentId } = req.params;
    const updateData = req.body;

    const content = await SharedContentService.updateSharedContent(
      contentId, 
      updateData, 
      userId, 
      userName
    );
    
    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error updating shared content:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete shared content
router.delete('/content/:contentId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { contentId } = req.params;

    const result = await SharedContentService.deleteSharedContent(contentId, userId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting shared content:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Update content status
router.patch('/content/:contentId/status', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { contentId } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'review', 'approved', 'published'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (draft, review, approved, or published)'
      });
    }

    const content = await SharedContentService.updateContentStatus(contentId, status, userId);
    
    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error updating content status:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// ===== CHANGE REQUEST ROUTES =====

// Create change request
router.post('/content/:contentId/change-requests', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { contentId } = req.params;
    const requestData = {
      ...req.body,
      sharedContentId: contentId
    };

    const changeRequest = await ChangeRequestService.createChangeRequest(
      requestData, 
      userId, 
      userName
    );
    
    res.status(201).json({
      success: true,
      changeRequest
    });
  } catch (error) {
    console.error('Error creating change request:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get change requests for a space
router.get('/spaces/:spaceId/change-requests', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;
    const { page = 1, limit = 20, status, requestType, priority, requestedBy } = req.query;

    const filters = { status, requestType, priority, requestedBy };
    const result = await ChangeRequestService.getChangeRequests(
      spaceId, 
      userId, 
      parseInt(page), 
      parseInt(limit), 
      filters
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting change requests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific change request
router.get('/change-requests/:requestId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { requestId } = req.params;

    const request = await ChangeRequestService.getChangeRequestById(requestId, userId);
    
    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Error getting change request:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      error: error.message
    });
  }
});

// Update change request
router.put('/change-requests/:requestId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { requestId } = req.params;
    const updateData = req.body;

    const request = await ChangeRequestService.updateChangeRequest(requestId, updateData, userId);
    
    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Error updating change request:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Review change request
router.post('/change-requests/:requestId/review', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { requestId } = req.params;
    const reviewData = req.body;

    const request = await ChangeRequestService.reviewChangeRequest(
      requestId, 
      reviewData, 
      userId, 
      userName
    );
    
    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Error reviewing change request:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Add comment to change request
router.post('/change-requests/:requestId/comments', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { requestId } = req.params;
    const commentData = req.body;

    const request = await ChangeRequestService.addCommentToChangeRequest(
      requestId, 
      commentData, 
      userId, 
      userName
    );
    
    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete change request
router.delete('/change-requests/:requestId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { requestId } = req.params;

    const result = await ChangeRequestService.deleteChangeRequest(requestId, userId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting change request:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// ===== SEARCH AND DISCOVERY =====

// Search public collaboration spaces
router.get('/discover', async (req, res) => {
  try {
    const { q: query, page = 1, limit = 20, category, tags } = req.query;
    
    const filters = { category };
    if (tags) {
      filters.tags = tags.split(',');
    }

    const result = await collaborationService.searchPublicSpaces(
      query, 
      parseInt(page), 
      parseInt(limit), 
      filters
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error searching collaboration spaces:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search user's content across all spaces
router.get('/content/search', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { q: query, page = 1, limit = 20, contentType, status } = req.query;
    
    const filters = { page: parseInt(page), limit: parseInt(limit), contentType, status };
    const result = await SharedContentService.searchContent(query, userId, filters);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error searching content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== USER DASHBOARD ROUTES =====

// Get user collaboration stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;

    const stats = await collaborationService.getCollaborationStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting collaboration stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's change requests
router.get('/my-change-requests', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { page = 1, limit = 20, status, collaborationSpaceId } = req.query;

    const filters = { status, collaborationSpaceId };
    const result = await ChangeRequestService.getUserChangeRequests(
      userId, 
      parseInt(page), 
      parseInt(limit), 
      filters
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting user change requests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get pending review requests for user
router.get('/pending-reviews', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    const result = await ChangeRequestService.getPendingReviewRequests(
      userId, 
      parseInt(page), 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting pending review requests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== JOIN REQUEST ROUTES =====

// Create a join request
router.post('/join-requests', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName, email: userEmail } = req.user;
    const { spaceId, message, requestedPermission } = req.body;

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        error: 'Space ID is required'
      });
    }

    const joinRequest = await collaborationService.createJoinRequest({
      requesterId: userId,
      requesterName: userName,
      requesterEmail: userEmail,
      spaceId,
      message,
      requestedPermission
    });

    res.status(201).json({
      success: true,
      joinRequest
    });
  } catch (error) {
    console.error('Error creating join request:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get join requests for a space (space owner only)
router.get('/spaces/:spaceId/join-requests', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;
    const { status = 'pending' } = req.query;

    const joinRequests = await collaborationService.getJoinRequestsForSpace(spaceId, userId, status);

    res.json({
      success: true,
      joinRequests
    });
  } catch (error) {
    console.error('Error fetching join requests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's own join requests
router.get('/my-join-requests', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { status } = req.query;

    const joinRequests = await collaborationService.getUserJoinRequests(userId, status);

    res.json({
      success: true,
      joinRequests
    });
  } catch (error) {
    console.error('Error fetching user join requests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Approve a join request
router.put('/join-requests/:requestId/approve', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { requestId } = req.params;
    const reviewMessage = req.body?.reviewMessage || '';

    const result = await collaborationService.approveJoinRequest(requestId, userId, reviewMessage);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error approving join request:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Reject a join request
router.put('/join-requests/:requestId/reject', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { requestId } = req.params;
    const reviewMessage = req.body?.reviewMessage || '';

    const result = await collaborationService.rejectJoinRequest(requestId, userId, reviewMessage);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error rejecting join request:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Check if user has pending join request for a space
router.get('/spaces/:spaceId/join-request-status', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;

    const status = await collaborationService.getJoinRequestStatus(spaceId, userId);

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error checking join request status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
module.exports.setSocketManager = setSocketManager;
