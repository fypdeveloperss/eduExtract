import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import PageLoader from '../components/PageLoader';
import LoaderSpinner from '../components/LoaderSpinner';
import { Plus, Edit, Trash2, Folder, X, Calendar, MessageSquare } from 'lucide-react';

function AdminForum() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order: 0
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/forum/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'order' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      if (editingCategory) {
        await api.put(`/api/forum/categories/${editingCategory._id}`, formData);
        setSuccess('Category updated successfully');
      } else {
        await api.post('/api/forum/categories', formData);
        setSuccess('Category created successfully');
      }
      
      await fetchCategories();
      setShowCreateForm(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', order: 0 });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving category:', error);
      setError(error.response?.data?.error || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      order: category.order
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category? This will also delete all topics in this category.')) {
      return;
    }

    try {
      await api.delete(`/api/forum/categories/${categoryId}`);
      setSuccess('Category deleted successfully');
      await fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting category:', error);
      setError(error.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', order: 0 });
    setError('');
    setSuccess('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">
              Forum Categories Management
            </h1>
            <p className="text-[#171717cc] dark:text-[#fafafacc]">
              Manage forum categories and their settings
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2.5 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Category
          </button>
        </div>
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

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#171717] dark:text-[#fafafa]" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter category name"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
                  required
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter category description"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
                required
                maxLength={500}
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-4 py-2.5 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? (
                  <>
                    <LoaderSpinner size="sm" />
                    <span className="ml-2">{editingCategory ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  editingCategory ? 'Update Category' : 'Create Category'
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] text-[#171717] dark:text-[#fafafa] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f]">
          <h2 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] flex items-center">
            <Folder className="w-5 h-5 mr-2" />
            Existing Categories ({categories.length})
          </h2>
        </div>
        
        {categories.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-[#171717cc] dark:text-[#fafafacc]" />
            </div>
            <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
              No categories yet
            </h3>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
              Create your first category to organize forum discussions
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2.5 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Category
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
            {categories.map((category) => (
              <div key={category._id} className="p-6 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                        {category.name}
                      </h3>
                      <span className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-[#2E2E2E] text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] bg-gray-50 dark:bg-[#1f1f1f]">
                        Order {category.order}
                      </span>
                      {!category.isActive && (
                        <span className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-[#2E2E2E] text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-3">
                      {category.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#171717cc] dark:text-[#fafafacc]">
                      <span className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        {category.topicCount || 0} topics
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1.5" />
                        Created: {formatDate(category.createdAt)}
                      </span>
                      {category.lastPostAt && (
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          Last activity: {formatDate(category.lastPostAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex items-center px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors font-medium"
                    >
                      <Edit className="w-4 h-4 mr-1.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category._id)}
                      className="flex items-center px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete
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
}

export default AdminForum;
