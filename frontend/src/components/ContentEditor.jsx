import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useCustomAlerts } from '../hooks/useCustomAlerts';
import api from '../utils/axios';

const ContentEditor = ({ content, spaceId, onClose, onSubmitRequest }) => {
  const { user } = useAuth();
  const { success, error, warning } = useCustomAlerts();
  const [editedContent, setEditedContent] = useState('');
  const [changeTitle, setChangeTitle] = useState('');
  const [changeDescription, setChangeDescription] = useState('');
  const [aiAssistMode, setAiAssistMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  const [showDiff, setShowDiff] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    if (content) {
      setEditedContent(typeof content.content === 'string' ? content.content : JSON.stringify(content.content, null, 2));
      setChangeTitle(`Update ${content.title}`);
    }
    
    // Fetch AI status when component loads
    fetchAiStatus();
  }, [content]);

  const fetchAiStatus = async () => {
    try {
      const response = await api.get('/api/collaborate/ai-status');
      if (response.data.success) {
        setAiStatus(response.data.status);
      }
    } catch (error) {
      console.error('Failed to fetch AI status:', error);
      setAiStatus({ available: false, provider: 'unknown' });
    }
  };

  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) {
      warning('Please enter a prompt for AI assistance', 'Prompt Required');
      return;
    }

    if (!editedContent.trim()) {
      warning('No content to enhance. Please add some content first.', 'Content Required');
      return;
    }

    setAiLoading(true);
    try {
      console.log('Sending AI assist request:', {
        content: editedContent.substring(0, 100) + '...',
        prompt: aiPrompt,
        contentType: content.contentType || 'text'
      });

      const endpoint = '/api/collaborate/content/ai-assist';
      
      const response = await api.post(endpoint, {
        content: editedContent,
        prompt: aiPrompt,
        contentType: content.contentType || content.type || 'text'
      });

      console.log('AI assist response:', response.data);

      if (response.data.success) {
        setEditedContent(response.data.enhancedContent);
        setAiAssistMode(true); // Mark that AI assistance was used
        setAiPrompt('');
        setShowDiff(true);
        setActiveTab('edit'); // Switch to edit tab to show the result
        
        // Show success message with AI service info
        const aiInfo = response.data.aiService;
        
        if (aiInfo?.method === 'groq-ai') {
          console.log(`Content enhanced using ${aiInfo.provider} (${aiInfo.model})`);
        }
        
        console.log('AI enhancement successful:', {
          provider: aiInfo?.provider,
          method: aiInfo?.method,
          model: aiInfo?.model
        });
      } else {
        console.error('AI assist failed:', response.data.error);
        error(`AI assistance failed: ${response.data.error}`, 'AI Error');
      }
    } catch (error) {
      console.error('AI assist error:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error.response) {
        // Server responded with error
        console.log('Error response:', error.response.data);
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        console.log('No response received:', error.request);
        errorMessage = 'Network error: Unable to connect to server. Please check if the backend is running on port 5000.';
      } else {
        // Something happened in setting up the request
        errorMessage = error.message;
      }
      
      error(`Error getting AI assistance: ${errorMessage}`, 'AI Service Error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitChangeRequest = async () => {
    if (!changeTitle.trim() || !changeDescription.trim()) {
      warning('Please provide a title and description for your change request.', 'Details Required');
      return;
    }

    if (editedContent === (typeof content.content === 'string' ? content.content : JSON.stringify(content.content, null, 2))) {
      warning('No changes detected. Please make some changes before submitting a request.', 'No Changes Found');
      return;
    }

    setSubmitting(true);
    try {
      const changeRequestData = {
        title: changeTitle,
        description: changeDescription,
        sharedContentId: content._id,
        collaborationSpaceId: spaceId,
        requestType: 'content_edit',
        changes: {
          type: 'content_update',
          field: 'content',
          oldValue: content.content,
          newValue: editedContent,
          aiAssisted: aiAssistMode
        },
        originalContent: content.content,
        proposedContent: editedContent,
        priority: 'medium'
      };

      const response = await api.post(`/api/collaborate/content/${content._id}/change-requests`, changeRequestData);

      if (response.data.success) {
        success('Change request submitted successfully!', 'Request Submitted');
        onSubmitRequest?.();
        onClose();
      }
    } catch (error) {
      console.error('Error submitting change request:', error);
      error('Error submitting change request. Please try again.', 'Submission Error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDiff = () => {
    const originalLines = (typeof content.content === 'string' ? content.content : JSON.stringify(content.content, null, 2)).split('\n');
    const editedLines = editedContent.split('\n');
    
    return (
      <div className="diff-view">
        <div className="grid grid-cols-2 gap-4">
          <div className="original">
            <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">Original Content</h4>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap text-[#171717] dark:text-[#fafafa]">{originalLines.join('\n')}</pre>
            </div>
          </div>
          <div className="edited">
            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Proposed Changes</h4>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap text-[#171717] dark:text-[#fafafa]">{editedLines.join('\n')}</pre>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!content) return null;

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#171717] rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-lg border border-gray-200 dark:border-[#fafafa1a]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#fafafa1a]">
          <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">
            Edit Content: {content.title}
          </h2>
          <button
            onClick={onClose}
            className="text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-[#fafafa1a]">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'edit'
                ? 'border-b-2 border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                : 'text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
            }`}
          >
            Edit Content
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'ai'
                ? 'border-b-2 border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                : 'text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
            }`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'diff'
                ? 'border-b-2 border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                : 'text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
            }`}
          >
            View Changes
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                  Content
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-96 p-3 border border-gray-200 dark:border-[#fafafa1a] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#1f1f1f] text-[#171717] dark:text-[#fafafa] font-mono text-sm outline-none"
                  placeholder="Edit your content here..."
                />
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#fafafa1a] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-[#171717] dark:text-[#fafafa]">
                    🤖 AI Content Assistant
                  </h3>
                  {aiStatus && (
                    <div className="flex items-center text-xs">
                      <div className={`w-2 h-2 rounded-full mr-1 ${
                        aiStatus.available ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-[#171717cc] dark:text-[#fafafacc]">
                        {aiStatus.available ? `${aiStatus.provider} AI` : 'Fallback Mode'}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[#171717cc] dark:text-[#fafafacc] text-sm">
                  {aiStatus?.available 
                    ? `Powered by ${aiStatus.model || 'Llama'} AI model. Describe how you'd like to improve or modify the content.`
                    : 'Using basic enhancement rules. Describe how you\'d like to improve or modify the content.'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                  AI Prompt
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-200 dark:border-[#fafafa1a] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#1f1f1f] text-[#171717] dark:text-[#fafafa] outline-none"
                  placeholder="e.g., 'Make this more concise and add bullet points' or 'Improve the writing style and fix grammar'"
                />
                
                <div className="mt-2">
                  <p className="text-xs text-[#171717cc] dark:text-[#fafafacc] mb-1">Quick suggestions:</p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Make it more concise',
                      'Add bullet points',
                      'Fix grammar',
                      'Make it professional',
                      'Simplify the language',
                      'Add more details',
                      'Make it engaging'
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setAiPrompt(suggestion)}
                        className="text-xs bg-gray-50 dark:bg-[#1f1f1f] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-[#171717] dark:text-[#fafafa] px-2 py-1 rounded border border-gray-200 dark:border-[#fafafa1a] transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleAiAssist}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-4 py-2 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed font-medium flex items-center transition-opacity outline-none"
                >
                  {aiLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-[#171717] border-t-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">✨</span>
                      Enhance with AI
                    </>
                  )}
                </button>
                
                {aiAssistMode && (
                  <button
                    onClick={() => {
                      setEditedContent(typeof content.content === 'string' ? content.content : JSON.stringify(content.content, null, 2));
                      setAiAssistMode(false);
                      setShowDiff(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] font-medium flex items-center transition-colors outline-none"
                  >
                    <span className="mr-2">↺</span>
                    Reset to Original
                  </button>
                )}
              </div>

              {aiAssistMode && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-green-600 dark:text-green-400 mr-2">✅</span>
                    <span className="font-medium text-green-800 dark:text-green-200">AI Enhancement Applied</span>
                  </div>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Your content has been enhanced using AI. You can view the changes in the Edit tab or compare them in the Diff tab.
                  </p>
                </div>
              )}

              {editedContent && (
                <div>
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                    Current Content Preview
                  </label>
                  <div className="bg-gray-50 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#fafafa1a] rounded-lg p-3 max-h-64 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap text-[#171717] dark:text-[#fafafa]">{editedContent.substring(0, 500)}...</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'diff' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  📝 Content Comparison
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  Review the changes you've made before submitting your change request.
                </p>
              </div>
              {renderDiff()}
            </div>
          )}
        </div>

        {/* Change Request Details */}
        <div className="border-t border-gray-200 dark:border-[#fafafa1a] p-6 bg-gray-50 dark:bg-[#1f1f1f]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">
                Change Request Title
              </label>
              <input
                type="text"
                value={changeTitle}
                onChange={(e) => setChangeTitle(e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-[#fafafa1a] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] outline-none"
                placeholder="Brief title for your changes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">
                Description
              </label>
              <input
                type="text"
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-[#fafafa1a] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] outline-none"
                placeholder="Describe what you changed and why"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                {aiAssistMode ? '✨ AI-assisted changes' : '✏️ Manual changes'}
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors text-sm font-semibold outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitChangeRequest}
                disabled={submitting || !changeTitle.trim() || !changeDescription.trim()}
                className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed font-medium flex items-center transition-opacity outline-none text-sm"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-[#171717] border-t-transparent mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    Submit Change Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentEditor;