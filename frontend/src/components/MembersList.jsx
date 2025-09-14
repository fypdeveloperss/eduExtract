import React, { useState } from 'react';
import InviteModal from './InviteModal';
import ChangeRoleModal from './ChangeRoleModal';
import ConfirmRemovalModal from './ConfirmRemovalModal';
import './MembersList.css';

const MembersList = ({ space, currentUser, userPermission, canUserPerformAction, onSpaceUpdate }) => {
  // State for modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const activeMembers = space.collaborators?.filter(member => member.status === 'active') || [];

  // Handler functions
  const handleInviteMember = () => {
    setShowInviteModal(true);
  };

  const handleChangeRole = (member) => {
    setSelectedMember(member);
    setShowChangeRoleModal(true);
  };

  const handleRemoveMember = (member) => {
    setSelectedMember(member);
    setShowRemovalModal(true);
  };

  const handleInviteSent = (inviteData) => {
    console.log('Invite sent:', inviteData);
    // Optionally show a success message
    if (onSpaceUpdate) {
      onSpaceUpdate();
    }
  };

  const handleRoleChanged = (updatedSpace) => {
    console.log('Role updated:', updatedSpace);
    if (onSpaceUpdate) {
      onSpaceUpdate();
    }
  };

  const handleMemberRemoved = (updatedSpace) => {
    console.log('Member removed:', updatedSpace);
    if (onSpaceUpdate) {
      onSpaceUpdate();
    }
  };

  const closeModals = () => {
    setShowInviteModal(false);
    setShowChangeRoleModal(false);
    setShowRemovalModal(false);
    setSelectedMember(null);
  };

  return (
    <div className="members-list">
      <div className="members-header">
        <h2>Members ({activeMembers.length})</h2>
        {canUserPerformAction('invite_users') && (
          <button className="invite-btn" onClick={handleInviteMember}>
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
                  <span className={`role-badge role-${member.permission}`}>
                    {member.permission}
                  </span>
                  {space.ownerId === member.userId && (
                    <span className="owner-badge">Owner</span>
                  )}
                </div>

                {canUserPerformAction('manage_permissions') && member.userId !== currentUser.uid && space.ownerId !== member.userId && (
                  <div className="member-actions">
                    <button 
                      className="action-btn edit-role"
                      onClick={() => handleChangeRole(member)}
                    >
                      Change Role
                    </button>
                    <button 
                      className="action-btn remove-member"
                      onClick={() => handleRemoveMember(member)}
                    >
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
              <button className="invite-btn" onClick={handleInviteMember}>
                Invite Your First Member
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteModal
        spaceId={space._id}
        spaceName={space.name || space.title}
        isOpen={showInviteModal}
        onClose={closeModals}
        onInviteSent={handleInviteSent}
      />

      <ChangeRoleModal
        isOpen={showChangeRoleModal}
        onClose={closeModals}
        onRoleChanged={handleRoleChanged}
        member={selectedMember}
        spaceId={space._id}
      />

      <ConfirmRemovalModal
        isOpen={showRemovalModal}
        onClose={closeModals}
        onMemberRemoved={handleMemberRemoved}
        member={selectedMember}
        spaceId={space._id}
      />
    </div>
  );
};

export default MembersList;
