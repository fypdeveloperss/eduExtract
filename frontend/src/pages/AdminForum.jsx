import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';

function AdminForum() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-2">
              Forum Categories Management
            </h1>
            <p className="text-[#171717cc] dark:text-[#fafafacc]">
              Manage forum categories and their settings
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            + Create Category
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter category name"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
                    required
                    maxLength={100}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter category description"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
                  required
                  maxLength={500}
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2E2E2E]">
            <h2 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc]">
              Existing Categories ({categories.length})
            </h2>
          </div>
          
          {categories.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-2">
                No categories yet
              </h3>
              <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
                Create your first category to organize forum discussions
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Category
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
              {categories.map((category) => (
                <div key={category._id} className="p-6 hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc]">
                          {category.name}
                        </h3>
                        <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                          Order: {category.order}
                        </span>
                        {!category.isActive && (
                          <span className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-[#171717cc] dark:text-[#fafafacc] mb-2">
                        {category.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                        <span>📝 {category.topicCount} topics</span>
                        <span>📅 Created: {new Date(category.createdAt).toLocaleDateString()}</span>
                        {category.lastPostAt && (
                          <span>🕒 Last activity: {new Date(category.lastPostAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="text-red-600 hover:text-red-800 px-3 py-1 rounded text-sm transition-colors"
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
