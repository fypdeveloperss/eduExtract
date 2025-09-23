import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { useAuth } from '../context/FirebaseAuthContext';
import { Plus, Trash2, Shield, ShieldCheck, Users, Mail, Calendar, Eye, EyeOff } from 'lucide-react';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    console.log('AdminManagement mounted, user:', user);
    fetchAdmins();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      console.log('Checking admin status...');
      const response = await api.get('/api/admin/check-enhanced');
      console.log('Admin status response:', response.data);
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const debugAdminStatus = async () => {
    try {
      console.log('Running debug check...');
      const response = await api.get('/api/admin/debug/admin-status');
      console.log('Debug response:', response.data);
      setSuccess(`Debug info logged to console. Check developer tools.`);
    } catch (err) {
      console.error('Debug failed:', err);
      setError('Debug failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching admins...');
      const response = await api.get('/api/admin/admins');
      console.log('Admins response:', response.data);
      setAdmins(response.data);
    } catch (err) {
      console.error('Error fetching admins:', err);
      console.error('Error response:', err.response?.data);
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
      const response = await api.post('/api/admin/admins', {
        email: newAdminEmail.trim(),
        role: newAdminRole
      });

      setSuccess(`Successfully added ${newAdminEmail} as ${newAdminRole}`);
      setNewAdminEmail('');
      setNewAdminRole('admin');
      fetchAdmins(); // Refresh the list
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
      fetchAdmins(); // Refresh the list
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
      fetchAdmins(); // Refresh the list
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'super_admin':
        return <ShieldCheck className="w-4 h-4 text-red-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'moderator':
        return <Users className="w-4 h-4 text-green-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'moderator':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
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

  const isHardcodedAdmin = (admin) => {
    // Check if this is a hardcoded admin (they won't have addedBy or it will be themselves)
    return admin.addedBy === admin.uid || !admin.addedBy;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-2">
          Admin Management
        </h1>
        <p className="text-[#171717cc] dark:text-[#fafafacc]">
          Manage admin users and their permissions
        </p>
        {/* Debug info */}
        <div className="mt-2 text-xs text-[#171717cc] dark:text-[#fafafacc] flex items-center gap-4">
          <span>Debug: User UID: {user?.uid || 'Not logged in'}</span>
          <button 
            onClick={debugAdminStatus}
            className="px-2 py-1 bg-gray-200 dark:bg-[#2E2E2E] rounded text-xs hover:bg-gray-300 dark:hover:bg-[#3E3E3E] text-[#171717cc] dark:text-[#fafafacc]"
          >
            Debug Admin Status
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      {/* Add Admin Form */}
      <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 mb-8">
        <h2 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add New Admin
        </h2>
        
        <form onSubmit={addAdmin} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="Enter user's email address"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-[#2E2E2E] dark:text-[#fafafacc] text-[#171717cc]"
                  required
                />
              </div>
              <p className="text-xs text-[#171717cc] dark:text-[#fafafacc] mt-1">
                User must be registered in the system first
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                Role
              </label>
              <select
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-[#2E2E2E] dark:text-[#fafafacc] text-[#171717cc]"
              >
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isAddingAdmin}
            className={`flex items-center px-4 py-2 rounded-md text-white ${
              isAddingAdmin
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors`}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isAddingAdmin ? 'Adding...' : 'Add Admin'}
          </button>
        </form>
      </div>

      {/* Admins List */}
      <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E]">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E]">
          <h2 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Current Admins ({admins.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-[#171717cc] dark:text-[#fafafacc]">Loading admins...</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center text-[#171717cc] dark:text-[#fafafacc]">
            No admins found
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
            {admins.map((admin) => (
              <div key={admin.uid} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getRoleIcon(admin.role)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] truncate">
                          {admin.name}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(admin.role)}`}>
                          {admin.role.replace('_', ' ')}
                        </span>
                        {isHardcodedAdmin(admin) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            System Admin
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 flex items-center text-sm text-[#171717cc] dark:text-[#fafafacc] space-x-4">
                        <span className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {admin.email}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
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
                        className="text-sm px-2 py-1 border border-gray-300 dark:border-[#2E2E2E] rounded dark:bg-[#2E2E2E] dark:text-[#fafafacc] text-[#171717cc]"
                      >
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                      </select>
                    )}

                    {/* Remove Button */}
                    {admin.uid !== user?.uid && !isHardcodedAdmin(admin) && (
                      <button
                        onClick={() => setShowConfirmDialog({ uid: admin.uid, email: admin.email })}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Remove admin"
                      >
                        <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#171717] rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-[#2E2E2E]">
            <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4">
              Confirm Admin Removal
            </h3>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">
              Are you sure you want to remove <strong>{showConfirmDialog.email}</strong> from admin access?
              This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => removeAdmin(showConfirmDialog.uid, showConfirmDialog.email)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Remove Admin
              </button>
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
