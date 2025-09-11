import React from 'react';
import './CollaborationSpaceCard.css';

const CollaborationSpaceCard = ({ space, currentUser, onClick }) => {
  const isOwner = space.ownerId === currentUser?.uid;
  const userCollaborator = space.collaborators?.find(c => c.userId === currentUser?.uid);
  const userRole = isOwner ? 'owner' : userCollaborator?.permission || 'viewer';

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
      case 'public': return '🌐';
      case 'private': return '🔒';
      case 'restricted': return '👥';
      default: return '🔒';
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

  return (
    <div className="collaboration-space-card" onClick={onClick}>
      <div className="card-header">
        <div className="space-info">
          <h3 className="space-title">{space.title}</h3>
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
            {userRole}
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
            <span className="stat-icon">👥</span>
            <span className="stat-value">{space.stats?.totalCollaborators || 0}</span>
            <span className="stat-label">Members</span>
          </div>
          
          <div className="stat">
            <span className="stat-icon">📄</span>
            <span className="stat-value">{space.stats?.totalContent || 0}</span>
            <span className="stat-label">Content</span>
          </div>
          
          <div className="stat">
            <span className="stat-icon">👀</span>
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
      </div>

      <div className="card-overlay">
        <div className="overlay-content">
          <span className="view-text">View Space</span>
        </div>
      </div>
    </div>
  );
};

export default CollaborationSpaceCard;
