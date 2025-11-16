import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { 
  MessageSquare, BarChart3, Users, Calendar, Flag, 
  Search, Eye, ArrowLeft, TrendingUp, Activity
} from 'lucide-react';

const SmartMentorManagement = () => {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  
  const [analytics, setAnalytics] = useState({
    totalChats: 0,
    activeSessions: 0,
    totalMessages: 0,
    chatsByDate: [],
    activeUsers: []
  });
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    userId: '',
    flagged: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const [activeTab, setActiveTab] = useState('analytics');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    } else if (!adminLoading && isAdmin) {
      fetchAnalytics();
      fetchChats();
    }
  }, [isAdmin, adminLoading, navigate, filters, pagination.page]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/api/admin/smart-mentor/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async () => {
    try {
      setChatsLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.flagged && { flagged: filters.flagged })
      };
      
      const response = await api.get('/api/admin/smart-mentor/logs', { params });
      setChats(response.data.chats);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError('Failed to load chat logs');
    } finally {
      setChatsLoading(false);
    }
  };

  const fetchChatSession = async (sessionId) => {
    try {
      const response = await api.get(`/api/admin/smart-mentor/session/${sessionId}`);
      setSelectedChat(response.data);
    } catch (error) {
      console.error('Error fetching chat session:', error);
      setError('Failed to load chat session');
    }
  };

  const handleFlag = async (sessionId, reason) => {
    try {
      await api.post(`/api/admin/smart-mentor/flag/${sessionId}`, { reason });
      setSuccess('Chat session flagged successfully');
      fetchChats();
      fetchAnalytics();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to flag chat session');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
              Smart Mentor Management
            </h1>
            <p className="text-[#171717cc] dark:text-[#fafafacc]">
              Monitor chatbot conversations and analytics
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

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-[#2E2E2E]">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'analytics'
                ? 'border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                : 'border-transparent text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
            }`}
          >
            <span className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'logs'
                ? 'border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                : 'border-transparent text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
            }`}
          >
            <span className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Logs
            </span>
          </button>
        </nav>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Total Chats</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    {analytics.totalChats.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Active Sessions</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    {analytics.activeSessions.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Total Messages</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    {analytics.totalMessages.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Avg Messages/Chat</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    {analytics.totalChats > 0 
                      ? (analytics.totalMessages / analytics.totalChats).toFixed(1)
                      : 0}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Most Active Users */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
            <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
              Most Active Users
            </h2>
            <div className="space-y-3">
              {analytics.activeUsers.length === 0 ? (
                <p className="text-[#171717cc] dark:text-[#fafafacc]">No active users yet</p>
              ) : (
                analytics.activeUsers.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1f1f1f] rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-[#171717] dark:bg-[#fafafa] rounded-full flex items-center justify-center text-white dark:text-[#171717] font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-[#171717] dark:text-[#fafafa]">
                          {item.user?.name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                          {item.user?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#171717] dark:text-[#fafafa]">
                        {item.messageCount} messages
                      </p>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                        {item.sessionCount} sessions
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                <input
                  type="text"
                  placeholder="Search by user ID..."
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
                />
              </div>

              <select
                value={filters.flagged}
                onChange={(e) => setFilters({ ...filters, flagged: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent"
              >
                <option value="">All Chats</option>
                <option value="true">Flagged Only</option>
                <option value="false">Not Flagged</option>
              </select>
            </div>
          </div>

          {/* Chat List */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f]">
              <h2 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                Chat Sessions ({pagination.total})
              </h2>
            </div>

            {chatsLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
                <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Loading chats...</p>
              </div>
            ) : chats.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-[#171717cc] dark:text-[#fafafacc] opacity-30" />
                <p className="text-[#171717cc] dark:text-[#fafafacc]">No chat sessions found</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
                  {chats.map((chat) => (
                    <div
                      key={chat._id}
                      className={`p-6 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors cursor-pointer ${
                        chat.flagged ? 'bg-red-50 dark:bg-red-900/10' : ''
                      }`}
                      onClick={() => fetchChatSession(chat.sessionId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <MessageSquare className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                            <h3 className="font-semibold text-[#171717] dark:text-[#fafafa]">
                              {chat.user?.name || 'Unknown User'}
                            </h3>
                            {chat.flagged && (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                Flagged
                              </span>
                            )}
                            {chat.isActive && (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-[#171717cc] dark:text-[#fafafacc] space-y-1">
                            <p>Email: {chat.user?.email || 'N/A'}</p>
                            <p>Messages: {chat.messageCount} • Session: {chat.sessionId}</p>
                            <p>Last updated: {formatDate(chat.updatedAt)}</p>
                            {chat.lastMessage && (
                              <p className="mt-2 p-2 bg-gray-50 dark:bg-[#1f1f1f] rounded text-xs">
                                Last: {chat.lastMessage.content?.substring(0, 100)}...
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchChatSession(chat.sessionId);
                            }}
                            className="flex items-center px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors font-medium"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            View
                          </button>
                          {!chat.flagged && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFlag(chat.sessionId, 'Admin review');
                              }}
                              className="flex items-center px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                            >
                              <Flag className="w-4 h-4 mr-1.5" />
                              Flag
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
      )}

      {/* Chat Detail Modal */}
      {selectedChat && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedChat(null)}
        >
          <div
            className="bg-white dark:bg-[#171717] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-[#2E2E2E]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f]">
              <div>
                <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                  Chat Session Details
                </h3>
                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                  {selectedChat.user?.name || 'Unknown User'} ({selectedChat.user?.email || 'N/A'})
                </p>
              </div>
              <button
                onClick={() => setSelectedChat(null)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-[#2E2E2E] rounded-lg transition-colors text-[#171717] dark:text-[#fafafa]"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {selectedChat.messages?.map((message, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                        : 'bg-gray-50 dark:bg-[#1f1f1f] mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase">
                        {message.role}
                      </span>
                      <span className="text-xs text-[#171717cc] dark:text-[#fafafacc]">
                        {formatDate(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-[#171717] dark:text-[#fafafa] whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartMentorManagement;

