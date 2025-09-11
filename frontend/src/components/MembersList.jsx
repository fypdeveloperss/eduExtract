import React from 'react';
import './MembersList.css';

const MembersList = ({ space, currentUser, userPermission, canUserPerformAction, onSpaceUpdate }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleColor = (permission) => {
    const colors = {
      'admin': '#4caf50',
      'edit': '#2196f3',
      'view': '#9e9e9e'
    };
    return colors[permission] || colors.view;
  };

  const activeMembers = space.collaborators?.filter(member => member.status === 'active') || [];

  return (
    <div className="members-list">
      <div className="members-header">
        <h2>Members ({activeMembers.length})</h2>
        {canUserPerformAction('invite_users') && (
          <button className="invite-btn">
            + Invite Members
          </button>
        )}
      </div>

      <div className="members-content">
        {activeMembers.length > 0 ? (
          <div className="members-grid">
            {activeMembers.map(member => (
              <div key={member.userId} className="member-card">
                <div className="member-info">
                  <div className="member-avatar">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-details">
                    <h3 className="member-name">{member.name}</h3>
                    <p className="member-email">{member.email}</p>
                    <div className="member-meta">
                      <span className="join-date">
                        Joined {formatDate(member.joinedAt)}
                      </span>
                      {member.invitedBy !== member.userId && (
                        <span className="invited-by">
                          Invited by {space.collaborators?.find(c => c.userId === member.invitedBy)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="member-role">
                  <span 
                    className="role-badge"
                    style={{ backgroundColor: getRoleColor(member.permission) }}
                  >
                    {member.permission}
                  </span>
                  {space.ownerId === member.userId && (
                    <span className="owner-badge">Owner</span>
                  )}
                </div>

                {canUserPerformAction('manage_permissions') && member.userId !== currentUser.uid && space.ownerId !== member.userId && (
                  <div className="member-actions">
                    <button className="action-btn edit-role">
                      Change Role
                    </button>
                    <button className="action-btn remove-member">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No members yet</h3>
            <p>Start collaborating by inviting team members to this space.</p>
            {canUserPerformAction('invite_users') && (
              <button className="invite-btn">
                Invite Your First Member
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pending Invites Section */}
      <div className="pending-section">
        <h3>Pending Invitations</h3>
        <div className="pending-info">
          <p>No pending invitations</p>
        </div>
      </div>
    </div>
  );
};

export default MembersList;
