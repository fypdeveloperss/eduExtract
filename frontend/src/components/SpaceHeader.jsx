import React, { useState } from 'react';
import { Globe, Lock, Users, FileText, Eye, Clock } from 'lucide-react';
import InviteModal from './InviteModal';
import ContentSelectionModal from './ContentSelectionModal';
import { authenticatedFetch } from '../utils/auth';
import { useCustomAlerts } from '../hooks/useCustomAlerts';
import './SpaceHeader.css';

const SpaceHeader = ({ space, currentUser, userPermission, canUserPerformAction, onSpaceUpdate }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const { success, error, warning, info } = useCustomAlerts();

  const handleAddContent = async (selectedContent) => {
    try {
      const contentIds = selectedContent.map(content => content._id);
      
      const response = await authenticatedFetch(`/api/collaborate/spaces/${space._id}/content/add-existing`, {
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

      // Trigger space update to refresh content list
      if (onSpaceUpdate) {
        onSpaceUpdate(); // Now always triggers a re-fetch in parent
      }

    } catch (err) {
      console.error('Error adding content:', err);
      error(`Failed to add content: ${err.message}`, 'Add Content Failed');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPrivacyIcon = (privacy) => {
    switch (privacy) {
      case 'public': return <Globe className="w-3.5 h-3.5" />;
      case 'private': return <Lock className="w-3.5 h-3.5" />;
      case 'restricted': return <Users className="w-3.5 h-3.5" />;
      default: return <Lock className="w-3.5 h-3.5" />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'academic': '#3f51b5',
      'research': '#9c27b0',
      'project': '#ff5722',
      'study-group': '#4caf50',
      'other': '#607d8b'
    };
    return colors[category] || colors.other;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#4caf50';
      case 'edit': return '#2196f3';
      case 'view': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const handleInviteSent = (inviteData) => {
    console.log('Invite sent:', inviteData);
    setShowInviteModal(false);
    
    if (inviteData.userExists) {
      success(`Invitation sent successfully! ${inviteData.message} The user will see this invitation in their CollabHub dashboard.`, '✅ Invitation Sent');
    } else {
      info(`Invitation sent! ${inviteData.message} Share this invitation link with them: ${inviteData.inviteUrl}`, '📧 Invitation Link Created');
    }
  };

  return (
    <div className="space-header">
      <div className="header-main">
        <div className="space-info">
          <div className="title-section">
            <h1 className="space-title">{space.title}</h1>
            <div className="space-badges">
              <span 
                className="category-badge"
                style={{ backgroundColor: getCategoryColor(space.category) }}
              >
                {space.category}
              </span>
              <span className="privacy-badge">
                {getPrivacyIcon(space.privacy)} {space.privacy}
              </span>
              <span 
                className="role-badge"
                style={{ backgroundColor: getRoleColor(userPermission) }}
              >
                {userPermission}
              </span>
            </div>
          </div>
          
          <p className="space-description">{space.description}</p>
          
          {space.tags && space.tags.length > 0 && (
            <div className="tags-section">
              {space.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="header-actions">
          {canUserPerformAction('invite_users') && (
            <button 
              className="action-btn primary"
              onClick={() => setShowInviteModal(true)}
            >
              Invite Members
            </button>
          )}
          {canUserPerformAction('create_content') && (
            <button 
              className="action-btn secondary"
              onClick={() => setShowContentModal(true)}
            >
              Add Content
            </button>
          )}
        </div>
      </div>

      <div className="header-stats">
        <div className="stats-grid">
          <div className="stat">
            <span className="stat-icon"><Users className="w-5 h-5" /></span>
            <div className="stat-content">
              <span className="stat-value">{space.stats?.totalCollaborators || 0}</span>
              <span className="stat-label">Members</span>
            </div>
          </div>
          
          <div className="stat">
            <span className="stat-icon"><FileText className="w-5 h-5" /></span>
            <div className="stat-content">
              <span className="stat-value">{space.stats?.totalContent || 0}</span>
              <span className="stat-label">Content Items</span>
            </div>
          </div>
          
          <div className="stat">
            <span className="stat-icon"><Eye className="w-5 h-5" /></span>
            <div className="stat-content">
              <span className="stat-value">{space.stats?.totalViews || 0}</span>
              <span className="stat-label">Total Views</span>
            </div>
          </div>
          
          <div className="stat">
            <span className="stat-icon"><Clock className="w-5 h-5" /></span>
            <div className="stat-content">
              <span className="stat-value">
                {space.stats?.lastActivity 
                  ? formatDate(space.stats.lastActivity)
                  : formatDate(space.createdAt)
                }
              </span>
              <span className="stat-label">Last Activity</span>
            </div>
          </div>
        </div>
      </div>

      <div className="header-meta">
        <div className="owner-info">
          <span className="owner-label">Created by</span>
          <span className="owner-name">{space.ownerName}</span>
          <span className="creation-date">on {formatDate(space.createdAt)}</span>
        </div>
      </div>

      <InviteModal
        spaceId={space._id}
        spaceName={space.title}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={handleInviteSent}
      />

      <ContentSelectionModal
        spaceId={space._id}
        spaceName={space.title}
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
        onConfirm={handleAddContent}
      />
    </div>
  );
};

export default SpaceHeader;
