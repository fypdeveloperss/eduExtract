import React, { useState, useEffect } from "react";
import api from "../utils/axios";
import { useAuth } from "../context/FirebaseAuthContext";
import { User, Mail, Calendar, Clock, FileText, Eye, X, Search, Filter } from "lucide-react";
import ContentDetail from "../components/ContentDetail";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userContent, setUserContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/users/admin/all");
      const usersData = response.data.users || response.data;
      setUsers(usersData);
      setFilteredUsers(usersData);
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
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateToCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = today - dateToCheck;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getContentTypeIcon = (type) => {
    const icons = {
      blog: "📝",
      slides: "📊",
      flashcards: "🎴",
      quiz: "❓",
      summary: "📄",
    };
    return icons[type] || "📄";
  };

  const getContentTypeColor = (type) => {
    const colors = {
      blog: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
      slides: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
      flashcards: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
      quiz: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
      summary: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    };
    return colors[type] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
          <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">
          User Management
        </h1>
        <p className="text-[#171717cc] dark:text-[#fafafacc]">
          View and manage all users and their generated content
        </p>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-1">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Users Card */}
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f]">
              <h2 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] flex items-center">
                <User className="w-5 h-5 mr-2" />
                All Users ({filteredUsers.length})
              </h2>
            </div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-[#171717cc] dark:text-[#fafafacc]">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No users found</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.uid}
                    onClick={() => handleUserClick(user)}
                    className={`p-4 border-b border-gray-200 dark:border-[#2E2E2E] cursor-pointer transition-all ${
                      selectedUser?.uid === user.uid
                        ? "bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] border-l-4 border-[#171717] dark:border-[#fafafa]"
                        : "hover:bg-gray-50 dark:hover:bg-[#1f1f1f]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedUser?.uid === user.uid
                            ? "bg-white dark:bg-[#171717]"
                            : "bg-[#171717] dark:bg-[#fafafa]"
                        }`}>
                          <User className={`w-5 h-5 ${
                            selectedUser?.uid === user.uid
                              ? "text-[#171717] dark:text-[#fafafa]"
                              : "text-white dark:text-[#171717]"
                          }`} />
                        </div>
                        <div>
                          <h3 className={`font-semibold ${
                            selectedUser?.uid === user.uid
                              ? "text-white dark:text-[#171717]"
                              : "text-[#171717] dark:text-[#fafafa]"
                          }`}>
                            {user.name || "Unknown User"}
                          </h3>
                          <p className={`text-sm flex items-center mt-0.5 ${
                            selectedUser?.uid === user.uid
                              ? "text-white/80 dark:text-[#171717]/80"
                              : "text-[#171717cc] dark:text-[#fafafacc]"
                          }`}>
                            <Mail className="w-3 h-3 mr-1" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <Eye className={`w-4 h-4 ${
                        selectedUser?.uid === user.uid
                          ? "text-white dark:text-[#171717]"
                          : "text-[#171717cc] dark:text-[#fafafacc]"
                      }`} />
                    </div>
                    <div className={`mt-2 text-xs flex items-center space-x-4 ${
                      selectedUser?.uid === user.uid
                        ? "text-white/70 dark:text-[#171717]/70"
                        : "text-[#171717cc] dark:text-[#fafafacc]"
                    }`}>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(user.createdAt)}
                      </span>
                      {user.lastLogin && (
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(user.lastLogin)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* User Content */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="space-y-6">
              {/* User Info Card */}
              <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-[#171717] dark:bg-[#fafafa] rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-white dark:text-[#171717]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">
                        {selectedUser.name}
                      </h2>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                    <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">
                      Member Since
                    </p>
                    <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                      {formatDate(selectedUser.createdAt)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                    <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">
                      Last Login
                    </p>
                    <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                      {formatDate(selectedUser.lastLogin)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                    <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">
                      Total Content
                    </p>
                    <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                      {userContent.length} items
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-4">
                    <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">
                      User ID
                    </p>
                    <p className="text-xs font-mono text-[#171717] dark:text-[#fafafa] truncate">
                      {selectedUser.uid}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content List */}
              {contentLoading ? (
                <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
                  <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Loading content...</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f]">
                    <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                      Generated Content ({userContent.length})
                    </h3>
                  </div>
                  {userContent.length === 0 ? (
                    <div className="p-12 text-center text-[#171717cc] dark:text-[#fafafacc]">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium mb-2">No content generated yet</p>
                      <p className="text-sm">This user hasn't generated any content.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
                      {userContent.map((content) => (
                        <div
                          key={content._id}
                          className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors"
                          onClick={() => handleContentClick(content)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${getContentTypeColor(content.type)}`}>
                                {getContentTypeIcon(content.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-[#171717] dark:text-[#fafafa] mb-1 truncate">
                                  {content.title}
                                </h3>
                                <div className="flex items-center space-x-3 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getContentTypeColor(content.type)}`}>
                                    {content.type}
                                  </span>
                                  <span>•</span>
                                  <span>{formatDate(content.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            {content.url && (
                              <a
                                href={content.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-4 px-3 py-1.5 text-sm bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Source
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-12 text-center">
              <User className="w-20 h-20 text-[#171717cc] dark:text-[#fafafacc] mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
                Select a User
              </h3>
              <p className="text-[#171717cc] dark:text-[#fafafacc]">
                Click on a user from the list to view their generated content and activity
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content Detail Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContent(null)}>
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-[#2E2E2E]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f]">
              <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                Content Details
              </h3>
              <button
                onClick={() => setSelectedContent(null)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-[#2E2E2E] rounded-lg transition-colors text-[#171717] dark:text-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <ContentDetail content={selectedContent} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
