import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import MarketplaceContentSelectionModal from './MarketplaceContentSelectionModal';
import { authenticatedFetch } from '../utils/auth';

const MyContent = () => {
  const { user } = useAuth();
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedContentForPublish, setSelectedContentForPublish] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      if (!user) {
        setError('Please sign in to view your content.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/api/content`);
        setContentList(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch content.');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [user]);

  const handlePublishToMarketplace = (content) => {
    setSelectedContentForPublish(content);
    setShowPublishModal(true);
  };

  const handlePublishContent = async (contentItems) => {
    try {
      const response = await authenticatedFetch('/api/marketplace/publish-existing', {
        method: 'POST',
        body: JSON.stringify({ contentItems }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to publish content');
      }

      // Show success message
      if (result.summary) {
        const { successful, failed, total } = result.summary;
        const approvedCount = result.results.filter(r => r.success && r.status === 'approved').length;
        const pendingCount = result.results.filter(r => r.success && r.status === 'pending').length;
        
        if (failed > 0) {
          alert(`Published ${successful} out of ${total} items. ${failed} items failed to publish. Check console for details.`);
          console.log('Failed items:', result.results.filter(r => !r.success));
        } else {
          let message = `Successfully published ${successful} items to the marketplace!`;
          if (approvedCount > 0) {
            message += `\n✅ ${approvedCount} items are now live and visible.`;
          }
          if (pendingCount > 0) {
            message += `\n⏳ ${pendingCount} items are pending admin approval.`;
          }
          alert(message);
        }
      }
    } catch (error) {
      console.error('Error publishing content:', error);
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) return <div className="text-center mt-8">Loading your content...</div>;
  if (error) return <div className="text-center text-red-500 mt-8">{error}</div>;
  if (!contentList.length) return <div className="text-center mt-8">No content found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-center sm:text-left">My Content</h2>
        {contentList.length > 0 && (
          <button
            onClick={() => setShowPublishModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <span className="mr-2">📚</span>
            Publish to Marketplace
          </button>
        )}
      </div>
      
      <ul className="space-y-4">
        {contentList.map(item => (
          <li key={item._id} className="bg-white dark:bg-zinc-800 rounded-lg shadow p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <Link 
                  to={`/content/${item._id}`} 
                  className="text-lg font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  {item.title}
                </Link>
                <div className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Type: {item.type} • Created: {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 mt-3 lg:mt-0 lg:ml-4">
                <Link
                  to={`/content/${item._id}`}
                  className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <span className="mr-1">👁️</span>
                  View
                </Link>
                
                <button
                  onClick={() => handlePublishToMarketplace(item)}
                  className="inline-flex items-center justify-center bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                >
                  <span className="mr-1">🚀</span>
                  Publish
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Marketplace Content Selection Modal */}
      <MarketplaceContentSelectionModal
        isOpen={showPublishModal}
        onClose={() => {
          setShowPublishModal(false);
          setSelectedContentForPublish(null);
        }}
        onConfirm={handlePublishContent}
        preSelectedContent={selectedContentForPublish}
      />
    </div>
  );
};

export default MyContent; 