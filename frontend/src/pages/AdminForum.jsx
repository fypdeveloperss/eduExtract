import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import PageLoader from '../components/PageLoader';
import LoaderSpinner from '../components/LoaderSpinner';

function AdminForum() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      
      if (editingCategory) {
        // Update existing category
        await api.put(`/api/forum/categories/${editingCategory._id}`, formData);
      } else {
        // Create new category
        await api.post('/api/forum/categories', formData);
      }
      
      await fetchCategories();
      setShowCreateForm(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', order: 0 });
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
      await fetchCategories();
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
    setSaving(false);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">
              Forum Categories Management
            </h1>
            <p className="text-sm md:text-base text-[#171717cc] dark:text-[#fafafacc]">
              Manage forum categories and their settings
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
          >
            + Create Category
          </button>
        </div>

        {error && (
          <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            {error}
          </div>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h2>
            
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
                    className="w-full px-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66]"
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
                    className="w-full px-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa]"
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
                  className="w-full px-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66]"
                  required
                  maxLength={500}
                />
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  {saving ? (
                    <>
                      <LoaderSpinner size="sm" />
                      {editingCategory ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingCategory ? 'Update Category' : 'Create Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E]">
            <h2 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
              Existing Categories ({categories.length})
            </h2>
          </div>
          
          {categories.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
                No categories yet
              </h3>
              <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
                Create your first category to organize forum discussions
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
              >
                Create First Category
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
              {categories.map((category) => (
                <div key={category._id} className="p-6 hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                          {category.name}
                        </h3>
                        <span className="px-3 py-1 rounded-full border border-gray-200 dark:border-[#2E2E2E] text-xs text-[#17171799] dark:text-[#fafafa99]">
                          Order {category.order}
                        </span>
                        {!category.isActive && (
                          <span className="px-3 py-1 rounded-full border border-gray-200 dark:border-[#2E2E2E] text-xs text-[#171717] dark:text-[#fafafa]">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-2">
                        {category.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                        <span>📝 {category.topicCount} topics</span>
                        <span>📅 Created: {new Date(category.createdAt).toLocaleDateString()}</span>
                        {category.lastPostAt && (
                          <span>🕒 Last activity: {new Date(category.lastPostAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="px-4 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-xs md:text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="px-4 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-xs md:text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors"
                      >
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
    </div>
  );
}

export default AdminForum;
