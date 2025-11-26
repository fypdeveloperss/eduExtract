import React, { useState, useEffect } from "react";
import { useAuth } from "../context/FirebaseAuthContext";
import { useNavigate } from "react-router-dom";
import { useCustomAlerts } from "../hooks/useCustomAlerts";
import api from "../utils/axios";
import AdminFeedback from "./AdminFeedback";

const formatNumber = (value, fallback = "—") => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return fallback;
  }
  return Number(value).toLocaleString();
};

const formatPercent = (value, fallback = "—%") => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return fallback;
  }
  return `${Number(value).toFixed(0)}%`;
};

const Admin = () => {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  const { error, success } = useCustomAlerts();
  
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
      const response = await api.post(`/api/admin/content/${contentId}/${action}`);
      if (response.data.success) {
        success(response.data.message || `Content ${action}d successfully`, 'Action Complete');
      }
      fetchDashboardData(); // Refresh data
    } catch (err) {
      console.error(`Error ${action}ing content:`, err);
      error(err.response?.data?.error || `Failed to ${action} content`, 'Admin Action Failed');
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

  const greetingName = user?.displayName?.split(' ')[0] || 'Admin';
  const activityTrend = [
    { label: 'Today', value: analytics.activityMetrics.today || 0 },
    { label: 'This Week', value: analytics.activityMetrics.thisWeek || 0 },
    { label: 'This Month', value: analytics.activityMetrics.thisMonth || 0 }
  ];
  const maxActivityValue = Math.max(...activityTrend.map(item => item.value), 1);
  const topContentTypes = Object.entries(aiMetrics.byContentType || {})
    .map(([type, data]) => ({
      type,
      count: data.count || 0,
      success: data.success || 0,
      avgTime: data.avgTime || 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const totalAlerts = stats.flaggedContent || 0;
  const queueLoad = stats.pendingReviews || 0;
  const healthScore = Math.max(
    45,
    Math.min(
      99,
      100 - totalAlerts * 1.5 + (stats.todayActivity || 0) * 0.08 - queueLoad * 0.3
    )
  );
  const flaggedPreview = (flaggedContent || []).slice(0, 3);
  const recentPreview = (recentActivity || []).slice(0, 4);
  const pendingBadge =
    queueLoad > 50 ? 'Critical' : queueLoad > 20 ? 'Busy' : queueLoad > 0 ? 'Stable' : 'Clear';

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
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171717] via-[#111111] to-[#050505] text-white p-8 shadow-2xl border border-white/10">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl" />
              <div className="relative z-10">
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">Pulse Overview</p>
                <h2 className="text-3xl md:text-4xl font-bold mt-4">
                  Welcome back, {greetingName}
                </h2>
                <p className="mt-3 text-white/70 max-w-xl">
                  Monitor every signal across EduExtract in one canvas. Your systems are{" "}
                  <span className="text-emerald-300 font-semibold">
                    {healthScore > 85 ? "performing smoothly" : "awaiting your guidance"}
                  </span>
                  .
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <p className="text-sm text-white/60">System Health</p>
                    <p className="text-3xl font-bold mt-1">{Math.round(healthScore)}%</p>
                    <p className="text-xs text-emerald-300 mt-1 flex items-center gap-1">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      {totalAlerts > 0 ? `${totalAlerts} alerts watching` : "All systems nominal"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <p className="text-sm text-white/60">Live Activity</p>
                    <p className="text-3xl font-bold mt-1">{formatNumber(stats.todayActivity)}</p>
                    <p className="text-xs text-white/70 mt-1">
                      Today’s content momentum
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-1">
              <div className="rounded-3xl border border-[#2E2E2E] bg-white dark:bg-[#0f0f0f] p-6 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[#171717] dark:text-white">System Health</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {pendingBadge}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc]">Users</span>
                    <span className="text-sm font-semibold text-[#171717] dark:text-white">{formatNumber(stats.totalUsers)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc]">Content</span>
                    <span className="text-sm font-semibold text-[#171717] dark:text-white">{formatNumber(stats.totalContent)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc]">Queue</span>
                    <span className="text-sm font-semibold text-[#171717] dark:text-white">{formatNumber(queueLoad)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="mt-4 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
                >
                  View analytics →
                </button>
              </div>
              <div className="rounded-3xl border border-[#2E2E2E] bg-gradient-to-br from-[#fafafa] to-[#f4f4f4] dark:from-[#151515] dark:to-[#0f0f0f] p-6 shadow-lg">
                <p className="text-sm font-semibold text-[#171717] dark:text-white mb-3">Queues & Alerts</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[#17171799] dark:text-[#fafafacc] mb-1">Pending Reviews</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-[#2E2E2E] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${Math.min(100, (queueLoad / 40) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-[#171717] dark:text-white">{queueLoad}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#17171799] dark:text-[#fafafacc] mb-1">Flagged Content</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-[#2E2E2E] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-500"
                          style={{ width: `${Math.min(100, (totalAlerts / 30) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-[#171717] dark:text-white">{formatNumber(stats.flaggedContent)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('flagged')}
                  className="mt-4 text-xs font-semibold text-[#171717] dark:text-white hover:underline"
                >
                  Review alerts →
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <MiniStat label="Total Users" value={formatNumber(stats.totalUsers)} accent="emerald" />
            <MiniStat label="Total Content" value={formatNumber(stats.totalContent)} accent="blue" />
            <MiniStat label="Pending Reviews" value={formatNumber(stats.pendingReviews)} accent="amber" />
            <MiniStat label="Flagged Content" value={formatNumber(stats.flaggedContent)} accent="rose" />
            <MiniStat label="AI Generations" value={formatNumber(aiMetrics.totalGenerations)} accent="indigo" />
            <MiniStat label="Success Rate" value={formatPercent(aiMetrics.successRate)} accent="violet" />
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <ActionCard
              title="User Management"
              description="Search, filter, and manage every learner account."
              icon="👥"
              onClick={() => navigate('/admin/users')}
              color="blue"
            />
            <ActionCard
              title="Admin Roles"
              description="Promote guardians, adjust permissions, reinforce security."
              icon="🛡️"
              onClick={() => navigate('/admin/admins')}
              color="purple"
            />
            <ActionCard
              title="Marketplace"
              description="Audit premium content pipeline and payouts."
              icon="🛒"
              onClick={() => navigate('/admin/marketplace')}
              color="green"
            />
            <ActionCard
              title="Forum Watch"
              description="Keep discussions respectful and high-signal."
              icon="💬"
              onClick={() => navigate('/admin/forum-moderation')}
              color="indigo"
            />
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[#171717] dark:text-white">Operational Pulse</h2>
                <p className="text-sm text-[#17171799] dark:text-[#fafafacc]">How the platform is breathing right now.</p>
              </div>
              <button
                onClick={() => setActiveTab('analytics')}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#2E2E2E] text-sm font-semibold text-[#171717] dark:text-white hover:bg-gray-50 dark:hover:bg-[#1f1f1f]"
              >
                Open analytics suite
              </button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 dark:bg-[#1f1f1f] p-5 border border-gray-100 dark:border-[#2E2E2E]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66] mb-4">Activity Trend</p>
                <div className="space-y-3">
                  {activityTrend.map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm font-semibold text-[#171717] dark:text-white">
                        <span>{item.label}</span>
                        <span>{formatNumber(item.value)}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-[#2E2E2E] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                          style={{ width: `${(item.value / maxActivityValue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-[#1f1f1f] p-5 border border-gray-100 dark:border-[#2E2E2E]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66] mb-4">AI Pipelines</p>
                <ul className="space-y-3">
                  {topContentTypes.map(item => (
                    <li key={item.type} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#171717] dark:text-white capitalize">{item.type}</p>
                        <p className="text-xs text-[#17171799] dark:text-[#fafafacc]">
                          {formatNumber(item.success)} successful · {item.avgTime}ms avg
                        </p>
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E]">
                        {formatNumber(item.count)} req
                      </span>
                    </li>
                  ))}
                  {topContentTypes.length === 0 && (
                    <p className="text-sm text-[#17171799] dark:text-[#fafafacc]">No AI generation data yet.</p>
                  )}
                </ul>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-[#1f1f1f] p-5 border border-gray-100 dark:border-[#2E2E2E]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66] mb-4">Alert Stream</p>
                <div className="space-y-3">
                  {flaggedPreview.length === 0 ? (
                    <p className="text-sm text-[#17171799] dark:text-[#fafafacc]">No active alerts.</p>
                  ) : (
                    flaggedPreview.map(item => (
                      <div key={item._id} className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-3">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300 truncate">
                          {item.title || 'Untitled content'}
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-200 mt-1 flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          {item.reason || 'Flagged for review'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#171717] dark:text-white">Recent Activity</h3>
                <button
                  onClick={() => setActiveTab('activity')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
                >
                  View timeline →
                </button>
              </div>
              <div className="space-y-3">
                {recentPreview.length === 0 ? (
                  <p className="text-sm text-[#17171799] dark:text-[#fafafacc]">
                    No user activity yet.
                  </p>
                ) : (
                  recentPreview.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-10 flex flex-col items-center">
                        <span className="h-2 w-2 rounded-full bg-[#171717] dark:bg-white mt-1" />
                        {index !== recentPreview.length - 1 && (
                          <span className="flex-1 w-px bg-gray-200 dark:bg-[#2E2E2E]" />
                        )}
                      </div>
                      <div className="flex-1 pb-3 border-b border-gray-100 dark:border-[#2E2E2E]">
                        <p className="text-sm font-semibold text-[#171717] dark:text-white">{item.description}</p>
                        <p className="text-xs text-[#17171799] dark:text-[#fafafacc] mt-1">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-gradient-to-br from-[#fafafa] to-white dark:from-[#1a1a1a] dark:to-[#0f0f0f] p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#171717] dark:text-white mb-4">AI Performance Snapshot</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="Total Generations" value={formatNumber(aiMetrics.totalGenerations)} loading={statsLoading} />
                <MetricCard label="Success Rate" value={formatPercent(aiMetrics.successRate)} loading={statsLoading} />
                <MetricCard label="Avg Response Time" value={`${aiMetrics.averageResponseTime || 0} ms`} loading={statsLoading} />
                <MetricCard label="Error Rate" value={formatPercent(aiMetrics.errorRate)} loading={statsLoading} isError />
              </div>
              <button
                onClick={() => setActiveTab('ai-performance')}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#171717] dark:text-white"
              >
                Dive deeper <span aria-hidden>→</span>
              </button>
            </div>
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

// Action Card Component
const ActionCard = ({ title, description, icon, onClick, color }) => {
  const colorClasses = {
    blue: 'from-sky-500/80 via-sky-600/90 to-sky-700/90',
    purple: 'from-purple-500/80 via-purple-600/90 to-purple-700/90',
    green: 'from-emerald-500/80 via-emerald-600/90 to-emerald-700/90',
    indigo: 'from-indigo-500/80 via-indigo-600/90 to-indigo-700/90'
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#1a1a1a] p-6 shadow-lg">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className={`absolute -inset-1 bg-gradient-to-r ${colorClasses[color]} blur-2xl`} />
      </div>
      <div className="relative flex items-center mb-4">
        <div className="p-3 rounded-xl bg-gray-100 dark:bg-[#222222]">
          <span className="text-2xl">{icon}</span>
        </div>
        <h3 className="ml-3 text-lg font-semibold text-[#171717] dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-[#17171799] dark:text-[#fafafacc] mb-4">{description}</p>
      <button
        onClick={onClick}
        className="w-full relative z-10 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white"
      >
        <span className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color]} transition-transform group-hover:scale-105`} />
        <span className="relative">Launch</span>
      </button>
    </div>
  );
};

const MiniStat = ({ label, value, accent = 'emerald' }) => {
  const accents = {
    emerald: 'from-emerald-100/80 to-emerald-200/50 dark:from-emerald-900/20 dark:to-emerald-900/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40',
    blue: 'from-sky-100/80 to-sky-200/50 dark:from-sky-900/20 dark:to-sky-900/10 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-900/40',
    amber: 'from-amber-100/80 to-amber-200/50 dark:from-amber-900/20 dark:to-amber-900/10 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40',
    rose: 'from-rose-100/80 to-rose-200/50 dark:from-rose-900/20 dark:to-rose-900/10 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40',
    indigo: 'from-indigo-100/80 to-indigo-200/50 dark:from-indigo-900/20 dark:to-indigo-900/10 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-900/40',
    violet: 'from-violet-100/80 to-violet-200/50 dark:from-violet-900/20 dark:to-violet-900/10 text-violet-700 dark:text-violet-300 border-violet-200/60 dark:border-violet-900/40'
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${accents[accent] || accents.emerald}`}>
      <p className="text-xs uppercase tracking-[0.3em] opacity-80">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
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
const AIPerformanceTab = ({ metrics, loading }) => {
  const summaryCards = [
    { label: 'Total Generations', value: formatNumber(metrics.totalGenerations) },
    { label: 'Success Rate', value: formatPercent(metrics.successRate) },
    { label: 'Avg Response', value: `${metrics.averageResponseTime} ms` },
    { label: 'Error Rate', value: formatPercent(metrics.errorRate) }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[#17171799] dark:text-[#fafafacc]">
              {card.label}
            </p>
            <p className="text-xl font-semibold text-[#171717] dark:text-white mt-1">
              {loading ? '—' : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-[#171717] dark:text-white">
              Performance by Content Type
            </h2>
            <p className="text-sm text-[#17171799] dark:text-[#fafafacc]">
              Generation mix, success counts, and latency per workflow.
            </p>
          </div>
          <p className="text-xs text-[#17171766] dark:text-[#fafafa66]">
            Live snapshot from the last 24h.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(metrics.byContentType).map(([type, data]) => (
            <div
              key={type}
              className="rounded-2xl border border-gray-100 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1a1a1a] p-4 space-y-2"
            >
              <p className="text-sm font-semibold text-[#171717] dark:text-white capitalize">
                {type}
              </p>
              <p className="text-xs text-[#17171799] dark:text-[#fafafacc]">
                Requests · <span className="font-semibold">{formatNumber(data.count)}</span>
              </p>
              <p className="text-xs text-[#17171799] dark:text-[#fafafacc]">
                Success · <span className="font-semibold">{formatNumber(data.success)}</span>
              </p>
              <p className="text-xs text-[#17171799] dark:text-[#fafafacc]">
                Avg time · <span className="font-semibold">{data.avgTime} ms</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SystemAnalyticsTab = ({ analytics, loading }) => {
  const metrics = analytics.activityMetrics || {};
  const cards = [
    { label: 'Active Today', value: formatNumber(metrics.today) },
    { label: 'Active This Week', value: formatNumber(metrics.thisWeek) },
    { label: 'Active This Month', value: formatNumber(metrics.thisMonth) }
  ];

  // Prepare chart data
  const userGrowth = analytics.userGrowth || [];
  const contentTrends = analytics.contentTrends || [];
  
  // Combine and normalize data for the last 30 days
  const chartData = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const userData = userGrowth.find(item => item.date === dateStr);
    const contentData = contentTrends.find(item => item.date === dateStr);
    
    chartData.push({
      date: dateStr,
      dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: userData?.count || 0,
      content: contentData?.count || 0
    });
  }

  // Calculate max values for scaling
  const maxUsers = Math.max(...chartData.map(d => d.users), 1);
  const maxContent = Math.max(...chartData.map(d => d.content), 1);
  const maxValue = Math.max(maxUsers, maxContent, 1);

  // Generate SVG path for line chart
  const chartWidth = 800;
  const chartHeight = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const getX = (index) => padding.left + (index / (chartData.length - 1)) * graphWidth;
  const getY = (value) => padding.top + graphHeight - (value / maxValue) * graphHeight;

  // Generate path for users line
  const usersPath = chartData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.users)}`)
    .join(' ');

  // Generate path for content line
  const contentPath = chartData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.content)}`)
    .join(' ');

  // Generate area path for users
  const usersAreaPath = `${usersPath} L ${getX(chartData.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;

  // Generate area path for content
  const contentAreaPath = `${contentPath} L ${getX(chartData.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;

  // Y-axis labels
  const yAxisSteps = 5;
  const yAxisLabels = [];
  for (let i = 0; i <= yAxisSteps; i++) {
    const value = Math.round((maxValue / yAxisSteps) * (yAxisSteps - i));
    yAxisLabels.push({
      value,
      y: padding.top + (i / yAxisSteps) * graphHeight
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[#17171799] dark:text-[#fafafacc]">
              {card.label}
            </p>
            <p className="text-2xl font-semibold text-[#171717] dark:text-white mt-1">
              {loading ? '—' : card.value}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-gradient-to-br from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#0f0f0f] p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#171717] dark:text-white">Activity Pulse</h2>
            <p className="text-sm text-[#17171799] dark:text-[#fafafacc] mt-1">
              Trends and peaks across the platform over the last 30 days
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-xs text-[#17171799] dark:text-[#fafafacc]">Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-[#17171799] dark:text-[#fafafacc]">Content</span>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="rounded-2xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-8 flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717] dark:border-[#fafafa]"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-[#2E2E2E] p-8 text-center text-sm text-[#17171766] dark:text-[#fafafa66]">
            No activity data available yet
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-4 overflow-x-auto">
            <svg width={chartWidth} height={chartHeight} className="w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              {/* Grid lines */}
              {yAxisLabels.map((label, i) => (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={label.y}
                    x2={chartWidth - padding.right}
                    y2={label.y}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-gray-200 dark:text-[#2E2E2E]"
                    opacity="0.5"
                  />
                </g>
              ))}

              {/* X-axis grid lines (every 5 days) */}
              {chartData.map((d, i) => {
                if (i % 5 === 0 || i === chartData.length - 1) {
                  return (
                    <line
                      key={i}
                      x1={getX(i)}
                      y1={padding.top}
                      x2={getX(i)}
                      y2={chartHeight - padding.bottom}
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-gray-200 dark:text-[#2E2E2E]"
                      opacity="0.3"
                    />
                  );
                }
                return null;
              })}

              {/* Area fills */}
              <path
                d={usersAreaPath}
                fill="url(#usersGradient)"
                opacity="0.2"
              />
              <path
                d={contentAreaPath}
                fill="url(#contentGradient)"
                opacity="0.2"
              />

              {/* Lines */}
              <path
                d={usersPath}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={contentPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {chartData.map((d, i) => (
                <g key={i}>
                  <circle
                    cx={getX(i)}
                    cy={getY(d.users)}
                    r="4"
                    fill="#6366f1"
                    className="hover:r-6 transition-all"
                  />
                  <circle
                    cx={getX(i)}
                    cy={getY(d.content)}
                    r="4"
                    fill="#10b981"
                    className="hover:r-6 transition-all"
                  />
                </g>
              ))}

              {/* Y-axis labels */}
              {yAxisLabels.map((label, i) => (
                <text
                  key={i}
                  x={padding.left - 10}
                  y={label.y + 4}
                  textAnchor="end"
                  className="text-xs fill-[#17171799] dark:fill-[#fafafacc]"
                >
                  {formatNumber(label.value)}
                </text>
              ))}

              {/* X-axis labels */}
              {chartData.map((d, i) => {
                if (i % 5 === 0 || i === chartData.length - 1) {
                  return (
                    <text
                      key={i}
                      x={getX(i)}
                      y={chartHeight - padding.bottom + 20}
                      textAnchor="middle"
                      className="text-xs fill-[#17171799] dark:fill-[#fafafacc]"
                    >
                      {d.dateLabel}
                    </text>
                  );
                }
                return null;
              })}

              {/* Gradients */}
              <defs>
                <linearGradient id="usersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="contentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

const FlaggedContentTab = ({ content, loading, onAction, onRefresh }) => (
  <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66]">
          Safety Queue
        </p>
        <h2 className="text-xl font-semibold text-[#171717] dark:text-white">
          Flagged Content ({content.length})
        </h2>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-[#2E2E2E] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors"
        >
          Refresh
        </button>
      )}
    </div>
    {loading ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
      </div>
    ) : content.length === 0 ? (
      <div className="text-center py-8 text-[#17171799] dark:text-[#fafafacc]">
        No flagged content at this time.
      </div>
    ) : (
      <div className="space-y-4">
        {content.map((item) => (
          <div
            key={item._id}
            className="rounded-2xl border border-gray-100 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1a1a1a] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-[#171717] dark:text-white">
                    {item.title || 'Untitled content'}
                  </h3>
                  {item.flagCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                      {item.flagCount} {item.flagCount === 1 ? 'flag' : 'flags'}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    item.status === 'flagged' 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : item.status === 'approved'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-[#17171799] dark:text-[#fafafacc]">
                  {item.type || item.category} · Last flagged {new Date(item.flaggedAt).toLocaleDateString()}
                </p>
                {item.reason && (
                  <p className="text-sm text-rose-600 dark:text-rose-400 mt-2">
                    <span className="font-medium">Latest reason:</span> {item.reason.replace('_', ' ')}
                  </p>
                )}
                {item.flags && item.flags.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-[#17171799] dark:text-[#fafafacc] cursor-pointer hover:text-[#171717] dark:hover:text-[#fafafa]">
                      View all {item.flags.length} flag reports
                    </summary>
                    <div className="mt-2 space-y-1 pl-3 border-l-2 border-gray-200 dark:border-[#2E2E2E]">
                      {item.flags.map((flag, idx) => (
                        <div key={idx} className="text-xs text-[#17171799] dark:text-[#fafafacc]">
                          <span className="font-medium capitalize">{flag.reason?.replace('_', ' ')}</span>
                          {flag.description && <span> - {flag.description}</span>}
                          <span className="text-[#17171766] dark:text-[#fafafa66]"> ({new Date(flag.flaggedAt).toLocaleDateString()})</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onAction(item._id, 'approve')}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => onAction(item._id, 'reject')}
                  className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
                >
                  Reject
                </button>
                {item.flagCount > 0 && (
                  <button
                    onClick={() => onAction(item._id, 'clear-flags')}
                    className="rounded-lg border border-gray-300 dark:border-[#3E3E3E] bg-white dark:bg-[#2E2E2E] hover:bg-gray-50 dark:hover:bg-[#3E3E3E] text-[#171717] dark:text-[#fafafa] px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    Clear Flags
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const UserActivityTab = ({ activity, loading }) => (
  <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg">
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66]">
          Live Timeline
        </p>
        <h2 className="text-xl font-semibold text-[#171717] dark:text-white">Recent Activity</h2>
      </div>
    </div>
    {loading ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
      </div>
    ) : activity.length === 0 ? (
      <div className="text-center py-8 text-[#17171799] dark:text-[#fafafacc]">
        No recent activity to display.
      </div>
    ) : (
      <div className="space-y-4">
        {activity.map((item, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="h-3 w-3 rounded-full bg-[#171717] dark:bg-white mt-1" />
              {index !== activity.length - 1 && (
                <span className="flex-1 w-px bg-gray-200 dark:bg-[#2E2E2E]" />
              )}
            </div>
            <div className="flex-1 pb-4 border-b border-gray-100 dark:border-[#2E2E2E]">
              <p className="text-sm font-semibold text-[#171717] dark:text-white">{item.description}</p>
              <p className="text-xs text-[#17171799] dark:text-[#fafafacc] mt-1">
                {new Date(item.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default Admin;
