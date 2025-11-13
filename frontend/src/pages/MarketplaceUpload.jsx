import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import LoaderSpinner from '../components/LoaderSpinner';

function MarketplaceUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subject: '',
    difficulty: 'beginner',
    tags: '',
    price: 0,
    currency: 'USD'
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const categories = [
    { value: 'mathematics', label: 'Mathematics', icon: '🔢' },
    { value: 'science', label: 'Science', icon: '🔬' },
    { value: 'history', label: 'History', icon: '📚' },
    { value: 'literature', label: 'Literature', icon: '📖' },
    { value: 'languages', label: 'Languages', icon: '🌍' },
    { value: 'arts', label: 'Arts', icon: '🎨' },
    { value: 'technology', label: 'Technology', icon: '💻' },
    { value: 'business', label: 'Business', icon: '💼' },
    { value: 'health', label: 'Health', icon: '🏥' },
    { value: 'other', label: 'Other', icon: '📁' }
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];



  const currencies = [
    { value: 'USD', label: 'USD ($)', symbol: '$' },
    { value: 'EUR', label: 'EUR (€)', symbol: '€' },
    { value: 'GBP', label: 'GBP (£)', symbol: '£' },
    { value: 'INR', label: 'INR (₹)', symbol: '₹' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Only PDF, DOC, DOCX, TXT, PPT, PPTX, and image files are allowed.');
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to upload content');
      return;
    }

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      const formDataToSend = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        if (key === 'tags') {
          // Convert tags string to array
          const tagsArray = formData[key].split(',').map(tag => tag.trim()).filter(tag => tag);
          formDataToSend.append(key, JSON.stringify(tagsArray));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Always set contentType to 'document' for file uploads
      formDataToSend.append('contentType', 'document');

      // Add file
      if (selectedFile) {
        formDataToSend.append('document', selectedFile);
      }

      const response = await api.post('/api/marketplace/upload', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      setSuccess('Content uploaded successfully! It will be reviewed and approved soon.');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        subject: '',
        difficulty: 'beginner',
        tags: '',
        price: 0,
        currency: 'USD'
      });
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Redirect to marketplace after a delay
      setTimeout(() => {
        navigate('/marketplace');
      }, 2000);

    } catch (err) {
      setError(err?.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 border border-gray-200 dark:border-[#2E2E2E] bg-gray-100 dark:bg-[#1E1E1E] rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">Access Required</h2>
          <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
            Please sign in to upload content to the marketplace.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full px-6 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#171717] py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-4">
            Share Your Knowledge
          </h1>
          <p className="text-xl text-[#171717cc] dark:text-[#fafafacc] max-w-2xl mx-auto">
            Upload educational content, documents, and resources to help others learn. 
            Set your price and start earning from your expertise.
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="border-b border-gray-200 dark:border-[#2E2E2E] pb-6">
              <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
                <span className="w-8 h-8 bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mr-3">
                  📝
                </span>
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    Content Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
                    placeholder="Enter a descriptive title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
                  
                    required
                  >
                    <option value="" className="text-[#171717cc] dark:text-[#fafafacc]">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value} className="text-[#171717cc] dark:text-[#fafafacc]">
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
                    placeholder="e.g., Algebra, Physics, World War II"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    Difficulty Level *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {difficulties.map(diff => (
                      <label
                        key={diff.value}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.difficulty === diff.value
                            ? 'border-[#171717] dark:border-[#fafafa] bg-gray-100 dark:bg-[#1E1E1E]'
                            : 'border-gray-200 dark:border-[#2E2E2E] hover:bg-gray-50 dark:hover:bg-[#2E2E2E]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="difficulty"
                          value={diff.value}
                          checked={formData.difficulty === diff.value}
                          onChange={handleInputChange}
                          className="mr-2 accent-[#171717] dark:accent-[#fafafa]"
                        />
                        <span className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">
                          {diff.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
                  placeholder="Describe your content, what learners will gain, and any prerequisites..."
                  required
                />
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
                  placeholder="Enter tags separated by commas (e.g., calculus, derivatives, math)"
                />
                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                  Tags help others discover your content
                </p>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="border-b border-gray-200 dark:border-[#2E2E2E] pb-6">
              <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
                <span className="w-8 h-8 bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mr-3">
                  📁
                </span>
                File Upload
              </h3>

              <div>
                <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                  Upload File *
                </label>
                
                <div className="border-2 border-dashed border-gray-300 dark:border-[#2E2E2E] rounded-lg p-6 text-center transition-colors hover:border-[#171717] dark:hover:border-[#fafafa]">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                    className="hidden"
                  />
                  
                  {!selectedFile ? (
                    <div>
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📄</span>
                      </div>
                      <p className="text-[#171717cc] dark:text-[#fafafacc] mb-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[#171717] dark:text-[#fafafa] hover:opacity-90 font-medium"
                        >
                          Click to upload
                        </button>
                        {' '}or drag and drop
                      </p>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                        PDF, DOC, DOCX, TXT, PPT, PPTX, JPG, PNG, GIF (max 10MB)
                      </p>
                    </div>
                  ) : (
                    <div className="text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">
                          {selectedFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-[#171717cc] dark:text-[#fafafacc] hover:opacity-80"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                        Size: {formatFileSize(selectedFile.size)}
                      </p>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                        Type: {selectedFile.type || 'Unknown'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="border-b border-gray-200 dark:border-[#2E2E2E] pb-6">
              <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
                <span className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  💰
                </span>
                Pricing
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    Price
                  </label>
                  <div className="relative">
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-transparent border-none focus:ring-0"
                    >
                      {currencies.map(curr => (
                        <option key={curr.value} value={curr.value} className="text-[#171717cc] dark:text-[#fafafacc]">
                          {curr.symbol}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">
                    Set to 0 for free content
                  </p>
                </div>

                <div className="flex items-end">
                  <div className="border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] rounded-lg p-4 w-full">
                    <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                      💡 <strong>Pricing Tip:</strong> Consider the value and complexity of your content when setting a price.
                      High-quality, comprehensive resources typically command higher prices.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Uploading...</span>
                  <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-[#2E2E2E] rounded-full h-2">
                  <div
                    className="bg-[#171717] dark:bg-[#fafafa] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error & Success Messages */}
            {error && (
              <div className="border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] rounded-lg p-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                {error}
              </div>
            )}

            {success && (
              <div className="border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] rounded-lg p-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/marketplace')}
                className="px-6 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-8 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <LoaderSpinner size="sm" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    Upload Content
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-white dark:bg-[#171717] rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
            <span className="w-8 h-8 bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mr-3">
              ❓
            </span>
            Need Help?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            <div>
              <h4 className="font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">📋 Content Guidelines</h4>
              <p>Ensure your content is original, educational, and follows our community standards.</p>
            </div>
            <div>
              <h4 className="font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">🔍 Quality Check</h4>
              <p>All content undergoes plagiarism detection and quality review before approval.</p>
            </div>
            <div>
              <h4 className="font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">💰 Earnings</h4>
              <p>Earn money from your content when other users purchase it. Set competitive prices!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketplaceUpload;


