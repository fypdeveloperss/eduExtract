import React, { useState, useEffect, useMemo } from "react";
import api from "../utils/axios";
import { useAuth } from "../context/FirebaseAuthContext";
import {
  User,
  Mail,
  Calendar,
  Clock,
  FileText,
  Eye,
  X,
  Search,
  Users as UsersIcon,
  Activity
} from "lucide-react";
import ContentDetail from "../components/ContentDetail";

const formatNumber = (value, fallback = "—") => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return fallback;
  }
  return Number(value).toLocaleString();
};

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

  const stats = useMemo(() => {
    const recent = users.filter(
      (u) => Date.now() - new Date(u.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;
    const active = users.filter(
      (u) => u.lastLogin && Date.now() - new Date(u.lastLogin).getTime() < 3 * 24 * 60 * 60 * 1000
    ).length;
    return { total: users.length, recent, active };
  }, [users]);

  const loadingState = (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="h-12 w-12 rounded-full border-b-2 border-[#171717] dark:border-[#fafafa] animate-spin" />
      <p className="text-sm text-[#17171799] dark:text-[#fafafacc]">Loading users...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171717] via-[#0f0f0f] to-[#050505] text-white p-8 shadow-2xl border border-white/10">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">User Observatory</p>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-sm text-white/70">
              Monitor learner profiles, inspect their content, and protect the experience.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs text-white/60">Total Users</p>
                <p className="text-3xl font-bold mt-1">{formatNumber(stats.total)}</p>
                <p className="text-xs text-emerald-300 mt-1">Active accounts</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs text-white/60">New this week</p>
                <p className="text-3xl font-bold mt-1">{formatNumber(stats.recent)}</p>
                <p className="text-xs text-white/70 mt-1">Past 7 days</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {[
            {
              label: "Recently active",
              value: formatNumber(stats.active),
              icon: Activity,
              tone: "from-emerald-500/15 to-transparent"
            },
            {
              label: "Selected user",
              value: selectedUser ? selectedUser.name || "Unnamed" : "None",
              icon: UsersIcon,
              tone: "from-sky-500/15 to-transparent"
            },
            {
              label: "Generated items",
              value: `${userContent.length} pieces`,
              icon: FileText,
              tone: "from-purple-500/15 to-transparent"
            }
          ].map((card) => (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-4 shadow"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.tone}`} />
              <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-[#222222]">
                  <card.icon className="w-5 h-5 text-[#171717] dark:text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66]">
                    {card.label}
                  </p>
                  <p className="text-lg font-semibold text-[#171717] dark:text-white">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#17171799] dark:text-[#fafafacc]" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-white placeholder-[#17171799] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
            />
          </div>
          <p className="text-xs text-[#17171799] dark:text-[#fafafacc]">
            Showing {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1a1a1a] flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-[#171717] dark:text-white" />
            <h2 className="text-lg font-semibold text-[#171717] dark:text-white">
              All Users ({filteredUsers.length})
            </h2>
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {loading ? (
              loadingState
            ) : filteredUsers.length === 0 ? (
              <div className="p-10 text-center text-[#17171799] dark:text-[#fafafacc]">
                <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No users found</p>
              </div>
            ) : (
              filteredUsers.map((entry) => (
                <div
                  key={entry.uid}
                  onClick={() => handleUserClick(entry)}
                  className={`p-4 border-b border-gray-100 dark:border-[#2E2E2E] cursor-pointer transition ${
                    selectedUser?.uid === entry.uid
                      ? "bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717]"
                      : "hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedUser?.uid === entry.uid
                            ? "bg-white dark:bg-[#171717]"
                            : "bg-[#171717] dark:bg-[#fafafa]"
                        }`}
                      >
                        <User
                          className={`w-5 h-5 ${
                            selectedUser?.uid === entry.uid
                              ? "text-[#171717] dark:text-white"
                              : "text-white dark:text-[#171717]"
                          }`}
                        />
                      </div>
                      <div>
                        <p
                          className={`font-semibold ${
                            selectedUser?.uid === entry.uid
                              ? "text-white dark:text-[#171717]"
                              : "text-[#171717] dark:text-white"
                          }`}
                        >
                          {entry.name || "Unknown User"}
                        </p>
                        <p
                          className={`text-xs flex items-center gap-1 ${
                            selectedUser?.uid === entry.uid
                              ? "text-white/80 dark:text-[#171717]/80"
                              : "text-[#17171799] dark:text-[#fafafacc]"
                          }`}
                        >
                          <Mail className="w-3 h-3" />
                          {entry.email}
                        </p>
                      </div>
                    </div>
                    <Eye
                      className={`w-4 h-4 ${
                        selectedUser?.uid === entry.uid
                          ? "text-white dark:text-[#171717]"
                          : "text-[#17171799] dark:text-[#fafafacc]"
                      }`}
                    />
                  </div>
                  <div
                    className={`text-xs flex items-center gap-4 ${
                      selectedUser?.uid === entry.uid
                        ? "text-white/70 dark:text-[#171717]/70"
                        : "text-[#17171799] dark:text-[#fafafacc]"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(entry.createdAt)}
                    </span>
                    {entry.lastLogin && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(entry.lastLogin)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedUser ? (
            <>
              <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#171717] dark:bg-[#fafafa] flex items-center justify-center">
                      <User className="w-8 h-8 text-white dark:text-[#171717]" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-[#171717] dark:text-white">
                        {selectedUser.name || "Unknown User"}
                      </h2>
                      <p className="text-sm text-[#17171799] dark:text-[#fafafacc]">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
                    {[
                      { label: "Member Since", value: formatDate(selectedUser.createdAt) },
                      { label: "Last Login", value: formatDate(selectedUser.lastLogin) },
                      { label: "Generated", value: `${userContent.length} items` },
                      { label: "User ID", value: selectedUser.uid }
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-2xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2E2E2E] p-3"
                      >
                        <p className="text-xs uppercase tracking-wide text-[#17171766] dark:text-[#fafafa66]">
                          {stat.label}
                        </p>
                        <p className="text-sm font-semibold text-[#171717] dark:text-white truncate">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#171717] dark:text-white">
                    Generated Content ({userContent.length})
                  </h3>
                </div>
                {contentLoading ? (
                  loadingState
                ) : userContent.length === 0 ? (
                  <div className="p-12 text-center text-[#17171799] dark:text-[#fafafacc]">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No content yet</p>
                    <p className="text-sm">This user has not generated any content.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
                    {userContent.map((content) => (
                      <div
                        key={content._id}
                        className="p-5 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition"
                        onClick={() => handleContentClick(content)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${getContentTypeColor(content.type)}`}
                            >
                              {getContentTypeIcon(content.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#171717] dark:text-white truncate">
                                {content.title || "Untitled content"}
                              </p>
                              <p className="text-xs text-[#17171799] dark:text-[#fafafacc] mt-1">
                                {formatDate(content.createdAt)}
                              </p>
                            </div>
                          </div>
                          {content.url && (
                            <a
                              href={content.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition"
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
            </>
          ) : (
            <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-12 text-center shadow-lg">
              <UsersIcon className="w-20 h-20 text-[#17171799] dark:text-[#fafafacc] mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-semibold text-[#171717] dark:text-white">Select a User</h3>
              <p className="text-sm text-[#17171799] dark:text-[#fafafacc] mt-2">
                Choose a user from the directory to inspect their activity and content history.
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedContent && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedContent(null)}
        >
          <div
            className="bg-white dark:bg-[#171717] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-[#2E2E2E]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1a1a1a]">
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
