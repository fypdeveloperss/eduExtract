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
import JoinRequestsTab from '../components/JoinRequestsTab';
import SpaceSettings from '../components/SpaceSettings';
import NotificationPanel from '../components/NotificationPanel';
import ContentEditor from '../components/ContentEditor';
import CollaborationSpaceChat from '../components/CollaborationSpaceChat';
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
  const [editingContent, setEditingContent] = useState(null);
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [contentRefreshKey, setContentRefreshKey] = useState(0);
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  
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

  // Socket listeners for join request notifications
  useEffect(() => {
    if (!user || !space || !isConnected) return;

    // Only space owners should listen for new join request notifications
    const isOwner = space.ownerId === user.uid;
    if (!isOwner) return;

    const handleNewJoinRequest = (data) => {
      console.log('New join request received:', data);
      
      addNotification({
        type: 'info',
        message: `New join request from ${data.requesterName} for "${data.spaceName}"`,
        timestamp: Date.now()
      });

      // Refresh space data to update badge count
      debouncedFetch(true);
    };

    const handleJoinRequestStatusChange = () => {
      // Refresh space data when any join request status changes
      debouncedFetch(true);
    };

    // Set up socket listeners through collaboration context
    if (window.socket) {
      window.socket.on('new-join-request', handleNewJoinRequest);
      window.socket.on('join-request-approved', handleJoinRequestStatusChange);
      window.socket.on('join-request-rejected', handleJoinRequestStatusChange);
    }

    return () => {
      if (window.socket) {
        window.socket.off('new-join-request', handleNewJoinRequest);
        window.socket.off('join-request-approved', handleJoinRequestStatusChange);
        window.socket.off('join-request-rejected', handleJoinRequestStatusChange);
      }
    };
  }, [user?.uid, space?.ownerId, isConnected, addNotification, debouncedFetch]);

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
    setContentRefreshKey(prev => prev + 1);
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
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">Authentication Required</h2>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">Please log in to access this collaboration space</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !space) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <Spinner />
            <p className="text-[#171717cc] dark:text-[#fafafacc] text-lg">Loading collaboration space...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isAccessDenied = error.includes('no longer have access');
    
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-3">{isAccessDenied ? 'Access Denied' : 'Error'}</h2>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            {redirectCountdown && (
              <p className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4 text-yellow-800 dark:text-yellow-200 text-sm">
                Redirecting to CollaborateHub in {redirectCountdown} seconds...
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => navigate('/collaborate')} 
                className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
              >
                {isAccessDenied ? 'Go to CollaborateHub Now' : 'Back to CollaborateHub'}
              </button>
              {!isAccessDenied && (
                <button 
                  onClick={() => debouncedFetch(true)} 
                  className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-all text-sm font-semibold"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">Space Not Found</h2>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">The collaboration space you're looking for doesn't exist or has been removed.</p>
            <button 
              onClick={() => navigate('/collaborate')} 
              className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
            >
              Back to CollaborateHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userPermission = getUserPermission();

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        <SpaceHeader 
          space={space}
          currentUser={user}
          userPermission={userPermission}
          canUserPerformAction={canUserPerformAction}
          onSpaceUpdate={handleSpaceUpdate}
        />

        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <CollaborationTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              userPermission={userPermission}
              space={space}
              currentUser={user}
            />
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* AI Chat Button */}
              <button 
                className={`px-4 py-2 rounded-lg transition-all text-sm font-semibold ${
                  showChat 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
                onClick={() => {
                  if (showChat) {
                    setShowChat(false);
                  } else {
                    setShowChat(true);
                    setChatMinimized(false);
                  }
                }}
                title="AI Assistant for this space"
              >
                🤖 Space AI
              </button>
              
              {canLeaveSpace() && (
                <button 
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
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
              
              <div className="flex items-center gap-2 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                <span>
                  {isConnected ? 'Connected' : 'Reconnecting...'}
                </span>
              </div>
              
              <button 
                className={`relative px-4 py-2 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-all text-sm font-semibold ${notifications.length > 0 ? 'border-[#171717] dark:border-[#fafafa]' : ''}`}
                onClick={() => setShowNotifications(!showNotifications)}
                title="Toggle notifications"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {loading && (
                <div className="w-5 h-5 border-2 border-[#171717] dark:border-[#fafafa] border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </div>

          <div>
          {activeTab === 'content' && (
            <SpaceContentList 
              key={`content-${spaceId}-${contentRefreshKey}`}
              spaceId={spaceId} 
              space={space}
              onContentUpdate={handleContentUpdate}
              onEditContent={(content) => {
                setEditingContent(content);
                setShowContentEditor(true);
              }}
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

          {activeTab === 'requests' && (canUserPerformAction('approve_changes') || space?.ownerId === user?.uid) && (
            <ChangeRequestsList
              key={`requests-${spaceId}`}
              spaceId={spaceId}
              space={space}
              onUpdate={handleContentUpdate}
              userPermission={userPermission}
            />
          )}

          {activeTab === 'join-requests' && (canUserPerformAction('manage_space') || space?.ownerId === user?.uid) && (
            <JoinRequestsTab
              key={`join-requests-${spaceId}`}
              spaceId={spaceId}
              space={space}
              onUpdate={handleSpaceUpdate}
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
      </div>

      {showNotifications && (
        <div className="fixed right-4 top-20 w-80 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg z-50">
          <NotificationPanel />
        </div>
      )}

      {/* Leave Space Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#fafafa1a]">
              <h2 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">Leave Collaboration Space</h2>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
                Are you sure you want to leave <strong>"{space?.title}"</strong>?
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-200 font-semibold mb-2 text-sm">⚠️ <strong>Warning:</strong></p>
                <ul className="text-yellow-800 dark:text-yellow-200 text-sm space-y-1 list-disc list-inside">
                  <li>You will lose access to all content in this space</li>
                  <li>You will need to be re-invited to rejoin</li>
                  <li>Any pending contributions will remain but you won't be able to edit them</li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-[#fafafa1a] flex gap-3 justify-end">
              <button
                className="px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold"
                onClick={handleLeaveSpace}
                disabled={leaving}
              >
                {leaving ? 'Leaving...' : 'Yes, Leave Space'}
              </button>
              <button
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold"
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Editor Modal */}
      {showContentEditor && editingContent && (
        <ContentEditor
          content={editingContent}
          spaceId={spaceId}
          onClose={() => {
            setShowContentEditor(false);
            setEditingContent(null);
          }}
          onSubmitRequest={() => {
            // Refresh the content list after submitting change request
            handleContentUpdate();
          }}
        />
      )}

      {/* Collaboration Space AI Chat */}
      <CollaborationSpaceChat
        spaceId={spaceId}
        spaceName={space?.title || 'Collaboration Space'}
        isVisible={showChat}
        onClose={() => setShowChat(false)}
        onMinimize={() => setChatMinimized(!chatMinimized)}
        isMinimized={chatMinimized}
      />
    </div>
  );
};

export default CollaborationSpace;