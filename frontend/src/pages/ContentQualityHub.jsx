import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { 
  FileText, Flag, CheckCircle, XCircle, Search, Filter, 
  Trash2, AlertTriangle, ArrowLeft, BarChart3, Package
} from 'lucide-react';

const ContentQualityHub = () => {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  
  const [metrics, setMetrics] = useState({
    totalContent: 0,
    flaggedContent: 0,
    contentByType: {},
    averageAge: 0
  });
  
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedContent, setSelectedContent] = useState([]);
  const [filters, setFilters] = useState({
    type: '',
    flagged: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    } else if (!adminLoading && isAdmin) {
      fetchMetrics();
      fetchContent();
    }
  }, [isAdmin, adminLoading, navigate, filters, pagination.page]);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/api/admin/content-quality/metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setError('Failed to load metrics');
    }
  };

  const fetchContent = async () => {
    try {
      setContentLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.type && { type: filters.type }),
        ...(filters.flagged && { flagged: filters.flagged })
      };
      
      const response = await api.get('/api/admin/content-quality/review', { params });
      setContent(response.data.content);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching content:', error);
      setError('Failed to load content');
    } finally {
      setContentLoading(false);
      setLoading(false);
    }
  };

  const handleFlag = async (contentId, reason) => {
    try {
      await api.post(`/api/admin/content-quality/flag/${contentId}`, { reason });
      setSuccess('Content flagged successfully');
      // Refresh both content and metrics
      await Promise.all([fetchContent(), fetchMetrics()]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to flag content');
    }
  };

  const handleUnflag = async (contentId) => {
    try {
      await api.post('/api/admin/content-quality/bulk-action', {
        contentIds: [contentId],
        action: 'unflag'
      });
      setSuccess('Content unflagged successfully');
      await Promise.all([fetchContent(), fetchMetrics()]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to unflag content');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedContent.length === 0) {
      setError('Please select content to perform action');
      return;
    }

    try {
      await api.post('/api/admin/content-quality/bulk-action', {
        contentIds: selectedContent,
        action,
        reason: action === 'flag' ? 'Bulk flagged by admin' : ''
      });
      setSuccess(`Bulk ${action} completed successfully`);
      setSelectedContent([]);
      // Refresh both content and metrics
      await Promise.all([fetchContent(), fetchMetrics()]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(`Failed to perform bulk ${action}`);
    }
  };

  const toggleSelect = (contentId) => {
    setSelectedContent(prev =>
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getContentTypeIcon = (type) => {
    const icons = {
      blog: '📝',
      slides: '📊',
      flashcards: '🎴',
      quiz: '❓',
      summary: '📄'
    };
    return icons[type] || '📄';
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
          <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mb-4">Access Denied</h1>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">You don't have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">
              Content Quality Hub
            </h1>
            <p className="text-[#171717cc] dark:text-[#fafafacc]">
              Review and manage AI-generated content quality
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center px-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] text-[#171717] dark:text-[#fafafa] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Total Content</p>
              <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                {metrics.totalContent.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div 
          className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => {
            setFilters({ ...filters, flagged: 'true' });
            setPagination({ ...pagination, page: 1 });
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Flagged Content</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                {metrics.flaggedContent.toLocaleString()}
              </p>
              <p className="text-xs text-[#171717cc] dark:text-[#fafafacc] mt-1">Click to view</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Flag className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Content Types</p>
              <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                {Object.keys(metrics.contentByType || {}).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Quality Score</p>
              <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                {metrics.flaggedContent > 0 
                  ? ((1 - metrics.flaggedContent / metrics.totalContent) * 100).toFixed(1)
                  : 100}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Bulk Actions */}
      <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
            <input
              type="text"
              placeholder="Search content..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
            />
          </div>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="blog">Blog</option>
            <option value="summary">Summary</option>
            <option value="quiz">Quiz</option>
            <option value="flashcards">Flashcards</option>
            <option value="slides">Slides</option>
          </select>

          <select
            value={filters.flagged}
            onChange={(e) => {
              setFilters({ ...filters, flagged: e.target.value });
              setPagination({ ...pagination, page: 1 });
            }}
            className="px-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent"
          >
            <option value="">All Content</option>
            <option value="true">Flagged Only ({metrics.flaggedContent})</option>
            <option value="false">Not Flagged</option>
          </select>
        </div>

        {selectedContent.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#1f1f1f] rounded-lg">
            <span className="text-sm font-medium text-[#171717] dark:text-[#fafafa]">
              {selectedContent.length} selected
            </span>
            <button
              onClick={() => handleBulkAction('flag')}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Flag Selected
            </button>
            <button
              onClick={() => handleBulkAction('unflag')}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Unflag Selected
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedContent([])}
              className="px-3 py-1.5 bg-gray-200 dark:bg-[#2E2E2E] text-[#171717] dark:text-[#fafafa] rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-[#3E3E3E] transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Content List */}
      <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f]">
          <h2 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
            Content Review ({pagination.total})
          </h2>
        </div>

        {contentLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
            <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Loading content...</p>
          </div>
        ) : content.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[#171717cc] dark:text-[#fafafacc] opacity-30" />
            <p className="text-[#171717cc] dark:text-[#fafafacc]">No content found</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
              {content
                .filter(item => 
                  !filters.search || 
                  item.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
                  item.type?.toLowerCase().includes(filters.search.toLowerCase())
                )
                .map((item) => (
                <div
                  key={item._id}
                  className={`p-6 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors ${
                    item.flagged ? 'bg-red-50 dark:bg-red-900/10' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedContent.includes(item._id)}
                      onChange={() => toggleSelect(item._id)}
                      className="mt-1 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{getContentTypeIcon(item.type)}</span>
                        <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                          {item.title || 'Untitled'}
                        </h3>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          item.flagged
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                          {item.flagged ? 'Flagged' : 'Approved'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-[#2E2E2E] text-[#171717] dark:text-[#fafafa] capitalize">
                          {item.type}
                        </span>
                      </div>
                      <div className="text-sm text-[#171717cc] dark:text-[#fafafacc] space-y-1">
                        <p>User: {item.user?.name || 'Unknown'} ({item.user?.email || 'N/A'})</p>
                        <p>Created: {formatDate(item.createdAt)}</p>
                        {item.flagged && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-red-700 dark:text-red-300 font-medium text-xs mb-1">
                              ⚠️ Flagged Content
                            </p>
                            {item.flagReason && (
                              <p className="text-red-600 dark:text-red-400 text-xs">
                                Reason: {item.flagReason}
                              </p>
                            )}
                            {item.flaggedAt && (
                              <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                                Flagged: {formatDate(item.flaggedAt)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!item.flagged ? (
                        <button
                          onClick={() => handleFlag(item._id, 'Quality review')}
                          className="flex items-center px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                        >
                          <Flag className="w-4 h-4 mr-1.5" />
                          Flag
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnflag(item._id)}
                          className="flex items-center px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium"
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          Unflag
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-[#2E2E2E] flex items-center justify-between">
                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContentQualityHub;

