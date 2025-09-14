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
      <div className="content-detail">
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>Please log in to view this content</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="content-detail">
        <div className="loading-container">
          <Spinner />
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-detail">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => navigate(-1)} className="back-btn">
              Go Back
            </button>
            <button onClick={() => window.location.reload()} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="content-detail">
        <div className="not-found">
          <h2>Content Not Found</h2>
          <p>The content you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate(-1)} className="back-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-detail">
      <div className="content-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
        <h1 className="content-title">{content.title}</h1>
        <div className="content-meta">
          <span className="content-type">{content.contentType || 'Document'}</span>
          <span className="content-author">By {content.createdByName || 'Unknown'}</span>
          <span className="content-date">
            {formatDate(content.createdAt)}
          </span>
        </div>
      </div>

      <div className="content-body">
        
        
        <ContentRenderer content={content} />
      </div>
    </div>
  );
};

export default SharedContentView;