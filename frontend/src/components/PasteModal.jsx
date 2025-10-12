import React, { useState } from 'react';
import { X, Link, Clipboard, Youtube, Globe, FileText, BookOpen } from 'lucide-react';

const PasteModal = ({ isOpen, onClose, onSubmit }) => {
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [activeTab, setActiveTab] = useState('url'); // 'url' or 'text'

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (activeTab === 'url' && url.trim()) {
      onSubmit({ type: 'url', content: url.trim() });
    } else if (activeTab === 'text' && textContent.trim()) {
      onSubmit({ type: 'text', content: textContent.trim() });
    }
    
    // Reset form
    setUrl('');
    setTextContent('');
    onClose();
  };

  const handleClose = () => {
    setUrl('');
    setTextContent('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4" 
      style={{ 
        background: 'rgba(0, 0, 0, 0.6)'
      }}
    >
      {/* Blur overlay */}
      <div 
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          background: 'rgba(0, 0, 0, 0.1)'
        }}
      />
      
      {/* Modal content */}
      <div className="relative z-10 bg-white dark:bg-[#171717] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2E2E2E]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Link className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[#fafafa]">Add Learning Content</h2>
              <p className="text-sm text-gray-500 dark:text-[#fafafacc]">Paste a link or text to get started</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-[#fafafacc] hover:text-gray-600 dark:hover:text-[#fafafa] transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tab Selector */}
          <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-[#2E2E2E] rounded-lg p-1">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${
                activeTab === 'url'
                  ? 'bg-white dark:bg-[#171717] text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-[#fafafacc] hover:text-gray-800 dark:hover:text-[#fafafa]'
              }`}
            >
              <Globe size={18} />
              <span className="font-medium">URL/Link</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${
                activeTab === 'text'
                  ? 'bg-white dark:bg-[#171717] text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-[#fafafacc] hover:text-gray-800 dark:hover:text-[#fafafa]'
              }`}
            >
              <Clipboard size={18} />
              <span className="font-medium">Text</span>
            </button>
          </div>

          {/* URL Tab */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#fafafacc] mb-2">
                  Enter a URL or Link
                </label>
                <p className="text-sm text-gray-500 dark:text-[#fafafacc] mb-4">
                  Paste YouTube videos, articles, documents, or any educational content URL
                </p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link className="h-5 w-5 text-gray-400 dark:text-[#fafafacc]" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] placeholder-gray-500 dark:placeholder-[#fafafacc]"
                  />
                </div>
              </div>

              {/* Supported Platforms */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-400 mb-3">Supported Platforms</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Youtube className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-blue-800 dark:text-blue-300">YouTube</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-800 dark:text-blue-300">Websites</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-blue-800 dark:text-blue-300">Documents</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-blue-800 dark:text-blue-300">Articles</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Text Tab */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#fafafacc] mb-2">
                  Paste Your Text Content
                </label>
                <p className="text-sm text-gray-500 dark:text-[#fafafacc] mb-4">
                  Copy and paste notes, articles, or any text content you want to learn from
                </p>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste your notes, articles, or any text content here..."
                  rows={8}
                  className="block w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] placeholder-gray-500 dark:placeholder-[#fafafacc]"
                />
              </div>

              {/* Text Tips */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 dark:text-green-400 mb-2">💡 Tips for Better Results</h4>
                <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
                  <li>• Include complete paragraphs for better context</li>
                  <li>• Add headings and structure when possible</li>
                  <li>• Remove unnecessary formatting or ads</li>
                  <li>• Aim for at least 200-300 words for best results</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#2E2E2E]">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-gray-600 dark:text-[#fafafacc] hover:text-gray-800 dark:hover:text-[#fafafa] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              (activeTab === 'url' && !url.trim()) || 
              (activeTab === 'text' && !textContent.trim())
            }
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-[#2E2E2E] disabled:cursor-not-allowed font-medium transition-colors"
          >
            Add Content
          </button>
        </div>
      </div>
    </div>
  );
}

export default PasteModal;
