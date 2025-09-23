import React from 'react';
import './CollaborationTabs.css';

const CollaborationTabs = ({ activeTab, onTabChange, userPermission, space, currentUser }) => {
  const tabs = [
    { id: 'content', label: 'Content', icon: '📄', description: 'Shared educational content' },
    { id: 'members', label: 'Members', icon: '👥', description: 'Collaboration members' },
  ];

  // Add requests tab only for admins and owners
  const isOwner = space?.ownerId === currentUser?.uid;
  if (userPermission === 'admin' || isOwner) {
    tabs.push({ id: 'requests', label: 'Change Requests', icon: '📝', description: 'Content change requests' });
  }

  // Add settings tab only for admins
  if (userPermission === 'admin') {
    tabs.push({ 
      id: 'settings', 
      label: 'Settings', 
      icon: '⚙️', 
      description: 'Space configuration' 
    });
  }

  return (
    <div className="collaboration-tabs">
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.description}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.id === 'requests' && space?.stats?.pendingRequests > 0 && (
              <span className="notification-badge">
                {space.stats.pendingRequests}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CollaborationTabs;
