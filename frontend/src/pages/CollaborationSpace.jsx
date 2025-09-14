import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import { useCollaboration } from '../context/CollaborationContext';
import api from '../utils/axios';
import CollaborationTabs from '../components/CollaborationTabs';
import SpaceHeader from '../components/SpaceHeader';
import SpaceContentList from '../components/SpaceContentList';
import MembersList from '../components/MembersList';
import ChangeRequestsList from '../components/ChangeRequestsList';
import SpaceSettings from '../components/SpaceSettings';
import NotificationPanel from '../components/NotificationPanel';
import Spinner from '../components/Spinner';
import './CollaborationSpace.css';

const CollaborationSpace = () => {
  const { spaceId } = useParams();
  const { user } = useAuth();
  const { 
    joinSpace, 
    leaveSpace, 
    isConnected, 
    addNotification,
    notifications 
  } = useCollaboration();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [space, setSpace] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [error, setError] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  
  // Refs for managing intervals and preventing race conditions
  const fetchTimeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const lastFetchTimeRef = useRef(0);
  const isJoinedRef = useRef(false);
  const mountedRef = useRef(true);
  
  // FIX 1: Remove spaceId from dependencies and make function more stable
  const debouncedFetch = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Check if component is still mounted and spaceId exists
    if (!mountedRef.current || !spaceId) return;
    
    // Prevent fetching too frequently (minimum 2 seconds between calls)
    if (!force && (now - lastFetchTimeRef.current) < 2000) {
      return;
    }
    
    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    lastFetchTimeRef.current = now;
    
    try {
      const response = await api.get(`/api/collaborate/spaces/${spaceId}`);
      
      if (!mountedRef.current) return; // Check again after async operation
      
      if (response.data.success) {
        setSpace(prevSpace => {
          // Only update if data actually changed
          if (!prevSpace || JSON.stringify(prevSpace) !== JSON.stringify(response.data.space)) {
            return response.data.space;
          }
          return prevSpace;
        });
        setError(null);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      
      console.error('Error fetching space:', error);
      
      if (error.response?.status === 404) {
        setError('Collaboration space not found');
      } else if (error.response?.status === 403) {
        // User was likely removed from the space
        setError('You no longer have access to this collaboration space');
        
        // Start countdown for automatic redirect
        setRedirectCountdown(3);
        const countdownInterval = setInterval(() => {
          setRedirectCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              navigate('/collaborate');
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError('Failed to load collaboration space');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [spaceId]); // FIX: Include spaceId in dependencies

  // FIX 2: Separate initial load from periodic refresh
  // Initial load effect - only runs when user or spaceId changes
  useEffect(() => {
    if (user && spaceId) {
      setLoading(true);
      setError(null);
      debouncedFetch(true); // Force initial fetch
    }
  }, [user, spaceId, debouncedFetch]); // Include debouncedFetch in deps

  // FIX 3: Set up periodic refresh separately
  useEffect(() => {
    if (!user || !spaceId) return;

    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Refresh every 15 seconds (increased from 10 to reduce load)
    refreshIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        debouncedFetch();
      }
    }, 15000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [user, spaceId, debouncedFetch]); // Include debouncedFetch in deps

  // FIX 4: Stabilize space joining/leaving logic
  useEffect(() => {
    if (!user || !space || !isConnected) return;
    
    // Prevent multiple joins
    if (isJoinedRef.current) return;
    
    const userInfo = {
      userId: user.uid,
      userName: user.displayName || user.email,
      permission: space.ownerId === user.uid ? 'admin' : 
        space.collaborators?.find(c => c.userId === user.uid && c.status === 'active')?.permission || 'view'
    };
    
    console.log('Joining space:', spaceId, userInfo); // Debug log
    joinSpace(spaceId, userInfo);
    isJoinedRef.current = true;
    
    addNotification({
      type: 'info',
      message: `Connected to "${space.title}"`,
      timestamp: Date.now()
    });

  }, [user?.uid, space?._id, spaceId, isConnected]); // FIX: More specific dependencies

  // FIX 5: Separate cleanup effect
  useEffect(() => {
    return () => {
      if (isJoinedRef.current && spaceId) {
        console.log('Leaving space:', spaceId); // Debug log
        leaveSpace(spaceId);
        isJoinedRef.current = false;
      }
    };
  }, [spaceId]); // Only depend on spaceId for cleanup

  // FIX 6: Debounce real-time updates
  const updateTimeoutRef = useRef(null);
  
  useEffect(() => {
    const handleRealTimeUpdate = (event) => {
      if (event.detail?.spaceId === spaceId) {
        // Clear existing timeout
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // Debounce updates - wait 1 second before fetching
        updateTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            debouncedFetch(true);
          }
        }, 1000);
      }
    };

    const handleVisibilityChange = () => {
      // Only refresh if user returns to tab and it's been a while
      if (!document.hidden && (Date.now() - lastFetchTimeRef.current) > 5000) {
        debouncedFetch(true);
      }
    };

    // Listen for custom events
    window.addEventListener('collaborationUpdate', handleRealTimeUpdate);
    window.addEventListener('spaceContentChanged', handleRealTimeUpdate);
    window.addEventListener('spaceMemberChanged', handleRealTimeUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('collaborationUpdate', handleRealTimeUpdate);
      window.removeEventListener('spaceContentChanged', handleRealTimeUpdate);
      window.removeEventListener('spaceMemberChanged', handleRealTimeUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [spaceId]); // Only depend on spaceId

  // FIX 7: Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // FIX 8: Stabilize update handlers with less frequent updates
  const handleSpaceUpdate = useCallback(() => {
    // Only dispatch event, don't fetch immediately
    window.dispatchEvent(new CustomEvent('collaborationUpdate', {
      detail: { spaceId, timestamp: Date.now() }
    }));
  }, [spaceId]);

  const handleContentUpdate = useCallback(() => {
    window.dispatchEvent(new CustomEvent('spaceContentChanged', {
      detail: { spaceId, timestamp: Date.now() }
    }));
  }, [spaceId]);

  const handleMemberUpdate = useCallback(() => {
    window.dispatchEvent(new CustomEvent('spaceMemberChanged', {
      detail: { spaceId, timestamp: Date.now() }
    }));
  }, [spaceId]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    // Remove immediate fetch on tab change - let periodic refresh handle it
  }, []);

  // Handle leaving the space
  const handleLeaveSpace = useCallback(async () => {
    console.log('handleLeaveSpace called');
    if (!space || !user) {
      console.log('Missing space or user:', { space: !!space, user: !!user });
      return;
    }

    try {
      setLeaving(true);
      console.log('Attempting to leave space:', spaceId);
      
      // Call API to remove user from space
      const response = await api.delete(`/api/collaborate/spaces/${spaceId}/collaborators/${user.uid}`);
      
      console.log('Leave space response:', response.data);
      
      if (response.data.success) {
        // Leave the socket room
        if (isJoinedRef.current) {
          leaveSpace(spaceId);
          isJoinedRef.current = false;
        }
        
        // Dispatch event to update CollaborateHub
        window.dispatchEvent(new CustomEvent('memberRemovedFromSpace', {
          detail: { spaceId, userId: user.uid }
        }));
        
        addNotification({
          type: 'success',
          message: `Left "${space.title}" successfully`,
          timestamp: Date.now()
        });
        
        // Redirect to CollaborateHub
        navigate('/collaborate');
      }
    } catch (error) {
      console.error('Error leaving space:', error);
      addNotification({
        type: 'error',
        message: 'Failed to leave space. Please try again.',
        timestamp: Date.now()
      });
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  }, [space, user, spaceId, leaveSpace, addNotification, navigate]);

  // Memoized permission functions
  const getUserPermission = useCallback(() => {
    if (!space || !user) return null;
    
    if (space.ownerId === user.uid) return 'admin';
    
    const collaborator = space.collaborators?.find(c => 
      c.userId === user.uid && c.status === 'active'
    );
    return collaborator?.permission || null;
  }, [space, user]);

  const canUserPerformAction = useCallback((action) => {
    const permission = getUserPermission();
    if (!permission) return false;

    const permissions = {
      view: ['view_content', 'view_space'],
      edit: ['view_content', 'view_space', 'create_content', 'edit_content', 'comment'],
      admin: ['view_content', 'view_space', 'create_content', 'edit_content', 'comment', 
              'invite_users', 'manage_permissions', 'delete_content', 'approve_changes', 'manage_space']
    };

    return permissions[permission]?.includes(action) || false;
  }, [getUserPermission]);

  // Check if user can leave the space (collaborators can leave, owners cannot)
  const canLeaveSpace = useCallback(() => {
    if (!space || !user) return false;
    
    console.log('Checking canLeaveSpace:', {
      spaceOwnerId: space.ownerId,
      userId: user.uid,
      isOwner: space.ownerId === user.uid,
      collaborators: space.collaborators
    });
    
    // Owners cannot leave their own space
    if (space.ownerId === user.uid) return false;
    
    // Check if user is an active collaborator
    const canLeave = space.collaborators?.some(c => 
      c.userId === user.uid && c.status === 'active'
    );
    
    console.log('Can leave space:', canLeave);
    return canLeave;
  }, [space, user]);

  // Early returns for different states
  if (!user) {
    return (
      <div className="collaboration-space">
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>Please log in to access this collaboration space</p>
        </div>
      </div>
    );
  }

  if (loading && !space) {
    return (
      <div className="collaboration-space">
        <div className="loading-container">
          <Spinner />
          <p>Loading collaboration space...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isAccessDenied = error.includes('no longer have access');
    
    return (
      <div className="collaboration-space">
        <div className="error-container">
          <h2>{isAccessDenied ? 'Access Denied' : 'Error'}</h2>
          <p>{error}</p>
          {redirectCountdown && (
            <p className="redirect-notice">
              Redirecting to CollaborateHub in {redirectCountdown} seconds...
            </p>
          )}
          <div className="error-actions">
            <button onClick={() => navigate('/collaborate')} className="back-btn">
              {isAccessDenied ? 'Go to CollaborateHub Now' : 'Back to CollaborateHub'}
            </button>
            {!isAccessDenied && (
              <button onClick={() => debouncedFetch(true)} className="retry-btn">
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="collaboration-space">
        <div className="not-found">
          <h2>Space Not Found</h2>
          <p>The collaboration space you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/collaborate')} className="back-btn">
            Back to CollaborateHub
          </button>
        </div>
      </div>
    );
  }

  const userPermission = getUserPermission();

  return (
    <div className="collaboration-space">
      <div className="collaboration-main">
        <SpaceHeader 
          space={space}
          currentUser={user}
          userPermission={userPermission}
          canUserPerformAction={canUserPerformAction}
          onSpaceUpdate={handleSpaceUpdate}
        />

        <div className="collaboration-toolbar">
          <CollaborationTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            userPermission={userPermission}
            space={space}
          />
          
          <div className="toolbar-actions">
            {canLeaveSpace() && (
              <button 
                className="leave-space-btn"
                onClick={() => {
                  console.log('Leave space button clicked');
                  setShowLeaveConfirm(true);
                }}
                title="Leave this space"
                disabled={leaving}
              >
                🚪 Leave Space
              </button>
            )}
            
            <div className="connection-status">
              <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
              <span className="status-text">
                {isConnected ? 'Connected' : 'Reconnecting...'}
              </span>
            </div>
            
            <button 
              className={`notifications-btn ${notifications.length > 0 ? 'has-notifications' : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
              title="Toggle notifications"
            >
              🔔
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>
            
            {loading && (
              <div className="refresh-indicator">
                <span className="spinner-small">⟳</span>
              </div>
            )}
          </div>
        </div>

        <div className="tab-content">
          {activeTab === 'content' && (
            <SpaceContentList 
              key={`content-${spaceId}`}
              spaceId={spaceId} 
              space={space}
              onContentUpdate={handleContentUpdate}
              userPermission={userPermission}
            />
          )}

          {activeTab === 'members' && (
            <MembersList
              key={`members-${spaceId}`}
              space={space}
              currentUser={user}
              userPermission={userPermission}
              canUserPerformAction={canUserPerformAction}
              onSpaceUpdate={handleMemberUpdate}
            />
          )}

          {activeTab === 'requests' && canUserPerformAction('view_content') && (
            <ChangeRequestsList
              key={`requests-${spaceId}`}
              spaceId={spaceId}
              space={space}
              onUpdate={handleSpaceUpdate}
              userPermission={userPermission}
            />
          )}

          {activeTab === 'settings' && canUserPerformAction('manage_space') && (
            <SpaceSettings
              key={`settings-${spaceId}`}
              space={space}
              onUpdate={handleSpaceUpdate}
              onDelete={() => navigate('/collaborate')}
            />
          )}
        </div>
      </div>

      {showNotifications && (
        <div className="notifications-sidebar">
          <NotificationPanel />
        </div>
      )}

      {/* Leave Space Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Leave Collaboration Space</h2>
            </div>
            
            <div className="modal-body">
              <p>
                Are you sure you want to leave <strong>"{space?.title}"</strong>?
              </p>
              <div className="leave-warning">
                <p>⚠️ <strong>Warning:</strong></p>
                <ul>
                  <li>You will lose access to all content in this space</li>
                  <li>You will need to be re-invited to rejoin</li>
                  <li>Any pending contributions will remain but you won't be able to edit them</li>
                </ul>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="confirm-leave-btn danger-btn"
                onClick={handleLeaveSpace}
                disabled={leaving}
              >
                {leaving ? 'Leaving...' : 'Yes, Leave Space'}
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
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

export default CollaborationSpace;