import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import Spinner from '../components/Spinner';
import './ContentDetail.css';
import ContentRenderer from '../components/ContentRenderer';


const SharedContentView = () => {
  const { contentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchContent = async () => {
      try {
        setLoading(true);
        console.log(`Fetching shared content with ID: ${contentId}`);
        
        const response = await api.get(`/api/collaborate/content/${contentId}`);
        
        if (response.data.success) {
          console.log('Content fetched successfully:', response.data);
          setContent(response.data.content);
          console.log(response.data.content);
          
        } else {
          console.error('API returned success: false', response.data);
          setError('Failed to fetch content: ' + (response.data.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        const errorMessage = err.response?.data?.error || err.message || 'An error occurred';
        setError(`Failed to fetch content: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [contentId, user]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">Authentication Required</h2>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">Please log in to view this content</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <Spinner />
            <p className="text-[#171717cc] dark:text-[#fafafacc] text-lg">Loading content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-3">Error</h2>
            <p className="text-red-700 dark:text-red-300 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => navigate(-1)} 
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-all text-sm font-semibold"
              >
                Go Back
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">Content Not Found</h2>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">The content you're looking for doesn't exist or has been removed.</p>
            <button 
              onClick={() => navigate(-1)} 
              className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* Header */}
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg p-6">
          <button 
            onClick={() => navigate(-1)} 
            className="mb-4 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-all text-sm font-semibold"
          >
            ← Back
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-4">{content.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            <span className="px-3 py-1 bg-gray-50 dark:bg-[#1f1f1f] rounded-lg border border-gray-200 dark:border-[#fafafa1a]">
              {content.contentType || 'Document'}
            </span>
            <span>By {content.createdByName || 'Unknown'}</span>
            <span>•</span>
            <span>{formatDate(content.createdAt)}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg p-6">
          <ContentRenderer content={content} />
        </div>
      </div>
    </div>
  );
};

export default SharedContentView;