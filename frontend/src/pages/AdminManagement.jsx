import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { useAuth } from '../context/FirebaseAuthContext';
import { Plus, Trash2, Shield, ShieldCheck, Users, Mail, Calendar, Search, X } from 'lucide-react';

const formatNumber = (value, fallback = '—') => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return fallback;
  }
  return Number(value).toLocaleString();
};

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAdmins(admins);
    } else {
      const filtered = admins.filter(
        (admin) =>
          admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAdmins(filtered);
    }
  }, [searchQuery, admins]);

  const fetchAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/admin/admins');
      setAdmins(response.data);
      setFilteredAdmins(response.data);
    } catch (err) {
      setError('Failed to fetch admins: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) {
      setError('Email is required');
      return;
    }

    setIsAddingAdmin(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/api/admin/admins', {
        email: newAdminEmail.trim(),
        role: newAdminRole
      });

      setSuccess(`Successfully added ${newAdminEmail} as ${newAdminRole}`);
      setNewAdminEmail('');
      setNewAdminRole('admin');
      setShowAddForm(false);
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add admin');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const removeAdmin = async (adminUid, adminEmail) => {
    setError('');
    setSuccess('');

    try {
      await api.delete(`/api/admin/admins/${adminUid}`);
      setSuccess(`Successfully removed ${adminEmail} from admins`);
      fetchAdmins();
      setShowConfirmDialog(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove admin');
    }
  };

  const updateRole = async (adminUid, newRole, adminEmail) => {
    setError('');
    setSuccess('');

    try {
      await api.put(`/api/admin/admins/${adminUid}/role`, { role: newRole });
      setSuccess(`Successfully updated ${adminEmail}'s role to ${newRole}`);
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'super_admin':
        return <ShieldCheck className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'admin':
        return <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'moderator':
        return <Users className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default:
        return <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'admin':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'moderator':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isHardcodedAdmin = (admin) => {
    return admin.addedBy === admin.uid || !admin.addedBy;
  };

  const totalAdmins = admins.length;
  const superAdmins = admins.filter((admin) => admin.role === 'super_admin').length;
  const moderators = admins.filter((admin) => admin.role === 'moderator').length;
  const standardAdmins = admins.filter((admin) => admin.role === 'admin').length;
  const lastRefreshed = admins.length ? formatDate(admins[0].createdAt) : '—';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171717] via-[#0f0f0f] to-[#050505] text-white p-8 shadow-2xl border border-white/10">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Access Control</p>
            <h1 className="text-3xl font-bold">Admin Command Hub</h1>
            <p className="text-sm text-white/70">
              Grant permissions, monitor elevated accounts, and keep the Guardian layer healthy.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs text-white/60">Total Guardians</p>
                <p className="text-3xl font-bold mt-1">{formatNumber(totalAdmins)}</p>
                <p className="text-xs text-emerald-300 mt-1">Live directory</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs text-white/60">Last Updated</p>
                <p className="text-base font-semibold mt-1">{lastRefreshed}</p>
                <p className="text-xs text-white/70 mt-1">Timestamp</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {[
            {
              label: 'Super Admins',
              value: superAdmins,
              icon: ShieldCheck,
              tone: 'from-emerald-500/15 to-transparent'
            },
            {
              label: 'Admins',
              value: standardAdmins,
              icon: Shield,
              tone: 'from-sky-500/15 to-transparent'
            },
            {
              label: 'Moderators',
              value: moderators,
              icon: Users,
              tone: 'from-purple-500/15 to-transparent'
            }
          ].map((item) => (
            <div
              key={item.label}
              className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-4 shadow"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.tone}`} />
              <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-[#222222]">
                  <item.icon className="w-5 h-5 text-[#171717] dark:text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66]">
                    {item.label}
                  </p>
                  <p className="text-2xl font-semibold text-[#171717] dark:text-white">
                    {formatNumber(item.value)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-[#171717] dark:text-white">Directory Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#17171799] dark:text-[#fafafacc]" />
              <input
                type="text"
                placeholder="Search admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
              />
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-4 py-2.5 font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? 'Close Admin Form' : 'Add Admin'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      {showAddForm && (
        <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66]">
                Access Invite
              </p>
              <h2 className="text-2xl font-semibold text-[#171717] dark:text-white">
                Add new admin
              </h2>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 rounded-lg border border-gray-200 dark:border-[#2E2E2E] hover:bg-gray-50 dark:hover:bg-[#1f1f1f]"
            >
              <X className="w-4 h-4 text-[#171717] dark:text-white" />
            </button>
          </div>

          <form onSubmit={addAdmin} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[#171717] dark:text-white mb-2 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#17171799] dark:text-[#fafafacc]" />
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                    required
                  />
                </div>
                <p className="text-xs text-[#17171799] dark:text-[#fafafacc] mt-2">
                  User must already exist in the system.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#171717] dark:text-white mb-2 block">
                  Role
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] px-4 py-2.5 text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                >
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isAddingAdmin}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold text-white transition ${
                  isAddingAdmin
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-[#171717] hover:opacity-90'
                }`}
              >
                <Plus className="w-4 h-4" />
                {isAddingAdmin ? 'Adding...' : 'Invite Admin'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewAdminEmail('');
                  setNewAdminRole('admin');
                }}
                className="rounded-lg border border-gray-200 dark:border-[#2E2E2E] px-5 py-2.5 text-sm font-semibold text-[#171717] dark:text-white hover:bg-gray-50 dark:hover:bg-[#1f1f1f]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1a1a1a] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66]">
              Guardian Directory
            </p>
            <h2 className="text-xl font-semibold text-[#171717] dark:text-white">
              Current Admins ({filteredAdmins.length})
            </h2>
          </div>
          <p className="text-xs text-[#17171799] dark:text-[#fafafacc]">Roles update instantly.</p>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full border-b-2 border-[#171717] dark:border-[#fafafa] animate-spin" />
            <p className="text-sm text-[#17171799] dark:text-[#fafafacc]">Loading admins...</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-[#17171799] dark:text-[#fafafacc]">
            <Shield className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-semibold">No admins found</p>
            <p className="text-sm mt-1">Add your first admin to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
            {filteredAdmins.map((admin) => (
              <div key={admin.uid} className="p-6 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-1 items-start gap-4">
                    <div className="p-3 rounded-2xl bg-gray-100 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2E2E2E]">
                      {getRoleIcon(admin.role)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-[#171717] dark:text-white">
                          {admin.name || 'Unknown User'}
                        </p>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${getRoleBadgeColor(admin.role)}`}
                        >
                          {admin.role.replace('_', ' ').toUpperCase()}
                        </span>
                        {isHardcodedAdmin(admin) && (
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
                            System Admin
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-[#17171799] dark:text-[#fafafacc]">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-4 h-4" />
                          {admin.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Added {formatDate(admin.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {admin.role !== 'super_admin' && !isHardcodedAdmin(admin) && (
                      <select
                        value={admin.role}
                        onChange={(e) => updateRole(admin.uid, e.target.value, admin.email)}
                        className="text-sm rounded-lg border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] px-4 py-2 text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                      >
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                      </select>
                    )}
                    {admin.uid !== user?.uid && !isHardcodedAdmin(admin) && (
                      <button
                        onClick={() => setShowConfirmDialog({ uid: admin.uid, email: admin.email })}
                        className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Remove admin"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirmDialog(null)}>
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-[#2E2E2E]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
                Confirm Admin Removal
              </h3>
              <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">
                Are you sure you want to remove <strong className="text-[#171717] dark:text-[#fafafa]">{showConfirmDialog.email}</strong> from admin access?
                This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => removeAdmin(showConfirmDialog.uid, showConfirmDialog.email)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
                >
                  Remove Admin
                </button>
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className="flex-1 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] text-[#171717] dark:text-[#fafafa] px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
