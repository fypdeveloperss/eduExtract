import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { useAuth } from '../context/FirebaseAuthContext';
import { Plus, Trash2, Shield, ShieldCheck, Users, Mail, Calendar, Search, X } from 'lucide-react';

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">
          Admin Management
        </h1>
        <p className="text-[#171717cc] dark:text-[#fafafacc]">
          Manage admin users, roles, and permissions
        </p>
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

      {/* Add Admin Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
          <input
            type="text"
            placeholder="Search admins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
          />
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="ml-4 flex items-center px-4 py-2.5 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Admin
        </button>
      </div>

      {/* Add Admin Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Add New Admin
            </h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#171717] dark:text-[#fafafa]" />
            </button>
          </div>
          
          <form onSubmit={addAdmin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="Enter user's email address"
                    className="pl-10 w-full px-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
                    required
                  />
                </div>
                <p className="text-xs text-[#171717cc] dark:text-[#fafafacc] mt-1.5">
                  User must be registered in the system first
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                  Role
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
                >
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={isAddingAdmin}
                className={`flex items-center px-4 py-2.5 rounded-lg font-medium transition-opacity ${
                  isAddingAdmin
                    ? 'bg-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90'
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isAddingAdmin ? 'Adding...' : 'Add Admin'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewAdminEmail('');
                  setNewAdminRole('admin');
                }}
                className="px-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] text-[#171717] dark:text-[#fafafa] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admins List */}
      <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f]">
          <h2 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Current Admins ({filteredAdmins.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto"></div>
            <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Loading admins...</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-[#171717cc] dark:text-[#fafafacc]">
            <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No admins found</p>
            <p className="text-sm">Add your first admin to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
            {filteredAdmins.map((admin) => (
              <div key={admin.uid} className="p-6 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getRoleIcon(admin.role)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <p className="text-base font-semibold text-[#171717] dark:text-[#fafafa]">
                          {admin.name || 'Unknown User'}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getRoleBadgeColor(admin.role)}`}>
                          {admin.role.replace('_', ' ').toUpperCase()}
                        </span>
                        {isHardcodedAdmin(admin) && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                            System Admin
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                        <span className="flex items-center">
                          <Mail className="w-4 h-4 mr-1.5" />
                          {admin.email}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          Added {formatDate(admin.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Role Change Dropdown */}
                    {admin.role !== 'super_admin' && !isHardcodedAdmin(admin) && (
                      <select
                        value={admin.role}
                        onChange={(e) => updateRole(admin.uid, e.target.value, admin.email)}
                        className="text-sm px-3 py-1.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
                      >
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                      </select>
                    )}

                    {/* Remove Button */}
                    {admin.uid !== user?.uid && !isHardcodedAdmin(admin) && (
                      <button
                        onClick={() => setShowConfirmDialog({ uid: admin.uid, email: admin.email })}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
