import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import CollaborationSpaceCard from '../components/CollaborationSpaceCard';
import CreateSpaceModal from '../components/CreateSpaceModal';
import Spinner from '../components/Spinner';
import './CollaborateHub.css';

const CollaborateHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState([]);
  const [stats, setStats] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, owner, collaborator, public
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });

  useEffect(() => {
    if (user) {
      fetchSpaces();
      fetchStats();
    }
  }, [user, filter]);

  const fetchSpaces = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get('/api/collaborate/spaces', {
        params: { page, limit: 12, role: filter }
      });

      if (response.data.success) {
        setSpaces(response.data.spaces);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching collaboration spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/collaborate/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateSpace = async (spaceData) => {
    try {
      const response = await api.post('/api/collaborate/spaces', spaceData);
      if (response.data.success) {
        setShowCreateModal(false);
        fetchSpaces();
        fetchStats();
      }
    } catch (error) {
      console.error('Error creating space:', error);
      throw error;
    }
  };

  const handlePageChange = (newPage) => {
    fetchSpaces(newPage);
  };

  const handleSpaceClick = (spaceId) => {
    navigate(`/collaborate/space/${spaceId}`);
  };

  const handleJoinSpace = async (spaceId) => {
    // Refresh the spaces list after joining
    await fetchSpaces(pagination.currentPage);
    await fetchStats();
  };

  const filteredSpaces = spaces.filter(space =>
    space.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="collaborate-hub">
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>Please log in to access CollaborateHub</p>
        </div>
      </div>
    );
  }

  return (
    <div className="collaborate-hub">
      {/* Header Section */}
      <div className="hub-header">
        <div className="header-content">
          <h1>CollaborateHub</h1>
          <p>Collaborate on educational content with your peers</p>
        </div>
        <button 
          className="create-space-btn"
          onClick={() => setShowCreateModal(true)}
        >
          + Create New Space
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="stats-dashboard">
        <div className="stat-card">
          <h3>{stats.ownedSpaces || 0}</h3>
          <p>Owned Spaces</p>
        </div>
        <div className="stat-card">
          <h3>{stats.collaboratingSpaces || 0}</h3>
          <p>Collaborating Spaces</p>
        </div>
        <div className="stat-card">
          <h3>{stats.publicSpaces || 0}</h3>
          <p>Public Spaces</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalContent || 0}</h3>
          <p>Total Content</p>
        </div>
        <div className="stat-card">
          <h3>{stats.pendingInvites || 0}</h3>
          <p>Pending Invites</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="controls-section">
        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All Spaces ({stats.totalSpaces || 0})
          </button>
          <button 
            className={filter === 'owner' ? 'active' : ''}
            onClick={() => setFilter('owner')}
          >
            My Spaces ({stats.ownedSpaces || 0})
          </button>
          <button 
            className={filter === 'collaborator' ? 'active' : ''}
            onClick={() => setFilter('collaborator')}
          >
            Collaborating ({stats.collaboratingSpaces || 0})
          </button>
          <button 
            className={filter === 'public' ? 'active' : ''}
            onClick={() => setFilter('public')}
          >
            Discover Public ({stats.publicSpaces || 0})
          </button>
        </div>

        <div className="search-section">
          <input
            type="text"
            placeholder="Search spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Spaces Grid */}
      <div className="spaces-section">
        {loading ? (
          <div className="loading-container">
            <Spinner />
          </div>
        ) : filteredSpaces.length > 0 ? (
          <>
            <div className="spaces-grid">
              {filteredSpaces.map(space => (
                <CollaborationSpaceCard
                  key={space._id}
                  space={space}
                  currentUser={user}
                  onClick={() => handleSpaceClick(space._id)}
                  onJoinSpace={handleJoinSpace}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={!pagination.hasPrev}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                >
                  Previous
                </button>
                
                <span className="page-info">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                
                <button
                  disabled={!pagination.hasNext}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h3>No collaboration spaces found</h3>
            <p>
              {filter === 'all' 
                ? "Create your first collaboration space to get started!"
                : filter === 'owner'
                ? "You haven't created any spaces yet."
                : "You're not collaborating on any spaces yet."
              }
            </p>
            {filter === 'all' && (
              <button 
                className="create-space-btn"
                onClick={() => setShowCreateModal(true)}
              >
                Create Your First Space
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button onClick={() => navigate('/collaborate/discover')}>
          🔍 Discover Public Spaces
        </button>
        <button 
          onClick={() => navigate('/collaborate/invitations')}
          className="invitations-btn"
        >
          📧 Manage Invitations
          {stats.pendingInvites > 0 && (
            <span className="notification-badge">{stats.pendingInvites}</span>
          )}
        </button>
        <button onClick={() => navigate('/collaborate/requests')}>
          📝 Change Requests
        </button>
      </div>

      {/* Create Space Modal */}
      {showCreateModal && (
        <CreateSpaceModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSpace}
        />
      )}
    </div>
  );
};

export default CollaborateHub;
