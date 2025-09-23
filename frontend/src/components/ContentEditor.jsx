import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';

const ContentEditor = ({ content, spaceId, onClose, onSubmitRequest }) => {
  const { user } = useAuth();
  const [editedContent, setEditedContent] = useState('');
  const [changeTitle, setChangeTitle] = useState('');
  const [changeDescription, setChangeDescription] = useState('');
  const [aiAssistMode, setAiAssistMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    if (content) {
      setEditedContent(typeof content.content === 'string' ? content.content : JSON.stringify(content.content, null, 2));
      setChangeTitle(`Update ${content.title}`);
    }
  }, [content]);

  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    try {
      const response = await api.post('/api/collaborate/content/ai-assist', {
        content: editedContent,
        prompt: aiPrompt,
        contentType: content.contentType || 'text'
      });

      if (response.data.success) {
        setEditedContent(response.data.enhancedContent);
        setAiPrompt('');
        setShowDiff(true);
      }
    } catch (error) {
      console.error('AI assist error:', error);
      alert('Error getting AI assistance. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitChangeRequest = async () => {
    if (!changeTitle.trim() || !changeDescription.trim()) {
      alert('Please provide a title and description for your change request.');
      return;
    }

    if (editedContent === (typeof content.content === 'string' ? content.content : JSON.stringify(content.content, null, 2))) {
      alert('No changes detected. Please make some changes before submitting a request.');
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
        alert('Change request submitted successfully!');
        onSubmitRequest?.();
        onClose();
      }
    } catch (error) {
      console.error('Error submitting change request:', error);
      alert('Error submitting change request. Please try again.');
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
            <h4 className="font-semibold text-red-700 mb-2">Original Content</h4>
            <div className="bg-red-50 border border-red-200 rounded p-3 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">{originalLines.join('\n')}</pre>
            </div>
          </div>
          <div className="edited">
            <h4 className="font-semibold text-green-700 mb-2">Proposed Changes</h4>
            <div className="bg-green-50 border border-green-200 rounded p-3 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">{editedLines.join('\n')}</pre>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!content) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Content: {content.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'edit'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Edit Content
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'ai'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'diff'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            View Changes
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-96 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Edit your content here..."
                />
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  🤖 AI Content Assistant
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Describe how you'd like to improve or modify the content. The AI will help enhance it based on your instructions.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI Prompt
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 'Make this more concise and add bullet points' or 'Improve the writing style and fix grammar'"
                />
              </div>

              <button
                onClick={handleAiAssist}
                disabled={aiLoading || !aiPrompt.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium flex items-center"
              >
                {aiLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="mr-2">✨</span>
                    Enhance with AI
                  </>
                )}
              </button>

              {editedContent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Content
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">{editedContent}</pre>
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
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Change Request Title
              </label>
              <input
                type="text"
                value={changeTitle}
                onChange={(e) => setChangeTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Brief title for your changes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Describe what you changed and why"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {aiAssistMode ? '✨ AI-assisted changes' : '✏️ Manual changes'}
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitChangeRequest}
                disabled={submitting || !changeTitle.trim() || !changeDescription.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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