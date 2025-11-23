import React, { useState, useEffect } from "react";
import { useAuth } from "../context/FirebaseAuthContext";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";
import AdminFeedback from "./AdminFeedback";

const Admin = () => {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  
  // Stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalContent: 0,
    todayActivity: 0,
    flaggedContent: 0,
    pendingReviews: 0
  });
  
  // AI Performance metrics
  const [aiMetrics, setAiMetrics] = useState({
    totalGenerations: 0,
    successRate: 0,
    averageResponseTime: 0,
    totalTokensUsed: 0,
    errorRate: 0,
    byContentType: {
      summary: { count: 0, success: 0, avgTime: 0 },
      blog: { count: 0, success: 0, avgTime: 0 },
      quiz: { count: 0, success: 0, avgTime: 0 },
      flashcards: { count: 0, success: 0, avgTime: 0 },
      slides: { count: 0, success: 0, avgTime: 0 }
    }
  });
  
  // System Analytics
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    contentTrends: [],
    activityMetrics: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    }
  });
  
  // Flagged Content
  const [flaggedContent, setFlaggedContent] = useState([]);
  
  // Recent Activity
  const [recentActivity, setRecentActivity] = useState([]);
  
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    } else if (!adminLoading && isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchDashboardData = async () => {
    try {
      setStatsLoading(true);
      
      // Fetch basic stats
      const statsResponse = await api.get('/api/admin/stats');
      const { users, content, admins } = statsResponse.data;
      
      setStats({
        totalUsers: users?.totalUsers || 0,
        totalContent: content?.totalContent || 0,
        todayActivity: content?.todayContent || 0,
        flaggedContent: content?.flaggedContent || 0,
        pendingReviews: content?.pendingReviews || 0
      });
      
      // Fetch AI performance metrics
      try {
        const aiResponse = await api.get('/api/admin/ai-metrics');
        setAiMetrics(aiResponse.data);
      } catch (error) {
        console.error('Error fetching AI metrics:', error);
        // Set defaults if endpoint doesn't exist yet
      }
      
      // Fetch system analytics
      try {
        const analyticsResponse = await api.get('/api/admin/analytics');
        setAnalytics(analyticsResponse.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
      
      // Fetch flagged content
      try {
        const flaggedResponse = await api.get('/api/admin/flagged-content');
        setFlaggedContent(flaggedResponse.data.flaggedContent || []);
      } catch (error) {
        console.error('Error fetching flagged content:', error);
      }
      
      // Fetch recent activity
      try {
        const activityResponse = await api.get('/api/admin/recent-activity');
        setRecentActivity(activityResponse.data.activities || []);
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleContentAction = async (contentId, action) => {
    try {
      await api.post(`/api/admin/content/${contentId}/${action}`);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error(`Error ${action}ing content:`, error);
      alert(`Failed to ${action} content`);
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
          <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mb-4">Access Denied</h1>
          <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">You don't have admin privileges.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">
          Admin Control Center
        </h1>
        <p className="text-[#171717cc] dark:text-[#fafafacc]">
          Track AI performance, manage content, and monitor system analytics
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-[#2E2E2E]">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'ai-performance', label: 'AI Performance' },
            { id: 'analytics', label: 'System Analytics' },
            { id: 'flagged', label: 'Flagged Content' },
            { id: 'feedback', label: 'User Feedback' },
            { id: 'activity', label: 'User Activity' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                  : 'border-transparent text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] hover:border-gray-300 dark:hover:border-[#2E2E2E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon="👥"
              color="blue"
              loading={statsLoading}
            />
            <StatCard
              title="Total Content"
              value={stats.totalContent}
              icon="📄"
              color="green"
              loading={statsLoading}
            />
            <StatCard
              title="Today's Activity"
              value={stats.todayActivity}
              icon="⚡"
              color="orange"
              loading={statsLoading}
            />
            <StatCard
              title="Flagged Content"
              value={stats.flaggedContent}
              icon="🚩"
              color="red"
              loading={statsLoading}
              onClick={() => setActiveTab('flagged')}
            />
            <StatCard
              title="Pending Reviews"
              value={stats.pendingReviews}
              icon="⏳"
              color="purple"
              loading={statsLoading}
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActionCard
              title="User Management"
              description="View and manage all users"
              icon="👥"
              onClick={() => navigate('/admin/users')}
              color="blue"
            />
            <ActionCard
              title="Admin Management"
              description="Manage admin roles and permissions"
              icon="🛡️"
              onClick={() => navigate('/admin/admins')}
              color="purple"
            />
            <ActionCard
              title="Marketplace"
              description="Review and approve content"
              icon="🛒"
              onClick={() => navigate('/admin/marketplace')}
              color="green"
            />
            <ActionCard
              title="Forum Moderation"
              description="Moderate forum discussions"
              icon="💬"
              onClick={() => navigate('/admin/forum-moderation')}
              color="indigo"
            />
          </div>

          {/* New Admin Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <ActionCard
              title="Content Quality Hub"
              description="Review and manage AI-generated content quality"
              icon="📊"
              onClick={() => navigate('/admin/content-quality')}
              color="blue"
            />
            <ActionCard
              title="Smart Mentor Management"
              description="Monitor chatbot conversations and analytics"
              icon="🤖"
              onClick={() => navigate('/admin/smart-mentor')}
              color="green"
            />
            <ActionCard
              title="User Engagement Analytics"
              description="Track user behavior and feature usage"
              icon="📈"
              onClick={() => navigate('/admin/user-engagement')}
              color="purple"
            />
          </div>

          {/* AI Performance Summary */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
            <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
              AI Performance Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                label="Total Generations"
                value={aiMetrics.totalGenerations}
                loading={statsLoading}
              />
              <MetricCard
                label="Success Rate"
                value={`${aiMetrics.successRate}%`}
                loading={statsLoading}
              />
              <MetricCard
                label="Avg Response Time"
                value={`${aiMetrics.averageResponseTime}ms`}
                loading={statsLoading}
              />
              <MetricCard
                label="Error Rate"
                value={`${aiMetrics.errorRate}%`}
                loading={statsLoading}
                isError={true}
              />
            </div>
            <button
              onClick={() => setActiveTab('ai-performance')}
              className="mt-4 text-sm text-[#171717] dark:text-[#fafafa] hover:underline"
            >
              View Detailed AI Performance →
            </button>
          </div>
        </div>
      )}

      {/* AI Performance Tab */}
      {activeTab === 'ai-performance' && (
        <AIPerformanceTab metrics={aiMetrics} loading={statsLoading} />
      )}

      {/* System Analytics Tab */}
      {activeTab === 'analytics' && (
        <SystemAnalyticsTab analytics={analytics} loading={statsLoading} />
      )}

      {/* Flagged Content Tab */}
      {activeTab === 'flagged' && (
        <FlaggedContentTab
          content={flaggedContent}
          loading={statsLoading}
          onAction={handleContentAction}
          onRefresh={fetchDashboardData}
        />
      )}

      {/* User Feedback Tab */}
      {activeTab === 'feedback' && <AdminFeedback />}

      {/* User Activity Tab */}
      {activeTab === 'activity' && (
        <UserActivityTab activity={recentActivity} loading={statsLoading} />
      )}

      {/* Refresh Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={fetchDashboardData}
          disabled={statsLoading}
          className="flex items-center px-4 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <svg className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {statsLoading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, loading, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 ${onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">{title}</p>
          <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
            {loading ? (
              <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
            ) : (
              value.toLocaleString()
            )}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

// Action Card Component
const ActionCard = ({ title, description, icon, onClick, color }) => {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    green: 'bg-green-600 hover:bg-green-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700'
  };

  return (
    <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center mb-4">
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <span className="text-2xl">{icon}</span>
        </div>
        <h3 className="ml-3 text-lg font-semibold text-[#171717] dark:text-[#fafafa]">{title}</h3>
      </div>
      <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">{description}</p>
      <button
        onClick={onClick}
        className={`w-full ${colorClasses[color]} text-white font-medium py-2 px-4 rounded-lg transition-colors`}
      >
        Manage
      </button>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ label, value, loading, isError = false }) => (
  <div className="text-center">
    <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">{label}</p>
    <p className={`text-2xl font-bold ${isError ? 'text-red-600 dark:text-red-400' : 'text-[#171717] dark:text-[#fafafa]'}`}>
      {loading ? (
        <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-20 rounded mx-auto"></div>
      ) : (
        value
      )}
    </p>
  </div>
);

// AI Performance Tab Component
const AIPerformanceTab = ({ metrics, loading }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
      <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
        Performance by Content Type
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(metrics.byContentType).map(([type, data]) => (
          <div key={type} className="border border-gray-200 dark:border-[#2E2E2E] rounded-lg p-4">
            <h3 className="font-semibold text-[#171717] dark:text-[#fafafa] capitalize mb-2">{type}</h3>
            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Count: {data.count}</p>
            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Success: {data.success}</p>
            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Avg Time: {data.avgTime}ms</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// System Analytics Tab Component
const SystemAnalyticsTab = ({ analytics, loading }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
      <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
        Activity Metrics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Today" value={analytics.activityMetrics.today} loading={loading} />
        <MetricCard label="This Week" value={analytics.activityMetrics.thisWeek} loading={loading} />
        <MetricCard label="This Month" value={analytics.activityMetrics.thisMonth} loading={loading} />
      </div>
    </div>
  </div>
);

// Flagged Content Tab Component
const FlaggedContentTab = ({ content, loading, onAction, onRefresh }) => (
  <div className="space-y-4">
    <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
      <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
        Flagged Content ({content.length})
      </h2>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
        </div>
      ) : content.length === 0 ? (
        <div className="text-center py-8 text-[#171717cc] dark:text-[#fafafacc]">
          No flagged content at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {content.map((item) => (
            <div key={item._id} className="border border-gray-200 dark:border-[#2E2E2E] rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-[#171717] dark:text-[#fafafa]">{item.title || 'Untitled'}</h3>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                    Type: {item.type} | Flagged: {new Date(item.flaggedAt).toLocaleDateString()}
                  </p>
                  {item.reason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">Reason: {item.reason}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAction(item._id, 'approve')}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onAction(item._id, 'reject')}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// User Activity Tab Component
const UserActivityTab = ({ activity, loading }) => (
  <div className="space-y-4">
    <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
      <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
        Recent User Activity
      </h2>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
        </div>
      ) : activity.length === 0 ? (
        <div className="text-center py-8 text-[#171717cc] dark:text-[#fafafacc]">
          No recent activity to display.
        </div>
      ) : (
        <div className="space-y-2">
          {activity.map((item, index) => (
            <div key={index} className="border-b border-gray-200 dark:border-[#2E2E2E] pb-2">
              <p className="text-sm text-[#171717] dark:text-[#fafafa]">{item.description}</p>
              <p className="text-xs text-[#171717cc] dark:text-[#fafafacc] mt-1">
                {new Date(item.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default Admin;
