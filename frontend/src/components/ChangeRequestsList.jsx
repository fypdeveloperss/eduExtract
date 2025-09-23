import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import Spinner from './Spinner';
import './ChangeRequestsList.css';

const ChangeRequestsList = ({ spaceId, selectedContent, onUpdate }) => {
  const { user } = useAuth();
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchChangeRequests();
  }, [spaceId, selectedContent, filter]);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      
      let url = `/api/collaborate/spaces/${spaceId}/change-requests`;
      const params = new URLSearchParams();
      
      if (selectedContent) {
        params.append('content', selectedContent);
      }
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      
      console.log('Change requests API response:', response.data);
      setChangeRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching change requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRequest = async (requestId, status) => {
    try {
      setSubmittingReview(true);

      await api.put(
        `/api/collaborate/change-requests/${requestId}/review`,
        {
          status,
          reviewComment: reviewComment.trim() || undefined,
          applyChanges: status === 'approved'
        }
      );

      // Refresh the list
      fetchChangeRequests();
      setSelectedRequest(null);
      setReviewComment('');
      
      // If approved, trigger content refresh in parent component
      if (status === 'approved' && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error reviewing change request:', error);
      alert('Failed to review change request. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'approved': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'applied': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  const getRequestTypeLabel = (type) => {
    switch (type) {
      case 'content_update': return 'Content Update';
      case 'permission_change': return 'Permission Change';
      case 'metadata_update': return 'Metadata Update';
      default: return type;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canReviewRequest = (request) => {
    return request.status === 'pending' && 
           request.requestedBy._id !== user.uid;
  };

  if (loading) {
    return (
      <div className="change-requests-loading">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="change-requests-list">
      <div className="requests-header">
        <h2>Change Requests</h2>
        <div className="filter-tabs">
          {['all', 'pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              className={`filter-tab ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'pending' && changeRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="pending-count">
                  {changeRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="requests-content">
        {changeRequests.length === 0 ? (
          <div className="empty-state">
            <h3>No Change Requests</h3>
            <p>
              {filter === 'all' 
                ? 'No change requests have been submitted yet.'
                : `No ${filter} change requests found.`
              }
            </p>
          </div>
        ) : (
          <div className="requests-grid">
            {changeRequests.map(request => (
              <div key={request._id} className="request-card">
                <div className="request-header">
                  <div className="request-info">
                    <h3 className="request-title">
                      {getRequestTypeLabel(request.requestType)}
                    </h3>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(request.status) }}
                    >
                      {request.status}
                    </span>
                  </div>
                  <div className="request-meta">
                    <p className="requested-by">
                      By {request.requestedBy.username || request.requestedBy.email}
                    </p>
                    <p className="request-date">
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="request-body">
                  <p className="request-description">
                    {request.description}
                  </p>
                  
                  {request.content && (
                    <p className="content-reference">
                      Content: <strong>{request.content.title}</strong>
                    </p>
                  )}

                  {request.changes && Object.keys(request.changes).length > 0 && (
                    <div className="changes-preview">
                      <h4>Proposed Changes:</h4>
                      <div className="changes-list">
                        {Object.entries(request.changes).map(([field, value]) => (
                          <div key={field} className="change-item">
                            <span className="field-name">{field}:</span>
                            <span className="field-value">
                              {typeof value === 'string' && value.length > 100 
                                ? `${value.substring(0, 100)}...`
                                : String(value)
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {request.status !== 'pending' && (
                  <div className="request-review">
                    <div className="review-info">
                      <p className="reviewed-by">
                        Reviewed by {request.reviewedBy?.username || request.reviewedBy?.email}
                      </p>
                      <p className="review-date">
                        {formatDate(request.reviewedAt)}
                      </p>
                    </div>
                    {request.reviewComment && (
                      <p className="review-comment">
                        "{request.reviewComment}"
                      </p>
                    )}
                  </div>
                )}

                {canReviewRequest(request) && (
                  <div className="request-actions">
                    <button
                      className="action-btn review-btn"
                      onClick={() => setSelectedRequest(request)}
                    >
                      Review Request
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="review-modal-overlay">
          <div className="review-modal">
            <div className="modal-header">
              <h2>Review Change Request</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedRequest(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="request-summary">
                <h3>{getRequestTypeLabel(selectedRequest.requestType)}</h3>
                <p className="request-description">
                  {selectedRequest.description}
                </p>
                
                {selectedRequest.changes && (
                  <div className="detailed-changes">
                    <h4>Detailed Changes:</h4>
                    {Object.entries(selectedRequest.changes).map(([field, value]) => (
                      <div key={field} className="change-detail">
                        <strong>{field}:</strong>
                        <div className="change-value">
                          {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="review-form">
                <textarea
                  placeholder="Add a review comment (optional)..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="action-btn approve-btn"
                  onClick={() => handleReviewRequest(selectedRequest._id, 'approved')}
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Processing...' : 'Approve'}
                </button>
                <button
                  className="action-btn reject-btn"
                  onClick={() => handleReviewRequest(selectedRequest._id, 'rejected')}
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Processing...' : 'Reject'}
                </button>
                <button
                  className="action-btn cancel-btn"
                  onClick={() => setSelectedRequest(null)}
                  disabled={submittingReview}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeRequestsList;
