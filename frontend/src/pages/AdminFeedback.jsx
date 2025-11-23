import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Filter, 
  Search, 
  Eye, 
  MessageCircle, 
  Clock, 
  User, 
  Star,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowUpDown,
  MoreVertical,
  Plus,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../utils/axios';

const AdminFeedback = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({
    overview: { totalFeedback: 0, pendingCount: 0, resolvedCount: 0, avgRating: 0 },
    byCategory: [],
    byPriority: [],
    dailyTrend: []
  });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filters and pagination
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'dismissed', label: 'Dismissed' }
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'bug_report', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'general_feedback', label: 'General Feedback' },
    { value: 'user_experience', label: 'User Experience' },
    { value: 'content_quality', label: 'Content Quality' },
    { value: 'performance_issue', label: 'Performance Issue' },
    { value: 'other', label: 'Other' }
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  useEffect(() => {
    fetchFeedback();
    fetchStats();
  }, [filters, pagination.page, sortBy, sortOrder]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });
      
      const token = await user.getIdToken();
      const response = await api.get(`/api/feedback/admin?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFeedback(response.data.feedback);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await user.getIdToken();
      const response = await api.get('/api/feedback/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch feedback stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const viewFeedback = async (feedbackId) => {
    try {
      const token = await user.getIdToken();
      const response = await api.get(`/api/feedback/admin/${feedbackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedFeedback(response.data);
      setNewStatus(response.data.status);
      setNewPriority(response.data.priority);
      setResponse('');
      setShowFeedbackModal(true);
    } catch (error) {
      console.error('Failed to fetch feedback details:', error);
    }
  };

  const updateFeedback = async () => {
    if (!selectedFeedback) return;
    
    try {
      setActionLoading(true);
      const token = await user.getIdToken();
      
      await api.put(`/api/feedback/admin/${selectedFeedback._id}/status`, {
        status: newStatus,
        response: response.trim() || null,
        priority: newPriority
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowFeedbackModal(false);
      fetchFeedback();
      fetchStats();
      showSuccess('Feedback updated successfully!');
    } catch (error) {
      console.error('Failed to update feedback:', error);
      showError('Failed to update feedback. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
      in_progress: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
      resolved: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      dismissed: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
      high: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
      critical: 'text-red-600 bg-red-100 dark:bg-red-900/30'
    };
    return colors[priority] || 'text-gray-600 bg-gray-100';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      bug_report: AlertTriangle,
      feature_request: Plus,
      general_feedback: MessageCircle,
      user_experience: User,
      content_quality: Star,
      performance_issue: Clock,
      other: MessageSquare
    };
    return icons[category] || MessageSquare;
  };

  if (loading && feedback.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#171717] rounded-xl p-6 border border-gray-200 dark:border-[#2E2E2E]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Total Feedback</p>
              <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                {stats.overview.totalFeedback}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#171717] rounded-xl p-6 border border-gray-200 dark:border-[#2E2E2E]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.overview.pendingCount}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#171717] rounded-xl p-6 border border-gray-200 dark:border-[#2E2E2E]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Resolved</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.overview.resolvedCount}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#171717] rounded-xl p-6 border border-gray-200 dark:border-[#2E2E2E]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Avg Rating</p>
              <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                {stats.overview.avgRating ? stats.overview.avgRating.toFixed(1) : 'N/A'}
              </p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-[#171717] rounded-xl p-6 border border-gray-200 dark:border-[#2E2E2E]">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">
            Feedback Management
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
          <input
            type="text"
            placeholder="Search feedback..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Options */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 dark:border-[#2E2E2E] pt-4"
          >
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafa]"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafa]"
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafa]"
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </motion.div>
        )}
      </div>

      {/* Feedback Table */}
      <div className="bg-white dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#1E1E1E]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('submittedAt')}
                    className="flex items-center gap-1 hover:text-[#171717] dark:hover:text-[#fafafa]"
                  >
                    Date
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                  User & Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
              {feedback.map((item) => {
                const CategoryIcon = getCategoryIcon(item.category);
                return (
                  <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-[#1E1E1E]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#171717] dark:text-[#fafafa]">
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-[#171717] dark:text-[#fafafa]">
                          {item.name}
                        </div>
                        <div className="text-[#171717cc] dark:text-[#fafafacc] truncate max-w-xs">
                          {item.subject}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                        <span className="text-sm text-[#171717] dark:text-[#fafafa] capitalize">
                          {item.category.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-[#171717] dark:text-[#fafafa]">
                            {item.rating}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => viewFeedback(item._id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-[#2E2E2E]">
            <div className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border border-gray-200 dark:border-[#2E2E2E] rounded-md hover:bg-gray-50 dark:hover:bg-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 text-sm border border-gray-200 dark:border-[#2E2E2E] rounded-md hover:bg-gray-50 dark:hover:bg-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Detail Modal */}
      {showFeedbackModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#171717] rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">
                Feedback Details
              </h2>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg"
              >
                <XCircle className="w-5 h-5 text-[#171717] dark:text-[#fafafa]" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Feedback Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-[#171717] dark:text-[#fafafa] mb-3">User Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedFeedback.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedFeedback.email}</p>
                    <p><span className="font-medium">Submitted:</span> {new Date(selectedFeedback.submittedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-[#171717] dark:text-[#fafafa] mb-3">Feedback Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Category:</span> {selectedFeedback.category.replace('_', ' ')}</p>
                    <p><span className="font-medium">Rating:</span> {selectedFeedback.rating || 'Not rated'}</p>
                  </div>
                </div>
              </div>

              {/* Subject and Message */}
              <div>
                <h3 className="font-medium text-[#171717] dark:text-[#fafafa] mb-2">Subject</h3>
                <p className="text-[#171717] dark:text-[#fafafa] bg-gray-50 dark:bg-[#1E1E1E] p-3 rounded-lg">
                  {selectedFeedback.subject}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-[#171717] dark:text-[#fafafa] mb-2">Message</h3>
                <div className="text-[#171717] dark:text-[#fafafa] bg-gray-50 dark:bg-[#1E1E1E] p-4 rounded-lg whitespace-pre-wrap">
                  {selectedFeedback.message}
                </div>
              </div>

              {/* Admin Actions */}
              <div className="border-t border-gray-200 dark:border-[#2E2E2E] pt-6">
                <h3 className="font-medium text-[#171717] dark:text-[#fafafa] mb-4">Admin Actions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                      Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafa]"
                    >
                      {statusOptions.slice(1).map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                      Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafa]"
                    >
                      {priorityOptions.slice(1).map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                    Response (Optional)
                  </label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Add a response to the user..."
                    rows={4}
                    className="w-full px-3 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateFeedback}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Update Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;