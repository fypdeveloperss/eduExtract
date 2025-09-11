import React from 'react';
import { useCollaboration } from '../context/CollaborationContext';
import './NotificationPanel.css';

const NotificationPanel = () => {
  const { 
    notifications, 
    removeNotification, 
    clearNotifications,
    isConnected,
    activeUsers 
  } = useCollaboration();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now - notificationTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return notificationTime.toLocaleDateString();
  };

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <div className="header-title">
          <span className="notification-icon">🔔</span>
          <h3>Collaboration Feed</h3>
          {notifications.length > 0 && (
            <span className="notification-count">{notifications.length}</span>
          )}
        </div>
        
        <div className="header-status">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-indicator"></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          
          {activeUsers.length > 0 && (
            <div className="active-users">
              <span className="users-icon">👥</span>
              <span className="users-count">{activeUsers.length}</span>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <button 
            className="clear-all-btn"
            onClick={clearNotifications}
            title="Clear all notifications"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="empty-notifications">
            <span className="empty-icon">🔕</span>
            <p>No notifications yet</p>
            <small>
              {isConnected 
                ? 'You\'ll see real-time updates here when collaborating'
                : 'Connect to start receiving collaboration updates'
              }
            </small>
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${notification.type}`}
            >
              <div className="notification-content">
                <div className="notification-main">
                  <span className="notification-type-icon">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <span className="notification-message">
                    {notification.message}
                  </span>
                </div>
                
                <div className="notification-meta">
                  <span className="notification-time">
                    {formatTimestamp(notification.timestamp)}
                  </span>
                  
                  {notification.action && (
                    <button 
                      className="notification-action"
                      onClick={notification.action.onClick}
                    >
                      {notification.action.label}
                    </button>
                  )}
                </div>
              </div>
              
              <button 
                className="remove-notification"
                onClick={() => removeNotification(notification.id)}
                title="Dismiss notification"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {activeUsers.length > 0 && (
        <div className="active-users-list">
          <h4>Active Collaborators</h4>
          <div className="users-grid">
            {activeUsers.map(user => (
              <div key={user.userId} className="user-item">
                <div className="user-avatar">
                  {user.userName ? user.userName.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.userName || 'Unknown User'}</span>
                  <span className="user-status">Online</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
