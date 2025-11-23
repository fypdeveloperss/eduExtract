import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, RotateCcw } from 'lucide-react';
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
  const [statsLoading, setStatsLoading] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [stats, setStats] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });

  // Memoized filtered spaces based on both filter and search
  const filteredSpaces = useMemo(() => {
    let filtered = spaces;

    // First apply filter based on selected tab
    if (filter !== 'all' && user) {
      switch (filter) {
        case 'owner':
          filtered = spaces.filter(space => space.ownerId === user.uid);
          break;
        case 'collaborator':
          filtered = spaces.filter(space => 
            space.ownerId !== user.uid && 
            space.collaborators?.some(c => 
              c.userId === user.uid && c.status === 'active'
            )
          );
          break;
        case 'public':
          // Show public spaces that user can discover (not owned by them and not collaborating on)
          filtered = spaces.filter(space => 
            !space.isPrivate && 
            space.ownerId !== user.uid &&
            !space.collaborators?.some(c => 
              c.userId === user.uid && c.status === 'active'
            )
          );
          break;
        default:
          filtered = spaces;
      }
    }

    // Then apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(space =>
        space.title?.toLowerCase().includes(query) ||
        space.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [spaces, filter, searchQuery, user]);

  // Memoized paginated spaces for current page
  const paginatedSpaces = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSpaces.slice(startIndex, endIndex);
  }, [filteredSpaces, currentPage]);

  // Memoized pagination info
  const paginationInfo = useMemo(() => {
    const totalPages = Math.ceil(filteredSpaces.length / itemsPerPage);
    return {
      currentPage,
      totalPages,
      totalCount: filteredSpaces.length,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages
    };
  }, [filteredSpaces.length, currentPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  // Memoized space counts based on actual spaces data
  const spaceCounts = useMemo(() => {
    if (!user || !spaces.length) {
      return {
        all: 0,
        owned: 0,
        collaborating: 0,
        public: 0
      };
    }

    let owned = 0;
    let collaborating = 0;
    let publicSpaces = 0;

    spaces.forEach(space => {
      // Count owned spaces
      if (space.ownerId === user.uid) {
        owned++;
      }
      // Count collaborating spaces (not owned by user but user is a collaborator)
      else if (space.collaborators?.some(c => 
        c.userId === user.uid && c.status === 'active'
      )) {
        collaborating++;
      }
      
      // Count discoverable public spaces (public but not owned/collaborating)
      if (!space.isPrivate && 
          space.ownerId !== user.uid &&
          !space.collaborators?.some(c => 
            c.userId === user.uid && c.status === 'active'
          )) {
        publicSpaces++;
      }
    });

    return {
      all: spaces.length,
      owned,
      collaborating,
      public: publicSpaces
    };
  }, [spaces, user]);

  // Memoized callbacks to prevent unnecessary re-renders
  const fetchSpaces = useCallback(async () => {
    try {
      setLoading(true);
      window.lastSpacesFetch = Date.now();
      
      // Always fetch ALL spaces to get accurate counts (remove pagination from backend)
      const response = await api.get('/api/collaborate/spaces', {
        params: { limit: 1000 }  // Get all spaces, remove page param
      });

      if (response.data.success) {
        setSpaces(response.data.spaces);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching collaboration spaces:', error);
      
      if (error.response?.status === 403) {
        setSpaces([]);
      }
    } finally {
      setLoading(false);
    }
  }, []); // Removed filter dependency since we're not using it in API call

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await api.get('/api/collaborate/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Combined initial fetch to reduce API calls
  const initialFetch = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch both spaces and stats in parallel
      await Promise.all([
        fetchSpaces(),
        fetchStats()
      ]);
    } finally {
      setLoading(false);
    }
  }, [user, fetchSpaces, fetchStats]);

  useEffect(() => {
    initialFetch();
  }, [initialFetch]);

  // Optimized refresh mechanism - less aggressive
  useEffect(() => {
    if (!user) return;

    // Only refresh every 2 minutes instead of 30 seconds
    const refreshInterval = setInterval(() => {
      // Only refresh if page is visible to avoid unnecessary calls
      if (!document.hidden) {
        fetchSpaces();
      }
    }, 120000); // 2 minutes instead of 30 seconds

    // Listen for focus events to refresh when user returns (but not too frequently)
    const handleFocus = () => {
      const now = Date.now();
      // Only refresh if it's been more than 30 seconds since last fetch
      if (!window.lastSpacesFetch || (now - window.lastSpacesFetch > 30000)) {
        fetchSpaces();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchSpaces]); // Removed filter dependency, added fetchSpaces

  // Listen for member removal events
  useEffect(() => {
    const handleMemberRemoved = (event) => {
      const { spaceId } = event.detail;
      
      // Remove the space from the local list
      setSpaces(prevSpaces => prevSpaces.filter(space => space._id !== spaceId));
      
      // Refresh stats
      fetchStats();
    };

    window.addEventListener('memberRemovedFromSpace', handleMemberRemoved);

    return () => {
      window.removeEventListener('memberRemovedFromSpace', handleMemberRemoved);
    };
  }, []);

  // Optimized event handlers
  const handleCreateSpace = useCallback(async (spaceData) => {
    try {
      const response = await api.post('/api/collaborate/spaces', spaceData);
      if (response.data.success) {
        setShowCreateModal(false);
        await Promise.all([fetchSpaces(), fetchStats()]);
      }
    } catch (error) {
      console.error('Error creating space:', error);
      throw error;
    }
  }, [fetchSpaces, fetchStats]);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const handleSpaceClick = useCallback((spaceId) => {
    navigate(`/collaborate/space/${spaceId}`);
  }, [navigate]);

  const handleJoinSpace = useCallback(async (spaceId) => {
    await Promise.all([
      fetchSpaces(),
      fetchStats()
    ]);
  }, [fetchSpaces, fetchStats]);

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
        <div className="header-actions">
          <button 
            onClick={() => navigate('/collaborate/invitations')}
            className="invitations-btn"
          >
            <Mail className="w-4 h-4" />
            <span>Manage Invitations</span>
            {stats.pendingInvites > 0 && (
              <span className="notification-badge">{stats.pendingInvites}</span>
            )}
          </button>
          <button 
            className="refresh-btn"
            onClick={() => fetchSpaces()}
            title="Refresh spaces"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          {lastRefresh && (
            <span className="last-refresh">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button 
            className="create-space-btn"
            onClick={() => setShowCreateModal(true)}
          >
            + Create New Space
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="stats-dashboard">
        {statsLoading ? (
          // Simple skeleton for stats
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="stat-card skeleton">
              <div className="skeleton-number"></div>
              <div className="skeleton-text"></div>
            </div>
          ))
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Filters and Search */}
      <div className="controls-section">
        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All Spaces ({spaceCounts.all})
          </button>
          <button 
            className={filter === 'owner' ? 'active' : ''}
            onClick={() => setFilter('owner')}
          >
            My Spaces ({spaceCounts.owned})
          </button>
          <button 
            className={filter === 'collaborator' ? 'active' : ''}
            onClick={() => setFilter('collaborator')}
          >
            Collaborating ({spaceCounts.collaborating})
          </button>
          <button 
            className={filter === 'public' ? 'active' : ''}
            onClick={() => setFilter('public')}
          >
            Discover Public ({spaceCounts.public})
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
          <div className="spaces-grid loading">
            {/* Show skeleton cards while loading */}
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="space-card-skeleton skeleton"></div>
            ))}
          </div>
        ) : paginatedSpaces.length > 0 ? (
          <>
            <div className="spaces-grid">
              {paginatedSpaces.map(space => (
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
            {paginationInfo.totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={!paginationInfo.hasPrev}
                  onClick={() => handlePageChange(paginationInfo.currentPage - 1)}
                >
                  Previous
                </button>
                
                <span className="page-info">
                  Page {paginationInfo.currentPage} of {paginationInfo.totalPages}
                  {filteredSpaces.length > 0 && (
                    <span className="total-items"> ({filteredSpaces.length} total)</span>
                  )}
                </span>
                
                <button
                  disabled={!paginationInfo.hasNext}
                  onClick={() => handlePageChange(paginationInfo.currentPage + 1)}
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

export default React.memo(CollaborateHub);
