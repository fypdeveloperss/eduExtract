import { useState, useEffect, useCallback } from 'react';
import api from '../utils/axios';

/**
 * Custom hook for managing content context for the chatbot
 * Handles current session content, original sources, and user history
 */
export const useContentContext = () => {
  // Current session content (generated in this session)
  const [currentSessionContent, setCurrentSessionContent] = useState({
    blog: null,
    quiz: null,
    flashcards: null,
    slides: null,
    summary: null
  });

  // Original source material (YouTube transcript or file content)
  const [originalSource, setOriginalSource] = useState(null);

  // User's content history from database
  const [userHistory, setUserHistory] = useState([]);

  // Context loading states
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [contextError, setContextError] = useState(null);

  // Load user's content history from database
  const loadUserHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      setContextError(null);
      
      const response = await api.get('/api/chat/context');
      
      if (response.data.success) {
        setUserHistory(response.data.context);
        console.log('Loaded user history:', response.data.context);
      } else {
        throw new Error(response.data.error || 'Failed to load history');
      }
    } catch (error) {
      console.error('Error loading user history:', error);
      setContextError(error.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Update current session content when new content is generated
  const updateCurrentSessionContent = useCallback((type, content, metadata = {}) => {
    setCurrentSessionContent(prev => ({
      ...prev,
      [type]: {
        content,
        metadata,
        timestamp: new Date().toISOString()
      }
    }));
    
    console.log(`Updated current session content for ${type}:`, content);
  }, []);

  // Set original source material
  const setOriginalSourceContent = useCallback((source) => {
    setOriginalSource({
      ...source,
      timestamp: new Date().toISOString()
    });
    
    console.log('Set original source:', source);
  }, []);

  // Clear current session content
  const clearCurrentSession = useCallback(() => {
    setCurrentSessionContent({
      blog: null,
      quiz: null,
      flashcards: null,
      slides: null,
      summary: null
    });
    setOriginalSource(null);
    console.log('Cleared current session content');
  }, []);

  // Get context for chatbot
  const getContextForChat = useCallback(() => {
    const context = {
      currentSession: {},
      originalSource: originalSource,
      metadata: {
        hasCurrentSession: false,
        hasOriginalSource: !!originalSource,
        totalHistoryItems: userHistory.totalItems || 0
      }
    };

    // Add current session content that has actual data
    Object.keys(currentSessionContent).forEach(type => {
      const content = currentSessionContent[type];
      if (content && content.content) {
        context.currentSession[type] = content;
        context.metadata.hasCurrentSession = true;
      }
    });

    return context;
  }, [currentSessionContent, originalSource, userHistory]);

  // Check if context has meaningful data
  const hasContext = useCallback(() => {
    const context = getContextForChat();
    return context.metadata.hasCurrentSession || context.metadata.hasOriginalSource || context.metadata.totalHistoryItems > 0;
  }, [getContextForChat]);

  // Get context summary for display
  const getContextSummary = useCallback(() => {
    const summary = {
      currentSession: [],
      history: userHistory,
      originalSource: originalSource ? {
        type: originalSource.type,
        hasContent: !!originalSource.content
      } : null
    };

    // Count current session items
    Object.keys(currentSessionContent).forEach(type => {
      const content = currentSessionContent[type];
      if (content && content.content) {
        summary.currentSession.push({
          type,
          timestamp: content.timestamp,
          metadata: content.metadata
        });
      }
    });

    return summary;
  }, [currentSessionContent, userHistory, originalSource]);

  // Load history on mount
  useEffect(() => {
    loadUserHistory();
  }, [loadUserHistory]);

  return {
    // State
    currentSessionContent,
    originalSource,
    userHistory,
    isLoadingHistory,
    contextError,
    
    // Actions
    updateCurrentSessionContent,
    setOriginalSourceContent,
    clearCurrentSession,
    loadUserHistory,
    
    // Computed values
    getContextForChat,
    hasContext,
    getContextSummary
  };
};

export default useContentContext;
