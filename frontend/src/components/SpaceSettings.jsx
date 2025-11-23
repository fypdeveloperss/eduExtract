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













  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      const updateData = {
        ...formData,
        inviteSettings: inviteSettings
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
