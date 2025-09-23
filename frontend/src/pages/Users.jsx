import React, { useState, useEffect } from "react";
import api from "../utils/axios";
import { useAuth } from "../context/FirebaseAuthContext";
import { User, Mail, Calendar, Clock, FileText, Eye, X } from "lucide-react";
import ContentDetail from "../components/ContentDetail";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userContent, setUserContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/users/admin/all");
      // Handle both paginated and non-paginated responses
      const usersData = response.data.users || response.data;
      setUsers(usersData);
    } catch (err) {
      setError("Failed to fetch users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserContent = async (userId) => {
    setContentLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/admin/content/${userId}`);
      setUserContent(response.data.content);
      setSelectedUser(response.data.user);
    } catch (err) {
      setError("Failed to fetch user content");
      console.error("Error fetching user content:", err);
    } finally {
      setContentLoading(false);
    }
  };

  const handleUserClick = (user) => {
    fetchUserContent(user.uid);
    setSelectedContent(null);
  };

  const handleContentClick = (content) => {
    setSelectedContent(content);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'blog':
        return <FileText size={16} className="text-blue-500" />;
      case 'slides':
        return <FileText size={16} className="text-green-500" />;
      case 'flashcards':
        return <FileText size={16} className="text-purple-500" />;
      case 'quiz':
        return <FileText size={16} className="text-orange-500" />;
      case 'summary':
        return <FileText size={16} className="text-red-500" />;
      default:
        return <FileText size={16} className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-2">
          User Management
        </h1>
        <p className="text-[#171717cc] dark:text-[#fafafacc]">
          View and manage all users and their generated content
        </p>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users List */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4">
            All Users ({users.length})
          </h2>
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E]">
            {users.map((user) => (
              <div
                key={user.uid}
                onClick={() => handleUserClick(user)}
                className={`p-4 border-b border-gray-200 dark:border-[#2E2E2E] cursor-pointer transition-colors ${
                  selectedUser?.uid === user.uid
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                    : "hover:bg-gray-50 dark:hover:bg-[#2E2E2E]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <User size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#171717cc] dark:text-[#fafafacc]">
                        {user.name}
                      </h3>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] flex items-center">
                        <Mail size={14} className="mr-1" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Eye size={16} className="text-gray-400" />
                </div>
                <div className="mt-2 text-xs text-[#171717cc] dark:text-[#fafafacc] flex items-center space-x-4">
                  <span className="flex items-center">
                    <Calendar size={12} className="mr-1" />
                    {formatDate(user.createdAt)}
                  </span>
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    {formatDate(user.lastLogin)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Content */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div>
              <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 mb-6">
                <h2 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4">
                  {selectedUser.name}'s Content
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#171717cc] dark:text-[#fafafacc]">Email:</span>
                    <p className="font-medium text-[#171717cc] dark:text-[#fafafacc]">{selectedUser.email}</p>
                  </div>
                  <div>
                    <span className="text-[#171717cc] dark:text-[#fafafacc]">Member since:</span>
                    <p className="font-medium text-[#171717cc] dark:text-[#fafafacc]">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-[#171717cc] dark:text-[#fafafacc]">Last login:</span>
                    <p className="font-medium text-[#171717cc] dark:text-[#fafafacc]">{formatDate(selectedUser.lastLogin)}</p>
                  </div>
                  <div>
                    <span className="text-[#171717cc] dark:text-[#fafafacc]">Total content:</span>
                    <p className="font-medium text-[#171717cc] dark:text-[#fafafacc]">{userContent.length} items</p>
                  </div>
                </div>
              </div>

              {contentLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Loading content...</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E]">
                  {userContent.length === 0 ? (
                    <div className="p-6 text-center text-[#171717cc] dark:text-[#fafafacc]">
                      No content generated yet
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
                      {userContent.map((content) => (
                        <div 
                          key={content._id} 
                          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors"
                          onClick={() => handleContentClick(content)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getContentTypeIcon(content.type)}
                              <div>
                                <h3 className="font-medium text-[#171717cc] dark:text-[#fafafacc]">
                                  {content.title}
                                </h3>
                                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] capitalize">
                                  {content.type} • {formatDate(content.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-[#171717cc] dark:text-[#fafafacc]">
                              {content.url && (
                                <a
                                  href={content.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-600"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Source
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-8 text-center">
              <User size={48} className="text-[#171717cc] dark:text-[#fafafacc] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                Select a User
              </h3>
              <p className="text-[#171717cc] dark:text-[#fafafacc]">
                Click on a user from the list to view their generated content
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content Detail Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-[#2E2E2E]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2E2E2E]">
              <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc]">
                Content Details
              </h3>
              <button
                onClick={() => setSelectedContent(null)}
                className="text-[#171717cc] dark:text-[#fafafacc] hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <ContentDetail content={selectedContent} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
