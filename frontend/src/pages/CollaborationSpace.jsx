import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import CollaborationTabs from '../components/CollaborationTabs';
import SpaceHeader from '../components/SpaceHeader';
import ContentList from '../components/ContentList';
import MembersList from '../components/MembersList';
import ChangeRequestsList from '../components/ChangeRequestsList';
import SpaceSettings from '../components/SpaceSettings';
import Spinner from '../components/Spinner';
import './CollaborationSpace.css';

const CollaborationSpace = () => {
  const { spaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [space, setSpace] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && spaceId) {
      fetchSpace();
    }
  }, [user, spaceId]);

  const fetchSpace = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/collaborate/spaces/${spaceId}`);
      
      if (response.data.success) {
        setSpace(response.data.space);
      }
    } catch (error) {
      console.error('Error fetching space:', error);
      
      if (error.response?.status === 404) {
        setError('Collaboration space not found');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to access this space');
      } else {
        setError('Failed to load collaboration space');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSpaceUpdate = (updatedSpace) => {
    setSpace(updatedSpace);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const getUserPermission = () => {
    if (!space || !user) return null;
    
    if (space.ownerId === user.uid) return 'admin';
    
    const collaborator = space.collaborators?.find(c => c.userId === user.uid && c.status === 'active');
    return collaborator?.permission || null;
  };

  const canUserPerformAction = (action) => {
    const permission = getUserPermission();
    if (!permission) return false;

    const permissions = {
      view: ['view_content', 'view_space'],
      edit: ['view_content', 'view_space', 'create_content', 'edit_content', 'comment'],
      admin: ['view_content', 'view_space', 'create_content', 'edit_content', 'comment', 
              'invite_users', 'manage_permissions', 'delete_content', 'approve_changes', 'manage_space']
    };

    return permissions[permission]?.includes(action) || false;
  };

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

  if (loading) {
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
    return (
      <div className="collaboration-space">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => navigate('/collaborate')} className="back-btn">
              Back to CollaborateHub
            </button>
            <button onClick={fetchSpace} className="retry-btn">
              Try Again
            </button>
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

  return (
    <div className="collaboration-space">
      <SpaceHeader 
        space={space}
        currentUser={user}
        userPermission={getUserPermission()}
        canUserPerformAction={canUserPerformAction}
        onSpaceUpdate={handleSpaceUpdate}
      />

      <CollaborationTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        userPermission={getUserPermission()}
        space={space}
      />

      <div className="tab-content">
        {activeTab === 'content' && (
          <ContentList
            spaceId={spaceId}
            space={space}
            currentUser={user}
            userPermission={getUserPermission()}
            canUserPerformAction={canUserPerformAction}
          />
        )}

        {activeTab === 'members' && (
          <MembersList
            space={space}
            currentUser={user}
            userPermission={getUserPermission()}
            canUserPerformAction={canUserPerformAction}
            onSpaceUpdate={handleSpaceUpdate}
          />
        )}

        {activeTab === 'requests' && canUserPerformAction('view_content') && (
          <ChangeRequestsList
            spaceId={spaceId}
            selectedContent={null}
          />
        )}

        {activeTab === 'settings' && canUserPerformAction('manage_space') && (
          <SpaceSettings
            space={space}
            onUpdate={handleSpaceUpdate}
            onDelete={() => navigate('/collaborate')}
          />
        )}
      </div>
    </div>
  );
};

export default CollaborationSpace;
