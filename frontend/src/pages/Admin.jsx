import React, { useState, useEffect } from "react";
import { useAuth } from "../context/FirebaseAuthContext";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";

const Admin = () => {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalContent: 0,
    todayActivity: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Debug logging
  console.log('Admin component - user:', user?.uid);
  console.log('Admin component - isAdmin:', isAdmin);
  console.log('Admin component - adminLoading:', adminLoading);

  // Fetch admin statistics
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      
      // Use the existing admin stats endpoint
      const response = await api.get('/api/admin/stats');
      const { users, content, admins } = response.data;
      
      setStats({
        totalUsers: users?.totalUsers || 0,
        totalContent: content?.totalContent || 0,
        todayActivity: content?.todayContent || 0
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      // Fallback to individual API calls if the stats endpoint fails
      try {
        const usersResponse = await api.get('/api/users');
        const totalUsers = usersResponse.data.length;
        
        setStats({
          totalUsers,
          totalContent: 0, // We'll set this to 0 if we can't get the stats
          todayActivity: 0
        });
      } catch (fallbackError) {
        console.error('Fallback API calls also failed:', fallbackError);
        setStats({
          totalUsers: 0,
          totalContent: 0,
          todayActivity: 0
        });
      }
    } finally {
      setStatsLoading(false);
    }
  };

  // Redirect if not admin and fetch stats when admin
  useEffect(() => {
    console.log('Admin useEffect - isAdmin:', isAdmin, 'adminLoading:', adminLoading);
    if (!adminLoading && !isAdmin) {
      console.log('Redirecting to home - not admin');
      navigate('/');
    } else if (!adminLoading && isAdmin) {
      fetchStats();
    }
  }, [isAdmin, adminLoading, navigate]);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#fafafacc] mb-4">Access Denied</h1>
          <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">You don't have admin privileges.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-2">
          Admin Dashboard
        </h1>
        <p className="text-[#171717cc] dark:text-[#fafafacc]">
          Manage users, content, and system settings
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Users Management Card */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc]">User Management</h3>
            </div>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
              View all users and their generated content. Monitor user activity and content generation.
            </p>
            <button
              onClick={() => navigate('/admin/users')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Manage Users
            </button>
          </div>

          {/* Admin Management Card */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc]">Admin Management</h3>
            </div>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
              Add or remove admin users. Manage admin permissions and roles in the system.
            </p>
            <button
              onClick={() => navigate('/admin/admins')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Manage Admins
            </button>
          </div>

          {/* Marketplace Content Management Card */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc]">Marketplace Content</h3>
            </div>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
              Review and approve pending marketplace content. Manage content moderation and quality control.
            </p>
            <button
              onClick={() => navigate('/admin/marketplace')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Manage Content
            </button>
          </div>

          {/* Forum Management Card */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc]">Forum Management</h3>
            </div>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
              Create and manage forum categories. Organize discussions and control forum structure.
            </p>
            <button
              onClick={() => navigate('/admin/forum')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Manage Categories
            </button>
          </div>


          {/* Analytics Card */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc]">Analytics</h3>
            </div>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
              View system analytics, usage statistics, and content generation metrics.
            </p>
            <button
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
              disabled
            >
              Coming Soon
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc]">System Overview</h2>
            <button
              onClick={fetchStats}
              disabled={statsLoading}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <svg className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {statsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Total Users</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafacc]">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
                    ) : (
                      stats.totalUsers.toLocaleString()
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Total Content</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafacc]">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
                    ) : (
                      stats.totalContent.toLocaleString()
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Today's Activity</p>
                  <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafacc]">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
                    ) : (
                      stats.todayActivity.toLocaleString()
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Admin;
