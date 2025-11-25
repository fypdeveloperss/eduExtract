import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useCustomAlerts } from '../hooks/useCustomAlerts';
import api from '../utils/axios';
import Spinner from './Spinner';
import { Check, X, Clock, User, MessageSquare, Calendar } from 'lucide-react';
import './JoinRequestsTab.css';

const JoinRequestsTab = ({ spaceId, space, onUpdate }) => {
  const { user } = useAuth();
  const { success, error } = useCustomAlerts();
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const [reviewMessage, setReviewMessage] = useState({});

  // Check if user is space owner or admin
  const isOwner = space?.ownerId === user?.uid;
  const userPermission = space?.members?.find(m => m.userId === user?.uid)?.permission;
  const canManageRequests = isOwner || userPermission === 'admin';

  useEffect(() => {
    if (canManageRequests) {
      fetchJoinRequests();
    }
  }, [spaceId, filter, canManageRequests]);

  const fetchJoinRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/collaborate/spaces/${spaceId}/join-requests`, {
        params: { status: filter }
      });

      if (response.data.success) {
        setJoinRequests(response.data.joinRequests || []);
      }
    } catch (err) {
      console.error('Error fetching join requests:', err);
      error('Failed to load join requests', 'Load Error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setProcessingId(requestId);
      const message = reviewMessage[requestId] || '';

      const response = await api.put(`/api/collaborate/join-requests/${requestId}/approve`, {
        reviewMessage: message
      });

      if (response.data.success) {
        success('Join request approved successfully!', 'Request Approved');
        setReviewMessage(prev => ({ ...prev, [requestId]: '' }));
        fetchJoinRequests();
        
        // Trigger parent update to refresh space data
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error('Error approving join request:', err);
      error(err.response?.data?.error || 'Failed to approve join request', 'Approval Failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setProcessingId(requestId);
      const message = reviewMessage[requestId] || '';

      const response = await api.put(`/api/collaborate/join-requests/${requestId}/reject`, {
        reviewMessage: message
      });

      if (response.data.success) {
        success('Join request rejected', 'Request Processed');
        setReviewMessage(prev => ({ ...prev, [requestId]: '' }));
        fetchJoinRequests();
        
        // Trigger parent update to refresh space data
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error('Error rejecting join request:', err);
      error(err.response?.data?.error || 'Failed to reject join request', 'Rejection Failed');
    } finally {
      setProcessingId(null);
    }
  };

  const updateReviewMessage = (requestId, message) => {
    setReviewMessage(prev => ({
      ...prev,
      [requestId]: message
    }));
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPermissionBadge = (permission) => {
    const badges = {
      view: { label: 'Viewer', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      edit: { label: 'Editor', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' }
    };

    const badge = badges[permission] || badges.view;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: Clock, label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      approved: { icon: Check, label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      rejected: { icon: X, label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
    };

    const badge = badges[status] || badges.pending;
    const IconComponent = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <IconComponent size={12} />
        {badge.label}
      </span>
    );
  };

  if (!canManageRequests) {
    return (
      <div className="join-requests-unauthorized">
        <div className="unauthorized-content">
          <User className="unauthorized-icon" size={48} />
          <h3>Access Restricted</h3>
          <p>Only space owners and administrators can view join requests.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="join-requests-loading">
        <Spinner />
        <p>Loading join requests...</p>
      </div>
    );
  }

  return (
    <div className="join-requests-tab">
      <div className="join-requests-header">
        <div className="header-content">
          <h2>Join Requests</h2>
          <p>Manage requests to join your collaboration space</p>
        </div>
        
        <div className="filter-tabs">
          {['pending', 'approved', 'rejected', 'all'].map(status => (
            <button
              key={status}
              className={`filter-tab ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'pending' && joinRequests.length > 0 && filter !== 'pending' && (
                <span className="filter-badge">{joinRequests.filter(req => req.status === 'pending').length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="join-requests-list">
        {joinRequests.length === 0 ? (
          <div className="no-requests">
            <MessageSquare size={48} className="no-requests-icon" />
            <h3>No {filter !== 'all' ? filter : ''} join requests</h3>
            <p>
              {filter === 'pending' 
                ? 'No pending requests at this time.' 
                : `No ${filter} join requests found.`
              }
            </p>
          </div>
        ) : (
          joinRequests.map(request => (
            <div key={request._id} className="join-request-card">
              <div className="request-header">
                <div className="user-info">
                  <div className="user-avatar">
                    {request.requesterName?.charAt(0) || request.requesterEmail?.charAt(0) || '?'}
                  </div>
                  <div className="user-details">
                    <h4>{request.requesterName || 'Unknown User'}</h4>
                    <p>{request.requesterEmail}</p>
                  </div>
                </div>
                
                <div className="request-meta">
                  {getStatusBadge(request.status)}
                  <div className="request-date">
                    <Calendar size={14} />
                    {formatDate(request.createdAt)}
                  </div>
                </div>
              </div>

              <div className="request-content">
                <div className="requested-permission">
                  <span className="permission-label">Requested Permission:</span>
                  {getPermissionBadge(request.requestedPermission)}
                </div>

                {request.message && (
                  <div className="request-message">
                    <span className="message-label">Message:</span>
                    <p>"{request.message}"</p>
                  </div>
                )}

                {request.reviewMessage && (
                  <div className="review-message">
                    <span className="message-label">Review Message:</span>
                    <p>"{request.reviewMessage}"</p>
                  </div>
                )}
              </div>

              {request.status === 'pending' && (
                <div className="request-actions">
                  <div className="review-message-input">
                    <textarea
                      placeholder="Add an optional message for the requester..."
                      value={reviewMessage[request._id] || ''}
                      onChange={(e) => updateReviewMessage(request._id, e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div className="action-buttons">
                    <button
                      className="approve-btn"
                      onClick={() => handleApprove(request._id)}
                      disabled={processingId === request._id}
                    >
                      <Check size={16} />
                      {processingId === request._id ? 'Approving...' : 'Approve'}
                    </button>
                    
                    <button
                      className="reject-btn"
                      onClick={() => handleReject(request._id)}
                      disabled={processingId === request._id}
                    >
                      <X size={16} />
                      {processingId === request._id ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JoinRequestsTab;