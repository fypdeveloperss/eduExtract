import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';

function ForumCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: searchParams.get('category') || ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchCategories();
  }, [user, navigate]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/forum/categories');
      const fetchedCategories = response.data.categories || [];
      setCategories(fetchedCategories);
      
      // If no categories exist, try to initialize default ones
      if (fetchedCategories.length === 0) {
        await initializeCategories();
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const initializeCategories = async () => {
    try {
      const response = await api.post('/api/forum/init-categories');
      if (response.data.success) {
        setCategories(response.data.categories || []);
        console.log('Default categories initialized');
      }
    } catch (error) {
      console.error('Error initializing categories:', error);
      // Don't show error to user as this is automatic
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim() || !formData.categoryId) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const response = await api.post('/api/forum/topics', formData);
      
      // Redirect to the new topic
      navigate(`/forum/topic/${response.data.topic._id}`);
    } catch (error) {
      console.error('Error creating topic:', error);
      setError(error.response?.data?.error || 'Failed to create topic');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            <li>
              <button
                onClick={() => navigate('/forum')}
                className="hover:text-blue-600 transition-colors"
              >
                Forum
              </button>
            </li>
            <li className="text-[#171717cc] dark:text-[#fafafacc]">/</li>
            <li className="text-[#171717cc] dark:text-[#fafafacc] font-medium">
              Create Topic
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-4">
            Create New Topic
          </h1>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">
            Start a new discussion in the community forum
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                Category *
              </label>
              {categories.length === 0 ? (
                <div className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg bg-gray-50 dark:bg-[#2E2E2E] text-center">
                  <p className="text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    No categories available yet.
                  </p>
                  <button
                    type="button"
                    onClick={initializeCategories}
                    className="text-blue-600 hover:text-blue-700 text-sm underline"
                  >
                    Initialize Default Categories
                  </button>
                </div>
              ) : (
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                Choose the most appropriate category for your topic
              </p>
            </div>

            {/* Topic Title */}
            <div>
              <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                Topic Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter a descriptive title for your topic"
                className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
                required
                maxLength={200}
              />
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Topic Content */}
            <div>
              <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                Content *
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Write your topic content here. Be clear and descriptive to help others understand your discussion."
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
                required
                maxLength={5000}
              />
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                {formData.content.length}/5000 characters
              </p>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                📝 Posting Guidelines
              </h4>
              <ul className="text-sm text-[#171717cc] dark:text-[#fafafacc] space-y-1">
                <li>• Be respectful and constructive in your discussions</li>
                <li>• Use clear and descriptive titles</li>
                <li>• Provide context and details in your posts</li>
                <li>• Search for similar topics before creating new ones</li>
                <li>• Follow the community guidelines</li>
              </ul>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/forum')}
                className="px-6 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.title.trim() || !formData.content.trim() || !formData.categoryId}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Topic'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForumCreate;
