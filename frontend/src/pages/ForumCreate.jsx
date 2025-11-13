import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import PageLoader from '../components/PageLoader';
import LoaderSpinner from '../components/LoaderSpinner';

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
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* Breadcrumb */}
        <nav>
          <ol className="flex items-center gap-2 text-xs md:text-sm text-[#171717cc] dark:text-[#fafafacc]">
            <li>
              <button
                onClick={() => navigate('/forum')}
                className="hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors"
              >
                Forum
              </button>
            </li>
            <li className="text-[#17171733] dark:text-[#fafafa22]">/</li>
            <li className="text-[#171717cc] dark:text-[#fafafacc] font-medium">
              Create Topic
            </li>
          </ol>
        </nav>
 
        {/* Header */}
        <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-lg px-6 py-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">
            Create New Topic
          </h1>
          <p className="text-sm md:text-base text-[#171717cc] dark:text-[#fafafacc] max-w-2xl mx-auto">
            Share your question, idea, or insight with the community. Keep it focused and provide enough detail to spark a great discussion.
          </p>
        </div>
 
        {/* Form */}
        <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-lg p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="border border-gray-200 dark:border-[#2E2E2E] rounded-lg p-4 bg-white dark:bg-[#171717] text-sm text-[#171717cc] dark:text-[#fafafacc]">
                {error}
              </div>
            )}
 
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                Category *
              </label>
              {categories.length === 0 ? (
                <div className="w-full px-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-gray-50 dark:bg-[#1E1E1E] text-center">
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-3">
                    No categories available yet.
                  </p>
                  <button
                    type="button"
                    onClick={initializeCategories}
                    className="text-sm text-[#171717] dark:text-[#fafafa] underline hover:text-[#171717cc] dark:hover:text-[#fafafacc]"
                  >
                    Initialize Default Categories
                  </button>
                </div>
              ) : (
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa]"
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
              <p className="text-sm text-[#17171799] dark:text-[#fafafa99] mt-1">
                Choose the most appropriate category for your topic
              </p>
            </div>
 
            {/* Topic Title */}
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                Topic Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter a descriptive title for your topic"
                className="w-full px-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66]"
                required
                maxLength={200}
              />
              <p className="text-xs text-[#17171799] dark:text-[#fafafa99] mt-1">
                {formData.title.length}/200 characters
              </p>
            </div>
 
            {/* Topic Content */}
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                Content *
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Write your topic content here. Be clear and descriptive to help others understand your discussion."
                rows={8}
                className="w-full px-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66]"
                required
                maxLength={5000}
              />
              <p className="text-xs text-[#17171799] dark:text-[#fafafa99] mt-1">
                {formData.content.length}/5000 characters
              </p>
            </div>
 
            {/* Guidelines */}
            <div className="border border-gray-200 dark:border-[#2E2E2E] rounded-lg p-4 bg-gray-50 dark:bg-[#1E1E1E]">
              <h4 className="font-medium text-[#171717] dark:text-[#fafafa] mb-3 flex items-center gap-2">
                <span className="text-lg">📝</span> Posting Guidelines
              </h4>
              <ul className="text-sm text-[#17171799] dark:text-[#fafafa99] space-y-2 text-left">
                <li>• Be respectful and constructive in your discussions.</li>
                <li>• Use clear, descriptive titles that capture your topic.</li>
                <li>• Provide context and details to help others understand.</li>
                <li>• Search for similar discussions before starting a new one.</li>
                <li>• Follow the community standards and keep things on topic.</li>
              </ul>
            </div>
 
            {/* Submit Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-3">
              <button
                type="button"
                onClick={() => navigate('/forum')}
                className="px-6 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.title.trim() || !formData.content.trim() || !formData.categoryId}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
              >
                {submitting ? (
                  <>
                    <LoaderSpinner size="sm" />
                    Creating...
                  </>
                ) : (
                  'Create Topic'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForumCreate;
