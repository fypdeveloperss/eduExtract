import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          
          {/* Modal content */}
          <motion.div
            className="relative z-10 bg-white dark:bg-[#171717] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[#fafafa1a]"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#fafafa1a] bg-gray-50 dark:bg-[#121212]">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-100 dark:bg-[#1E1E1E] rounded-xl flex items-center justify-center border border-gray-200 dark:border-[#fafafa1a]">
                  <Link className="w-6 h-6 text-[#171717] dark:text-[#fafafa]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">Add Learning Content</h2>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Paste a link or text to get started</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E1E1E]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Tab Selector */}
              <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-[#1E1E1E] rounded-lg p-1 border border-gray-200 dark:border-[#fafafa1a]">
                <button
                  onClick={() => setActiveTab('url')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all font-medium ${
                    activeTab === 'url'
                      ? 'bg-white dark:bg-[#fafafa] text-[#171717] dark:text-[#171717] shadow-sm border border-gray-200 dark:border-[#fafafa1a]'
                      : 'text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
                  }`}
                >
                  <Globe size={18} />
                  <span>URL/Link</span>
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all font-medium ${
                    activeTab === 'text'
                      ? 'bg-white dark:bg-[#fafafa] text-[#171717] dark:text-[#171717] shadow-sm border border-gray-200 dark:border-[#fafafa1a]'
                      : 'text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
                  }`}
                >
                  <Clipboard size={18} />
                  <span>Text</span>
                </button>
              </div>

              {/* URL Tab */}
              <AnimatePresence mode="wait">
                {activeTab === 'url' && (
                  <motion.div
                    key="url"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
                        Enter a URL or Link
                      </label>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-4">
                        Paste YouTube videos, articles, documents, or any educational content URL
                      </p>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Link className="h-5 w-5 text-[#171717cc] dark:text-[#fafafacc]" />
                        </div>
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="block w-full pl-12 pr-4 py-3.5 border border-[#fafafa1a] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent text-base bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#17171766] dark:placeholder-[#fafafa66] transition-all"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Supported Platforms */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">Supported Platforms</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center border border-red-200 dark:border-red-800/50">
                            <Youtube className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </div>
                          <span className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium">YouTube</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center border border-blue-200 dark:border-blue-800/50">
                            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium">Websites</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center border border-emerald-200 dark:border-emerald-800/50">
                            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium">Documents</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center border border-purple-200 dark:border-purple-800/50">
                            <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="text-sm text-[#171717cc] dark:text-[#fafafacc] font-medium">Articles</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Text Tab */}
                {activeTab === 'text' && (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
                        Paste Your Text Content
                      </label>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-4">
                        Copy and paste notes, articles, or any text content you want to learn from
                      </p>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Paste your notes, articles, or any text content here..."
                        rows={8}
                        className="block w-full px-4 py-3 border border-[#fafafa1a] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent resize-none text-sm bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#17171766] dark:placeholder-[#fafafa66] transition-all"
                        autoFocus
                      />
                    </div>

                    {/* Text Tips */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">💡 Tips for Better Results</h4>
                      <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1.5">
                        <li>• Include complete paragraphs for better context</li>
                        <li>• Add headings and structure when possible</li>
                        <li>• Remove unnecessary formatting or ads</li>
                        <li>• Aim for at least 200-300 words for best results</li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-[#fafafa1a] bg-gray-50 dark:bg-[#121212]">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] font-semibold transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E1E1E]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  (activeTab === 'url' && !url.trim()) || 
                  (activeTab === 'text' && !textContent.trim())
                }
                className="px-6 py-2.5 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
              >
                Add Content
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PasteModal;
