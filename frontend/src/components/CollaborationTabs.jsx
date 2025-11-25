import React from 'react';
import { FileText, Users, FilePen, DoorOpen, Settings } from 'lucide-react';
import './CollaborationTabs.css';

const CollaborationTabs = ({ activeTab, onTabChange, userPermission, space, currentUser }) => {
  const tabs = [
    { id: 'content', label: 'Content', icon: <FileText className="w-4 h-4" />, description: 'Shared educational content' },
    { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" />, description: 'Collaboration members' },
  ];

  // Add requests tab only for admins and owners
  const isOwner = space?.ownerId === currentUser?.uid;
  if (userPermission === 'admin' || isOwner) {
    tabs.push({ 
      id: 'requests', 
      label: 'Change Requests', 
      icon: <FilePen className="w-4 h-4" />, 
      description: 'Content change requests',
      badgeCount: space?.stats?.pendingChangeRequests || 0
    });
  }

  // Add join requests tab only for owners and admins
  if (isOwner || userPermission === 'admin') {
    tabs.push({ 
      id: 'join-requests', 
      label: 'Join Requests', 
      icon: <DoorOpen className="w-4 h-4" />, 
      description: 'Pending join requests',
      badgeCount: space?.stats?.pendingJoinRequests || 0
    });
  }

  // Add settings tab only for admins
  if (userPermission === 'admin') {
    tabs.push({ 
      id: 'settings', 
      label: 'Settings', 
      icon: <Settings className="w-4 h-4" />, 
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
            {tab.badgeCount > 0 && (
              <span className="notification-badge">
                {tab.badgeCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CollaborationTabs;
