import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, BookOpen, ListChecks, StickyNote, HelpCircle, X } from 'lucide-react';

const ChatContextDisplay = ({ contextSummary, onRemoveItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  if (!contextSummary) return null;

  const { currentSession, history, originalSource } = contextSummary;

  const getContentIcon = (type) => {
    switch (type) {
      case 'blog': return <FileText size={16} className="text-blue-600" />;
      case 'quiz': return <HelpCircle size={16} className="text-red-600" />;
      case 'flashcards': return <ListChecks size={16} className="text-yellow-600" />;
      case 'slides': return <StickyNote size={16} className="text-green-600" />;
      case 'summary': return <BookOpen size={16} className="text-purple-600" />;
      default: return <FileText size={16} className="text-gray-600" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getContentTypeCount = () => {
    const counts = {};
    currentSession.forEach(item => {
      counts[item.type] = (counts[item.type] || 0) + 1;
    });
    return counts;
  };

  const contentTypeCounts = getContentTypeCount();
  const totalCurrentItems = currentSession.length;
  const totalHistoryItems = history?.totalItems || 0;

  return (
    <div className="bg-gray-50 dark:bg-[#2E2E2E] border-t border-gray-200 dark:border-[#2E2E2E]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#fafafa1a] transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="text-sm font-semibold text-gray-700 dark:text-[#fafafacc]">
            🤖 AI Context
          </div>
          <div className="flex items-center space-x-1">
            {totalCurrentItems > 0 && (
              <span className="bg-[#171717] dark:bg-[#fafafa] text-[#fafafa] dark:text-[#171717] text-xs px-2 py-1 rounded-full">
                {totalCurrentItems} current
              </span>
            )}
            {totalHistoryItems > 0 && (
              <span className="bg-gray-100 dark:bg-[#171717] text-gray-800 dark:text-[#fafafacc] text-xs px-2 py-1 rounded-full">
                {totalHistoryItems} history
              </span>
            )}
            {originalSource && (
              <span className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                source
              </span>
            )}
          </div>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-gray-700 dark:text-[#fafafacc]" /> : <ChevronDown size={16} className="text-gray-700 dark:text-[#fafafacc]" />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 max-h-64 overflow-y-auto">
          {/* Current Session Content */}
          {totalCurrentItems > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 dark:text-[#fafafacc] mb-2 flex items-center">
                📝 Current Session ({totalCurrentItems} items)
              </div>
              <div className="space-y-2">
                {currentSession.map((item, index) => (
                  <div
                    key={`${item.type}-${index}`}
                    className="flex items-center justify-between p-2 bg-white dark:bg-[#171717] rounded-lg border border-gray-200 dark:border-[#2E2E2E]"
                  >
                    <div className="flex items-center space-x-2">
                      {getContentIcon(item.type)}
                      <span className="text-sm font-medium text-gray-700 dark:text-[#fafafacc] capitalize">
                        {item.type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-[#fafafacc]">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                    {onRemoveItem && (
                      <button
                        onClick={() => onRemoveItem(item.type)}
                        className="text-gray-400 dark:text-[#fafafacc] hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Remove from context"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Original Source */}
          {originalSource && (
            <div>
              <div className="text-xs font-semibold text-gray-600 dark:text-[#fafafacc] mb-2 flex items-center">
                📄 Original Source
              </div>
              <div className="p-2 bg-white dark:bg-[#171717] rounded-lg border border-gray-200 dark:border-[#2E2E2E]">
                <div className="flex items-center space-x-2">
                  {originalSource.type === 'youtube' ? (
                    <div className="w-4 h-4 bg-red-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">YT</span>
                    </div>
                  ) : (
                    <FileText size={16} className="text-blue-600" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-[#fafafacc]">
                    {originalSource.type === 'youtube' ? 'YouTube Video' : 'Document'}
                  </span>
                  {originalSource.hasContent && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      ✓ Content available
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* User History Summary */}
          {totalHistoryItems > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 dark:text-[#fafafacc] mb-2 flex items-center">
                📚 Learning History ({totalHistoryItems} items)
              </div>
              <div className="p-2 bg-white dark:bg-[#171717] rounded-lg border border-gray-200 dark:border-[#2E2E2E]">
                <div className="text-sm text-gray-700 dark:text-[#fafafacc]">
                  {Object.keys(history.contentTypes || {}).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(history.contentTypes).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getContentIcon(type)}
                            <span className="capitalize">{type}s</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-[#fafafacc]">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-[#fafafacc]">
                      Previous content available for context
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No Context Message */}
          {totalCurrentItems === 0 && totalHistoryItems === 0 && !originalSource && (
            <div className="text-center py-4">
              <div className="text-sm text-gray-500 dark:text-[#fafafacc]">
                No context available. Generate some content to enable personalized assistance.
              </div>
            </div>
          )}

          {/* Context Tips */}
          <div className="text-xs text-gray-500 dark:text-[#fafafacc] bg-gray-100 dark:bg-[#171717] p-2 rounded-lg">
            <div className="font-semibold mb-1">💡 Context Tips:</div>
            <ul className="space-y-1 text-xs">
              <li>• Ask questions about your generated content</li>
              <li>• Request explanations of concepts</li>
              <li>• Ask for content improvements</li>
              <li>• Create new materials based on existing content</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContextDisplay;
