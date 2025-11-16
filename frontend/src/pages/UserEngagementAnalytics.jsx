import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { 
  Users, TrendingUp, Activity, Calendar, BarChart3, 
  MessageSquare, FileText, ArrowLeft, Search, User
} from 'lucide-react';

const UserEngagementAnalytics = () => {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsers: { today: 0, thisWeek: 0, thisMonth: 0 },
    featureUsage: {},
    contentUsageByType: [],
    retention: {},
    loginPatterns: []
  });
  
  const [userActivity, setUserActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    } else if (!adminLoading && isAdmin) {
      fetchMetrics();
      fetchUserActivity();
    }
  }, [isAdmin, adminLoading, navigate, pagination.page]);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/api/admin/user-engagement/metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivity = async () => {
    try {
      setActivityLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      const response = await api.get('/api/admin/user-engagement/activity', { params });
      setUserActivity(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      setError('Failed to load user activity');
    } finally {
      setActivityLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getContentTypeCount = (contentByType, type) => {
    return contentByType.filter(t => t === type).length;
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
              User Engagement Analytics
            </h1>
            <p className="text-[#171717cc] dark:text-[#fafafacc]">
              Track user behavior, feature usage, and engagement patterns
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

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-[#2E2E2E]">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                : 'border-transparent text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
            }`}
          >
            <span className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'activity'
                ? 'border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                : 'border-transparent text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
            }`}
          >
            <span className="flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              User Activity
            </span>
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* User Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Total Users</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    {metrics.totalUsers.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Active Users</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    {metrics.activeUsers.toLocaleString()}
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
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">New This Month</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    {metrics.newUsers.thisMonth.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Retention Rate</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    {metrics.retention.retentionRate}%
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature Usage */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
            <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
              Feature Usage
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                  <span className="font-medium text-[#171717] dark:text-[#fafafa]">Content Generations</span>
                </div>
                <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {metrics.featureUsage.contentGenerations?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                  Avg: {metrics.featureUsage.averageContentPerUser || 0} per user
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <MessageSquare className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                  <span className="font-medium text-[#171717] dark:text-[#fafafa]">Chat Sessions</span>
                </div>
                <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {metrics.featureUsage.chatSessions?.toLocaleString() || 0}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Users className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                  <span className="font-medium text-[#171717] dark:text-[#fafafa]">Retained Users</span>
                </div>
                <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {metrics.retention.retainedUsers?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                  Last 30 days
                </p>
              </div>
            </div>
          </div>

          {/* Content Usage by Type */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
            <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
              Content Usage by Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {metrics.contentUsageByType.map((item, index) => (
                <div key={index} className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                  <p className="font-semibold text-[#171717] dark:text-[#fafafa] capitalize mb-2">
                    {item.type}
                  </p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                    {item.userCount}
                  </p>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                    {item.totalCount} total
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* New Users Timeline */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
            <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
              New Users
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">Today</p>
                <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {metrics.newUsers.today}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">This Week</p>
                <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {metrics.newUsers.thisWeek}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">This Month</p>
                <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {metrics.newUsers.thisMonth}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f]">
            <h2 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
              User Activity Details ({pagination.total})
            </h2>
          </div>

          {activityLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
              <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Loading activity...</p>
            </div>
          ) : userActivity.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-16 h-16 mx-auto mb-4 text-[#171717cc] dark:text-[#fafafacc] opacity-30" />
              <p className="text-[#171717cc] dark:text-[#fafafacc]">No user activity found</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
                {userActivity.map((user) => (
                  <div key={user._id} className="p-6 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-[#171717] dark:bg-[#fafafa] rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white dark:text-[#171717]" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#171717] dark:text-[#fafafa]">
                              {user.name || 'Unknown User'}
                            </h3>
                            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                              {user.email || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                            <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">
                              Total Content
                            </p>
                            <p className="text-lg font-bold text-[#171717] dark:text-[#fafafa]">
                              {user.activity?.totalContent || 0}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                            <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">
                              Chat Sessions
                            </p>
                            <p className="text-lg font-bold text-[#171717] dark:text-[#fafafa]">
                              {user.activity?.totalChats || 0}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                            <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">
                              Messages
                            </p>
                            <p className="text-lg font-bold text-[#171717] dark:text-[#fafafa]">
                              {user.activity?.totalMessages || 0}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                            <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">
                              Last Login
                            </p>
                            <p className="text-xs font-bold text-[#171717] dark:text-[#fafafa]">
                              {formatDate(user.lastLogin)}
                            </p>
                          </div>
                        </div>

                        {user.activity?.contentByType && user.activity.contentByType.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                              Content Breakdown:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {['blog', 'summary', 'quiz', 'flashcards', 'slides'].map((type) => {
                                const count = getContentTypeCount(user.activity.contentByType, type);
                                if (count === 0) return null;
                                return (
                                  <span
                                    key={type}
                                    className="px-2.5 py-1 bg-gray-100 dark:bg-[#2E2E2E] text-[#171717] dark:text-[#fafafa] rounded-lg text-xs font-medium capitalize"
                                  >
                                    {type}: {count}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
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
      )}
    </div>
  );
};

export default UserEngagementAnalytics;

