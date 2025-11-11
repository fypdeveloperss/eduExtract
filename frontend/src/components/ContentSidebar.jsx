import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Download, ExternalLink, Calendar, GripVertical } from 'lucide-react';
import api from '../utils/axios';
import { useAuth } from '../context/FirebaseAuthContext';
import ContentDetail from './ContentDetail';

const ContentSidebar = ({ contentId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizAttempt, setQuizAttempt] = useState(null);
  
  // Resize functionality
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('contentSidebarWidth');
    return saved ? parseInt(saved, 10) : 768; // Default: 768px (max-w-2xl)
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  const resizeHandleRef = useRef(null);

  const MIN_WIDTH = 400;
  const MAX_WIDTH = 1200;

  useEffect(() => {
    if (!isOpen || !contentId) return;

    const fetchContentDetails = async () => {
      if (!user) {
        setError("Please sign in to view your content.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const idToken = await user.getIdToken();
        const response = await fetch(`http://localhost:5000/api/content/${contentId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("Unauthorized to view this content.");
          }
          throw new Error(`Failed to fetch content: ${response.statusText}`);
        }

        const data = await response.json();
        setContent(data);
        
        // If this is a quiz, fetch quiz attempts
        if (data.type === 'quiz') {
          try {
            const quizAttemptsResponse = await fetch(`http://localhost:5000/api/content/user/quiz-attempts`, {
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });
            
            if (quizAttemptsResponse.ok) {
              const quizAttempts = await quizAttemptsResponse.json();
              const attempt = quizAttempts.find(attempt => {
                const attemptQuizId = attempt.quizId._id ? attempt.quizId._id.toString() : attempt.quizId.toString();
                return attemptQuizId === contentId;
              });
              setQuizAttempt(attempt);
            }
          } catch (err) {
            console.error("Error fetching quiz attempts:", err);
          }
        }
      } catch (err) {
        console.error("Error fetching content details:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchContentDetails();
  }, [contentId, isOpen, user]);

  // Reset state when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setContent(null);
      setQuizAttempt(null);
      setError(null);
      setLoading(true);
    }
  }, [isOpen]);

  // Save width to localStorage
  useEffect(() => {
    localStorage.setItem('contentSidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Resize handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
    setSidebarWidth(clampedWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 z-[60] transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`fixed right-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-[#171717] shadow-2xl z-[70] transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden flex flex-col border-l border-gray-200 dark:border-[#fafafa1a] ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        } ${isResizing ? 'transition-none' : ''}`}
        style={{ width: `${sidebarWidth}px` }}
        aria-hidden={!isOpen}
      >
        {/* Resize Handle */}
        <div
          ref={resizeHandleRef}
          onMouseDown={handleMouseDown}
          className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize group z-10 ${
            isResizing ? 'bg-gray-400 dark:bg-[#fafafa66]' : ''
          }`}
          style={{ touchAction: 'none' }}
        >
          <div className={`absolute left-0 top-0 bottom-0 w-2 hover:bg-gray-300 dark:hover:bg-[#fafafa2a] transition-colors ${
            isResizing ? 'bg-gray-400 dark:bg-[#fafafa66]' : ''
          }`} />
          <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-16 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col gap-1">
              <GripVertical className="w-3 h-3 text-gray-400 dark:text-[#fafafa66] opacity-0 group-hover:opacity-100 transition-opacity" />
              <GripVertical className="w-3 h-3 text-gray-400 dark:text-[#fafafa66] opacity-0 group-hover:opacity-100 transition-opacity" />
              <GripVertical className="w-3 h-3 text-gray-400 dark:text-[#fafafa66] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#fafafa1a] bg-gray-50 dark:bg-[#1E1E1E]">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-6 bg-gray-200 dark:bg-[#fafafa1a] rounded animate-pulse w-3/4"></div>
            ) : content ? (
              <h2 className="text-xl font-bold text-gray-900 dark:text-[#fafafa] truncate">
                {content.title}
              </h2>
            ) : (
              <h2 className="text-xl font-bold text-gray-900 dark:text-[#fafafa]">
                Content Viewer
              </h2>
            )}
            {content && (
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-[#fafafa99]">
                <span className="capitalize">{content.type}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(content.createdAt).toLocaleDateString()}
                </div>
                {content.url && (
                  <>
                    <span>•</span>
                    <a
                      href={content.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-[#fafafacc] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Source
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-200 dark:hover:bg-[#fafafa1a] rounded-lg transition-colors flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-[#fafafa99]" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-[#fafafa1a] rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-[#fafafa1a] rounded animate-pulse w-5/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-[#fafafa1a] rounded animate-pulse w-4/6"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
            </div>
          ) : !content ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-[#fafafa99] text-lg">Content not found.</p>
            </div>
          ) : (
            <ContentDetail content={content} quizAttempt={quizAttempt} />
          )}
        </div>
      </div>
    </>
  );
};

export default ContentSidebar;


