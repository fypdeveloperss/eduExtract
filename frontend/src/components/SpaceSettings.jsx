import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { useCustomAlerts } from '../hooks/useCustomAlerts';
import Spinner from './Spinner';
import './SpaceSettings.css';

const SpaceSettings = ({ space, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error, warning } = useCustomAlerts();
  
  // Debug logging
  console.log('SpaceSettings rendered with:', { space: space?._id, user: user?.uid });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    title: space?.title || '',
    description: space?.description || '',
    isPrivate: space?.isPrivate || false,
    defaultPermission: space?.defaultPermission || 'view',
    allowInvites: space?.allowInvites !== false,
    autoApproveRequests: space?.autoApproveRequests || false,
    maxMembers: space?.maxMembers || 50
  });

  const [inviteSettings, setInviteSettings] = useState({
    requireApproval: space?.inviteSettings?.requireApproval || false,
    allowMemberInvites: space?.inviteSettings?.allowMemberInvites !== false,
    inviteExpiration: space?.inviteSettings?.inviteExpiration || 7
  });

  const [joinRequestSettings, setJoinRequestSettings] = useState({
    autoApproveJoinRequests: space?.settings?.autoApproveJoinRequests || false
  });

  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);

  useEffect(() => {
    try {
      if (space) {
        console.log('Updating form data for space:', space._id);
        setFormData({
          title: space.title || '',
          description: space.description || '',
          isPrivate: space.isPrivate || false,
          defaultPermission: space.defaultPermission || 'view',
          allowInvites: space.allowInvites !== false,
          autoApproveRequests: space.autoApproveRequests || false,
          maxMembers: space.maxMembers || 50
        });

        setInviteSettings({
          requireApproval: space.inviteSettings?.requireApproval || false,
          allowMemberInvites: space.inviteSettings?.allowMemberInvites !== false,
          inviteExpiration: space.inviteSettings?.inviteExpiration || 7
        });

        setJoinRequestSettings({
          autoApproveJoinRequests: space.settings?.autoApproveJoinRequests || false
        });
      }
    } catch (error) {
      console.error('Error updating form data:', error);
    }
  }, [space?._id]); // Only depend on space ID to prevent unnecessary re-renders

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = value;
    
    // Handle number inputs
    if (type === 'number') {
      processedValue = parseInt(value) || 0;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  const handleInviteSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = value;
    
    // Handle number inputs
    if (type === 'number') {
      processedValue = parseInt(value) || 0;
    }
    
    setInviteSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  const handleJoinRequestSettingChange = (e) => {
    const { name, type, checked } = e.target;
    
    setJoinRequestSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : prev[name]
    }));
  };

  const fetchJoinRequests = async () => {
    try {
      setLoadingJoinRequests(true);
      const response = await api.get(`/api/collaborate/spaces/${space._id}/join-requests`);
      if (response.data.success) {
        setJoinRequests(response.data.joinRequests);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setLoadingJoinRequests(false);
    }
  };

  const handleApproveJoinRequest = async (requestId) => {
    try {
      const response = await api.put(`/api/collaborate/join-requests/${requestId}/approve`, {
        reviewMessage: '' // Send empty review message
      });
      if (response.data.success) {
        success('Join request approved successfully!', 'Request Approved');
        fetchJoinRequests(); // Refresh list
        onUpdate?.(); // Update parent component
      }
    } catch (error) {
      console.error('Error approving join request:', error);
      error(error.response?.data?.error || 'Failed to approve join request', 'Approval Failed');
    }
  };

  const handleRejectJoinRequest = async (requestId) => {
    try {
      const reviewMessage = prompt('Optional rejection message:');
      const response = await api.put(`/api/collaborate/join-requests/${requestId}/reject`, {
        reviewMessage
      });
      if (response.data.success) {
        success('Join request rejected.', 'Request Rejected');
        fetchJoinRequests(); // Refresh list
      }
    } catch (error) {
      console.error('Error rejecting join request:', error);
      error(error.response?.data?.error || 'Failed to reject join request', 'Rejection Failed');
    }
  };

  // Fetch join requests when tab becomes active
  useEffect(() => {
    if (activeTab === 'invites' && space?._id) {
      fetchJoinRequests();
    }
  }, [activeTab, space?._id]);

  // Helper function to format time ago like Instagram
  const formatTimeAgo = (date) => {
    const now = new Date();
    const requestDate = new Date(date);
    const diffInSeconds = Math.floor((now - requestDate) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      const updateData = {
        ...formData,
        inviteSettings: inviteSettings,
        settings: {
          ...space.settings,
          ...joinRequestSettings
        }
      };

      const response = await api.put(
        `/api/collaborate/spaces/${space._id}`,
        updateData
      );

      if (onUpdate) {
        onUpdate(); // Just call the update function to trigger refresh
      }

      success('Settings updated successfully!', 'Settings Saved');
    } catch (error) {
      console.error('Error updating space settings:', error);
      error('Failed to update settings. Please try again.', 'Update Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpace = async () => {
    const spaceTitle = space?.title || 'Unknown Space';
    
    if (deleteConfirmText !== spaceTitle) {
      warning('Please enter the exact space title to confirm deletion.', 'Confirmation Required');
      return;
    }

    try {
      setDeleting(true);

      await api.delete(`/api/collaborate/spaces/${space._id}`);

      if (onDelete) {
        onDelete(space._id);
      }

      navigate('/collaborate');
    } catch (error) {
      console.error('Error deleting space:', error);
      error('Failed to delete space. Please try again.', 'Deletion Failed');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  const canManageSpace = () => {
    if (!space || !user) return false;
    
    // Check if user is the owner
    if (space.ownerId === user.uid) return true;
    
    // Check if user is an admin collaborator
    const userCollaborator = space.collaborators?.find(c => 
      c.userId === user.uid && c.status === 'active'
    );
    
    return userCollaborator?.permission === 'admin';
  };

  if (loading) {
    return (
      <div className="space-settings-loading">
        <Spinner />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="space-settings-error">
        <h3>Space Not Found</h3>
        <p>Unable to load space settings. Please try refreshing the page.</p>
      </div>
    );
  }

  if (!canManageSpace()) {
    return (
      <div className="space-settings-error">
        <h3>Access Denied</h3>
        <p>You don't have permission to manage this space's settings.</p>
      </div>
    );
  }

  return (
    <div className="space-settings">
      <div className="settings-header">
        <h2>Space Settings</h2>
        <p>Manage your collaboration space configuration and permissions</p>
      </div>

      <div className="settings-tabs">
        {['general', 'permissions', 'invites', 'danger'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {activeTab === 'general' && (
          <div className="settings-section">
            <h3>General Settings</h3>
            
            <div className="form-group">
              <label htmlFor="title">Space Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter space title"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the purpose of this collaboration space"
                rows={4}
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isPrivate"
                  checked={formData.isPrivate}
                  onChange={handleInputChange}
                />
                <span className="checkbox-text">
                  Private Space
                  <small>Only invited members can access this space</small>
                </span>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="maxMembers">Maximum Members</label>
              <input
                type="number"
                id="maxMembers"
                name="maxMembers"
                value={formData.maxMembers}
                onChange={handleInputChange}
                min="1"
                max="200"
              />
              <small>Maximum number of members allowed in this space</small>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="settings-section">
            <h3>Permission Settings</h3>
            
            <div className="form-group">
              <label htmlFor="defaultPermission">Default Permission Level</label>
              <select
                id="defaultPermission"
                name="defaultPermission"
                value={formData.defaultPermission}
                onChange={handleInputChange}
              >
                <option value="view">View Only</option>
                <option value="edit">Edit Content</option>
                <option value="admin">Full Admin Access</option>
              </select>
              <small>Default permission level for new members</small>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="autoApproveRequests"
                  checked={formData.autoApproveRequests}
                  onChange={handleInputChange}
                />
                <span className="checkbox-text">
                  Auto-approve Change Requests
                  <small>Automatically approve change requests from trusted members</small>
                </span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="settings-section">
            <h3>Invitation Settings</h3>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="allowInvites"
                  checked={formData.allowInvites}
                  onChange={handleInputChange}
                />
                <span className="checkbox-text">
                  Allow Invitations
                  <small>Enable members to invite others to this space</small>
                </span>
              </label>
            </div>

            {formData.allowInvites && (
              <>
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="allowMemberInvites"
                      checked={inviteSettings.allowMemberInvites}
                      onChange={handleInviteSettingChange}
                    />
                    <span className="checkbox-text">
                      Allow Member Invitations
                      <small>Let all members send invitations, not just admins</small>
                    </span>
                  </label>
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="requireApproval"
                      checked={inviteSettings.requireApproval}
                      onChange={handleInviteSettingChange}
                    />
                    <span className="checkbox-text">
                      Require Invitation Approval
                      <small>Admins must approve all invitations before they're sent</small>
                    </span>
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="inviteExpiration">Invitation Expiration (days)</label>
                  <input
                    type="number"
                    id="inviteExpiration"
                    name="inviteExpiration"
                    value={inviteSettings.inviteExpiration}
                    onChange={handleInviteSettingChange}
                    min="1"
                    max="30"
                  />
                  <small>Number of days after which invitations expire</small>
                </div>
              </>
            )}

            {/* Join Request Settings */}
            <h4 className="section-subtitle">Join Request Settings</h4>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="autoApproveJoinRequests"
                  checked={joinRequestSettings.autoApproveJoinRequests}
                  onChange={handleJoinRequestSettingChange}
                />
                <span className="checkbox-text">
                  Auto-approve Join Requests
                  <small>Automatically approve all join requests without manual review</small>
                </span>
              </label>
            </div>

            {/* Pending Join Requests */}
            <h4 className="section-subtitle">
              Join Requests ({joinRequests.filter(req => req.status === 'pending').length})
            </h4>
            
            {loadingJoinRequests ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading requests...</p>
              </div>
            ) : joinRequests.filter(req => req.status === 'pending').length === 0 ? (
              <div className="empty-requests-state">
                <div className="empty-icon">👥</div>
                <h3>No pending requests</h3>
                <p>When users request to join your space, they'll appear here.</p>
              </div>
            ) : (
              <div className="join-requests-container">
                {joinRequests
                  .filter(req => req.status === 'pending')
                  .map(request => (
                    <div key={request._id} className="join-request-card">
                      <div className="request-avatar">
                        <div className="avatar-circle">
                          {request.requesterName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="request-content">
                        <div className="request-header">
                          <div className="requester-info">
                            <h4 className="requester-name">{request.requesterName}</h4>
                            <span className="requester-email">{request.requesterEmail}</span>
                          </div>
                          <div className="request-time">
                            {formatTimeAgo(request.createdAt)}
                          </div>
                        </div>
                        
                        <div className="request-details">
                          <span className="permission-badge">
                            Wants {request.requestedPermission} access
                          </span>
                        </div>
                        
                        {request.message && (
                          <div className="request-message">
                            <p>"{request.message}"</p>
                          </div>
                        )}
                        
                        <div className="request-actions">
                          <button
                            className="action-btn approve-btn"
                            onClick={() => handleApproveJoinRequest(request._id)}
                          >
                            Accept
                          </button>
                          <button
                            className="action-btn reject-btn"
                            onClick={() => handleRejectJoinRequest(request._id)}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="settings-section danger-zone">
            <h3>Danger Zone</h3>
            <p className="danger-warning">
              These actions are permanent and cannot be undone. Please proceed with caution.
            </p>
            
            <div className="danger-action">
              <div className="danger-info">
                <h4>Delete Collaboration Space</h4>
                <p>
                  Permanently delete this collaboration space and all its content. 
                  This action cannot be undone and will remove all associated data, 
                  including shared content, change requests, and member records.
                </p>
              </div>
              <button
                className="danger-btn"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
              >
                Delete Space
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-actions">
        <button
          className="save-btn"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="modal-header">
              <h2>Delete Collaboration Space</h2>
            </div>
            
            <div className="modal-content">
              <div className="delete-warning">
                <p>
                  <strong>This action cannot be undone.</strong>
                </p>
                <p>
                  This will permanently delete the "{space?.title || 'Unknown Space'}" collaboration space and all of its data, including:
                </p>
                <ul>
                  <li>All shared content and files</li>
                  <li>Change request history</li>
                  <li>Member access records</li>
                  <li>Space configuration</li>
                </ul>
              </div>

              <div className="confirm-input">
                <label>
                  Type the space title <strong>"{space?.title || 'Unknown Space'}"</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter space title"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="confirm-delete-btn"
                onClick={handleDeleteSpace}
                disabled={deleting || deleteConfirmText !== (space?.title || 'Unknown Space')}
              >
                {deleting ? 'Deleting...' : 'Delete Space'}
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceSettings;
