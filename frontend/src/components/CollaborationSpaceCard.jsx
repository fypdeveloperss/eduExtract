import React, { useState, useEffect } from 'react';
import { Bell, Globe, Lock, Users, FileText, Eye, ClipboardList, RefreshCw, UserPlus } from 'lucide-react';
import api from '../utils/axios';
import JoinRequestModal from './JoinRequestModal';
import { useCustomAlerts } from '../hooks/useCustomAlerts';
import './CollaborationSpaceCard.css';

const CollaborationSpaceCard = ({ space, currentUser, onClick, onJoinSpace }) => {
  const { success, error } = useCustomAlerts();
  const [joining, setJoining] = useState(false);
  const [showJoinRequestModal, setShowJoinRequestModal] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null);
  
  const isOwner = space.ownerId === currentUser?.uid;
  const userCollaborator = space.collaborators?.find(c => 
    c.userId === currentUser?.uid && c.status === 'active'
  );
  const userRole = isOwner ? 'owner' : userCollaborator?.permission || null;
  const isMember = isOwner || userCollaborator;
  
  // Can join public spaces directly, need to request for restricted spaces
  const canJoinDirectly = space.privacy === 'public' && !isMember && !space.settings?.requireApprovalForJoin;
  const canRequestToJoin = (space.privacy === 'public' || space.privacy === 'restricted') && !isMember;

  // Fetch join request status on component mount
  useEffect(() => {
    if (canRequestToJoin && currentUser) {
      fetchJoinRequestStatus();
    }
  }, [space._id, currentUser]);

  const fetchJoinRequestStatus = async () => {
    try {
      const response = await api.get(`/api/collaborate/spaces/${space._id}/join-request-status`);
      if (response.data.success) {
        setJoinRequestStatus(response.data.status);
      }
    } catch (error) {
      console.error('Error fetching join request status:', error);
    }
  };

  const handleJoinSpace = async (e) => {
    e.stopPropagation(); // Prevent card click
    
    if (joining || !canJoinDirectly) return;

    try {
      setJoining(true);
      
      // Join public space directly
      const response = await api.post(`/api/collaborate/spaces/${space._id}/join`);
      
      if (response.data.success) {
        success('Successfully joined the collaboration space!', 'Welcome to the Space');
        onJoinSpace?.(space._id);
        // Space has been joined, the card will update from parent
      }
    } catch (error) {
      console.error('Error joining space:', error);
      error(error.response?.data?.error || 'Failed to join space', 'Join Failed');
    } finally {
      setJoining(false);
    }
  };

  const handleRequestToJoin = (e) => {
    e.stopPropagation();
    setShowJoinRequestModal(true);
  };

  const handleSubmitJoinRequest = async (requestData) => {
    try {
      const response = await api.post('/api/collaborate/join-requests', requestData);
      
      if (response.data.success) {
        success('Join request sent successfully! The space owner will review your request.', 'Request Sent');
        setJoinRequestStatus({ hasRequest: true, status: 'pending' });
        setShowJoinRequestModal(false);
      }
    } catch (error) {
      console.error('Error submitting join request:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit join request');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return '#4caf50';
      case 'admin': return '#ff9800';
      case 'edit': return '#2196f3';
      case 'view': return '#9e9e9e';
      default: return '#9e9e9e';
    }
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

  const getTotalPendingCount = () => {
    const joinRequests = space.stats?.pendingJoinRequests || 0;
    const changeRequests = space.stats?.pendingChangeRequests || 0;
    return joinRequests + changeRequests;
  };

  const getNotificationTooltip = () => {
    const joinRequests = space.stats?.pendingJoinRequests || 0;
    const changeRequests = space.stats?.pendingChangeRequests || 0;
    const parts = [];
    
    if (joinRequests > 0) {
      parts.push(`${joinRequests} join request${joinRequests > 1 ? 's' : ''}`);
    }
    if (changeRequests > 0) {
      parts.push(`${changeRequests} change request${changeRequests > 1 ? 's' : ''}`);
    }
    
    return parts.join(' • ');
  };

  const hasNotifications = (isOwner || isMember) && getTotalPendingCount() > 0;

  return (
    <>
      <div 
        className={`collaboration-space-card ${hasNotifications ? 'has-notifications' : ''}`} 
        onClick={onClick}
      >
        {/* iPhone-style Notification Badge */}
        {hasNotifications && (
          <div className="iphone-notification-badge" title={getNotificationTooltip()}>
            {getTotalPendingCount()}
          </div>
        )}
        
        {/* Card content wrapper to handle overflow */}
        <div className="card-content-wrapper">
          <div className="card-header">
          <div className="space-info">
            <div className="title-with-notifications">
              <h3 className="space-title">{space.title}</h3>
            </div>
            <div className="space-meta">
              <span className="privacy-indicator">
                {getPrivacyIcon(space.privacy)} {space.privacy}
              </span>
              <span 
                className="category-badge"
                style={{ backgroundColor: getCategoryColor(space.category) }}
              >
                {space.category}
              </span>
            </div>
          </div>
          
          <div className="user-role">
            <span 
              className="role-badge"
              style={{ backgroundColor: getRoleColor(userRole) }}
            >
              {userRole || 'Not a member'}
            </span>
          </div>
        </div>

        <div className="card-body">
          <p className="space-description">
            {space.description.length > 120 
              ? `${space.description.substring(0, 120)}...` 
              : space.description
            }
          </p>

          {space.tags && space.tags.length > 0 && (
            <div className="tags-container">
              {space.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
              {space.tags.length > 3 && (
                <span className="tag more-tags">
                  +{space.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="card-footer">
          <div className="stats-row">
            <div className="stat">
              <span className="stat-icon"><Users className="w-4 h-4" /></span>
              <span className="stat-value">{space.stats?.totalCollaborators || 0}</span>
              <span className="stat-label">Members</span>
            </div>
            
            <div className="stat">
              <span className="stat-icon"><FileText className="w-4 h-4" /></span>
              <span className="stat-value">{space.stats?.totalContent || 0}</span>
              <span className="stat-label">Content</span>
            </div>
            
            <div className="stat">
              <span className="stat-icon"><Eye className="w-4 h-4" /></span>
              <span className="stat-value">{space.stats?.totalViews || 0}</span>
              <span className="stat-label">Views</span>
            </div>
          </div>

          <div className="footer-meta">
            <span className="owner-name">by {space.ownerName}</span>
            <span className="last-activity">
              {space.stats?.lastActivity 
                ? `Updated ${formatDate(space.stats.lastActivity)}`
                : `Created ${formatDate(space.createdAt)}`
              }
            </span>
          </div>

          {/* Action Area - Always visible */}
          <div className="card-actions">
            {canJoinDirectly ? (
              <button 
                className="action-btn join-btn"
                onClick={handleJoinSpace}
                disabled={joining}
              >
                {joining ? 'Joining...' : <><UserPlus className="w-4 h-4" /> Join Space</>}
              </button>
            ) : canRequestToJoin ? (
              (joinRequestStatus?.hasRequest && joinRequestStatus.status === 'pending') ? (
                <div className="request-status-inline">
                  <span className="status-pending"><ClipboardList className="w-4 h-4 inline mr-1" />Request Pending</span>
                </div>
              ) : (joinRequestStatus?.hasRequest && joinRequestStatus.status === 'rejected') ? (
                <button 
                  className="action-btn request-btn"
                  onClick={handleRequestToJoin}
                >
                  <RefreshCw className="w-4 h-4" /> Request Again
                </button>
              ) : (
                <button 
                  className="action-btn request-btn"
                  onClick={handleRequestToJoin}
                >
                  <ClipboardList className="w-4 h-4" /> Request to Join
                </button>
              )
            ) : (
              <span className="view-hint">
                {isMember ? 'Click to open space' : 'Click to view details'}
              </span>
            )}
          </div>
        </div>
        </div>

        {/* Simplified overlay for main card click */}
        <div className="card-overlay" onClick={onClick}>
        </div>
      </div>

      {/* Join Request Modal - Rendered outside card container */}
      {showJoinRequestModal && (
        <JoinRequestModal
          space={space}
          currentUser={currentUser}
          onClose={() => setShowJoinRequestModal(false)}
          onSubmit={handleSubmitJoinRequest}
        />
      )}
    </>
  );
};

export default CollaborationSpaceCard;
