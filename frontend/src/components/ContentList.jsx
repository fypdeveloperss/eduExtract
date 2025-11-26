import React, { useState, useEffect } from 'react';
import { useCollaboration } from '../context/CollaborationContext';
import ContentSelectionModal from './ContentSelectionModal';
import { authenticatedFetch } from '../utils/auth';
import { useCustomAlerts } from '../hooks/useCustomAlerts';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import api from '../utils/axios';
import './ContentList.css';

const ContentList = ({ spaceId, space, currentUser, userPermission, canUserPerformAction }) => {
  const { success, error, warning } = useCustomAlerts();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContentModal, setShowContentModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    contentType: '',
    status: '',
    search: ''
  });

  const { 
    contentLocks,
    typingUsers,
    cursorPositions,
    lockContent,
    unlockContent,
    addNotification 
  } = useCollaboration();

  useEffect(() => {
    fetchContent();
  }, [spaceId, filters]);

  // Listen for real-time content updates
  useEffect(() => {
    const handleContentUpdate = (updatedContent) => {
      setContent(prevContent => 
        prevContent.map(item => 
          item._id === updatedContent._id ? updatedContent : item
        )
      );
      
      addNotification({
        type: 'info',
        message: `Content "${updatedContent.title}" was updated by ${updatedContent.lastModifiedBy?.name || 'someone'}`,
      });
    };

    const handleContentCreated = (newContent) => {
      setContent(prevContent => [newContent, ...prevContent]);
      
      addNotification({
        type: 'success',
        message: `New content "${newContent.title}" was created by ${newContent.createdBy?.name || 'someone'}`,
      });
    };

    // TODO: Add event listeners when Socket.IO events are implemented
    // socket.on('contentUpdated', handleContentUpdate);
    // socket.on('contentCreated', handleContentCreated);

    return () => {
      // TODO: Remove event listeners
      // socket.off('contentUpdated', handleContentUpdate);
      // socket.off('contentCreated', handleContentCreated);
    };
  }, [addNotification]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/collaborate/spaces/${spaceId}/content`, {
        params: filters
      });

      if (response.data.success) {
        setContent(response.data.content);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContent = async (selectedContent) => {
    try {
      const contentIds = selectedContent.map(content => content._id);
      
      const response = await authenticatedFetch(`/api/collaborate/spaces/${spaceId}/content/add-existing`, {
        method: 'POST',
        body: JSON.stringify({ contentIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add content');
      }

      // Show success message
      if (result.summary) {
        const { successful, failed, total } = result.summary;
        if (failed > 0) {
          warning(`Added ${successful} out of ${total} content items. ${failed} items failed to add.`, 'Partial Success');
        } else {
          success(`Successfully added ${successful} content items to the space!`, 'Content Added');
        }
      }

      // Refresh content list
      fetchContent();

    } catch (err) {
      console.error('Error adding content:', err);
      error(`Failed to add content: ${err.message}`, 'Add Content Failed');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': '#9e9e9e',
      'review': '#ff9800',
      'approved': '#4caf50',
      'published': '#2196f3'
    };
    return colors[status] || colors.draft;
  };

  // Check if user can delete specific content
  // Space owner/admin can delete any content, editors can only delete their own
  const canDeleteContent = (contentItem) => {
    if (!currentUser || !space) return false;
    
    // Space owner can delete any content
    if (space.ownerId === currentUser.uid) return true;
    
    // Admin permission can delete any content
    if (canUserPerformAction('delete_content')) return true;
    
    // Editors can delete their own content
    if (contentItem.createdBy === currentUser.uid) return true;
    
    return false;
  };

  const handleDeleteClick = (contentItem) => {
    setContentToDelete(contentItem);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contentToDelete) return;
    
    try {
      setDeleting(true);
      
      const response = await api.delete(`/api/collaborate/content/${contentToDelete._id}`);
      
      if (response.data.success) {
        // Remove from local state
        setContent(prevContent => prevContent.filter(item => item._id !== contentToDelete._id));
        success('Content deleted successfully!', 'Deleted');
        
        addNotification({
          type: 'success',
          message: `Content "${contentToDelete.title}" has been deleted`,
        });
      }
    } catch (err) {
      console.error('Error deleting content:', err);
      error(err.response?.data?.error || 'Failed to delete content', 'Delete Failed');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setContentToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setContentToDelete(null);
  };

  const handleEditContent = async (contentId) => {
    try {
      // Check if content is already locked
      const isLocked = contentLocks[contentId];
      if (isLocked && isLocked.userId !== currentUser.uid) {
        addNotification({
          type: 'warning',
          message: `Content is being edited by ${isLocked.userName}`,
        });
        return;
      }

      // Lock the content for editing
      await lockContent(contentId, {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email
      });

      // Navigate to edit view or open edit modal
      // This would typically open an editing interface
      console.log(`Editing content ${contentId}`);
      
    } catch (error) {
      console.error('Error starting edit:', error);
      addNotification({
        type: 'error',
        message: 'Failed to start editing content',
      });
    }
  };

  const getContentLockStatus = (contentId) => {
    const lock = contentLocks[contentId];
    if (!lock) return null;
    
    const isOwnLock = lock.userId === currentUser.uid;
    return {
      isLocked: true,
      isOwn: isOwnLock,
      userName: lock.userName,
      lockedAt: lock.lockedAt
    };
  };

  const getTypingIndicator = (contentId) => {
    const typingInContent = typingUsers[contentId];
    if (!typingInContent || typingInContent.length === 0) return null;
    
    const otherTypers = typingInContent.filter(user => user.userId !== currentUser.uid);
    if (otherTypers.length === 0) return null;
    
    if (otherTypers.length === 1) {
      return `${otherTypers[0].userName} is typing...`;
    } else if (otherTypers.length === 2) {
      return `${otherTypers[0].userName} and ${otherTypers[1].userName} are typing...`;
    } else {
      return `${otherTypers[0].userName} and ${otherTypers.length - 1} others are typing...`;
    }
  };

  if (loading) {
    return <div className="content-list-loading">Loading content...</div>;
  }

  return (
    <div className="content-list">
      <div className="content-header">
        <h2>Shared Content</h2>
        {canUserPerformAction('create_content') && (
          <button 
            className="add-content-btn"
            onClick={() => setShowContentModal(true)}
          >
            + Add Content
          </button>
        )}
      </div>

      <div className="content-filters">
        <input
          type="text"
          placeholder="Search content..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="search-input"
        />
        
        <select
          value={filters.contentType}
          onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value }))}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="document">Documents</option>
          <option value="slide">Slides</option>
          <option value="quiz">Quizzes</option>
          <option value="flashcard">Flashcards</option>
          <option value="summary">Summaries</option>
          <option value="note">Notes</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
        </select>
      </div>

      {content.length > 0 ? (
        <div className="content-grid">
          {content.map(item => {
            const lockStatus = getContentLockStatus(item._id);
            const typingIndicator = getTypingIndicator(item._id);
            
            return (
              <div key={item._id} className={`content-card ${lockStatus?.isLocked ? 'locked' : ''}`}>
                <div className="content-header">
                  <h3 className="content-title">{item.title}</h3>
                  <div className="content-badges">
                    <span className="type-badge">{item.contentType}</span>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(item.status) }}
                    >
                      {item.status}
                    </span>
                    {lockStatus?.isLocked && (
                      <span className={`lock-badge ${lockStatus.isOwn ? 'own-lock' : 'other-lock'}`}>
                        🔒 {lockStatus.isOwn ? 'Editing' : `Locked by ${lockStatus.userName}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="content-meta">
                  <div className="meta-item">
                    <span className="meta-label">Created by:</span>
                    <span className="meta-value">{item.createdByName}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Last modified:</span>
                    <span className="meta-value">
                      {formatDate(item.updatedAt)} by {item.lastModifiedByName}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Version:</span>
                    <span className="meta-value">v{item.version}</span>
                  </div>
                </div>

                {typingIndicator && (
                  <div className="typing-indicator">
                    <span className="typing-dots">●●●</span>
                    <span className="typing-text">{typingIndicator}</span>
                  </div>
                )}

                <div className="content-stats">
                  <span className="stat">👀 {item.stats?.views || 0}</span>
                  <span className="stat">💬 {item.stats?.comments || 0}</span>
                  <span className="stat">❤️ {item.stats?.likes || 0}</span>
                </div>

                <div className="content-actions">
                  <button className="action-btn view">View</button>
                  {canUserPerformAction('edit_content') && (
                    <button 
                      className={`action-btn edit ${lockStatus?.isLocked && !lockStatus?.isOwn ? 'disabled' : ''}`}
                      onClick={() => handleEditContent(item._id)}
                      disabled={lockStatus?.isLocked && !lockStatus?.isOwn}
                      title={lockStatus?.isLocked && !lockStatus?.isOwn ? 
                        `Currently being edited by ${lockStatus.userName}` : 
                        'Edit this content'
                      }
                    >
                      {lockStatus?.isOwn ? 'Continue Editing' : 'Edit'}
                    </button>
                  )}
                  {canDeleteContent(item) && (
                    <button 
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(item);
                      }}
                      title={
                        space?.ownerId === currentUser?.uid || canUserPerformAction('delete_content')
                          ? 'Delete this content (Admin)'
                          : 'Delete your content'
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No content found</h3>
          <p>
            {canUserPerformAction('create_content') 
              ? "Start by adding your first piece of content to this collaboration space."
              : "No content has been shared in this space yet."
            }
          </p>
          {canUserPerformAction('create_content') && (
            <button 
              className="add-content-btn"
              onClick={() => setShowContentModal(true)}
            >
              Add First Content
            </button>
          )}
        </div>
      )}

      <ContentSelectionModal
        spaceId={spaceId}
        spaceName={space?.title || 'Collaboration Space'}
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
        onConfirm={handleAddContent}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && contentToDelete && (
        <div className="delete-content-modal-overlay" onClick={handleDeleteCancel}>
          <div className="delete-content-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <div className="delete-modal-icon">
                <AlertTriangle size={32} className="warning-icon" />
              </div>
              <button className="close-modal-btn" onClick={handleDeleteCancel}>
                <X size={20} />
              </button>
            </div>
            
            <div className="delete-modal-content">
              <h3>Delete Content</h3>
              <p className="delete-warning-text">
                Are you sure you want to delete <strong>"{contentToDelete.title}"</strong>?
              </p>
              
              <div className="delete-content-info">
                <div className="info-row">
                  <span className="info-label">Type:</span>
                  <span className="info-value type-badge">{contentToDelete.contentType}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Created by:</span>
                  <span className="info-value">{contentToDelete.createdByName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Version:</span>
                  <span className="info-value">v{contentToDelete.version}</span>
                </div>
              </div>

              <div className="delete-warning-box">
                <AlertTriangle size={16} />
                <span>This action cannot be undone. All associated data will be permanently removed.</span>
              </div>
            </div>
            
            <div className="delete-modal-actions">
              <button 
                className="cancel-delete-btn" 
                onClick={handleDeleteCancel}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn" 
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentList;
