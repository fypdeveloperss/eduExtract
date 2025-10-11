const GeneratedContent = require('../models/GeneratedContent');

class ChatContextService {
  constructor() {
    this.maxContextTokens = 3000; // Leave room for conversation
    this.maxRecentItems = 20; // Maximum items to fetch from DB
    this.maxCurrentSessionItems = 5; // Items from current session
  }

  /**
   * Build comprehensive context for chatbot
   * @param {string} userId - User ID
   * @param {Object} currentSessionContent - Current session's generated content
   * @param {Object} originalSource - Original source material (transcript/file)
   * @returns {Object} Formatted context for AI
   */
  async buildUserContext(userId, currentSessionContent = {}, originalSource = null) {
    try {
      console.log(`Building context for user: ${userId}`);
      
      // Fetch user's recent content from database
      const userHistory = await this.fetchUserHistory(userId);
      
      // Format current session content
      const formattedCurrentSession = this.formatCurrentSessionContent(currentSessionContent);
      
      // Format user history (summarized)
      const formattedHistory = this.formatUserHistory(userHistory);
      
      // Format original source
      const formattedOriginalSource = this.formatOriginalSource(originalSource);
      
      // Build the complete context
      const context = {
        currentSession: formattedCurrentSession,
        userHistory: formattedHistory,
        originalSource: formattedOriginalSource,
        metadata: {
          totalItems: userHistory.length,
          currentSessionItems: Object.keys(currentSessionContent).length,
          hasOriginalSource: !!originalSource
        }
      };
      
      console.log(`Context built successfully: ${userHistory.length} historical items, ${Object.keys(currentSessionContent).length} current session items`);
      return context;
      
    } catch (error) {
      console.error('Error building user context:', error);
      throw new Error(`Failed to build context: ${error.message}`);
    }
  }

  /**
   * Fetch user's recent content from database
   * @param {string} userId - User ID
   * @returns {Array} Recent content items
   */
  async fetchUserHistory(userId) {
    try {
      const recentContent = await GeneratedContent.find({ userId })
        .sort({ createdAt: -1 })
        .limit(this.maxRecentItems)
        .select('type title contentData url createdAt')
        .lean();
      
      console.log(`Fetched ${recentContent.length} items for user ${userId}`);
      return recentContent;
    } catch (error) {
      console.error('Error fetching user history:', error);
      return [];
    }
  }

  /**
   * Format current session content for AI context
   * @param {Object} currentSessionContent - Current session content
   * @returns {Object} Formatted current session
   */
  formatCurrentSessionContent(currentSessionContent) {
    const formatted = {};
    
    Object.keys(currentSessionContent).forEach(type => {
      const content = currentSessionContent[type];
      if (content && this.hasContent(content)) {
        formatted[type] = this.formatContentForContext(content, type, true); // true = current session
      }
    });
    
    return formatted;
  }

  /**
   * Format user history for AI context (summarized)
   * @param {Array} userHistory - User's content history
   * @returns {Object} Formatted history
   */
  formatUserHistory(userHistory) {
    if (!userHistory || userHistory.length === 0) {
      return { summary: "No previous content found." };
    }

    // Group by type
    const groupedByType = userHistory.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    }, {});

    // Format each type group
    const formatted = {};
    Object.keys(groupedByType).forEach(type => {
      const items = groupedByType[type];
      formatted[type] = this.summarizeContentGroup(items, type);
    });

    return formatted;
  }

  /**
   * Summarize a group of content items of the same type
   * @param {Array} items - Content items
   * @param {string} type - Content type
   * @returns {Object} Summarized content
   */
  summarizeContentGroup(items, type) {
    const count = items.length;
    const recentItems = items.slice(0, 3); // Show details for 3 most recent
    
    let summary = `User has created ${count} ${type}${count > 1 ? 's' : ''}`;
    
    if (recentItems.length > 0) {
      summary += `. Recent ${type}s:`;
      recentItems.forEach((item, index) => {
        const title = item.title || `Untitled ${type}`;
        const date = new Date(item.createdAt).toLocaleDateString();
        summary += `\n- "${title}" (${date})`;
      });
      
      if (count > 3) {
        summary += `\n... and ${count - 3} more ${type}s`;
      }
    }
    
    return {
      count,
      summary,
      recentItems: recentItems.map(item => ({
        id: item._id,
        title: item.title,
        createdAt: item.createdAt,
        preview: this.getContentPreview(item.contentData, type)
      }))
    };
  }

  /**
   * Format original source material
   * @param {Object} originalSource - Original source
   * @returns {Object} Formatted source
   */
  formatOriginalSource(originalSource) {
    if (!originalSource) {
      return null;
    }

    return {
      type: originalSource.type, // 'youtube' or 'file'
      url: originalSource.url,
      content: this.truncateContent(originalSource.content, 1000), // Limit source content
      metadata: {
        length: originalSource.content?.length || 0,
        truncated: (originalSource.content?.length || 0) > 1000
      }
    };
  }

  /**
   * Format individual content for context
   * @param {*} content - Content data
   * @param {string} type - Content type
   * @param {boolean} isCurrentSession - Whether it's from current session
   * @returns {Object} Formatted content
   */
  formatContentForContext(content, type, isCurrentSession = false) {
    if (!content) return null;

    const formatted = {
      type,
      isCurrentSession,
      content: null,
      metadata: {}
    };

    switch (type) {
      case 'blog':
        formatted.content = this.truncateContent(content, isCurrentSession ? 2000 : 500);
        formatted.metadata = {
          length: content.length,
          truncated: content.length > (isCurrentSession ? 2000 : 500)
        };
        break;

      case 'summary':
        formatted.content = this.truncateContent(content, isCurrentSession ? 1000 : 300);
        formatted.metadata = {
          length: content.length,
          truncated: content.length > (isCurrentSession ? 1000 : 300)
        };
        break;

      case 'quiz':
        if (Array.isArray(content)) {
          formatted.content = {
            questionCount: content.length,
            questions: content.slice(0, isCurrentSession ? 5 : 2).map(q => ({
              question: q.question,
              options: q.options?.length || 0,
              answer: q.answer
            }))
          };
          formatted.metadata = {
            totalQuestions: content.length,
            shownQuestions: Math.min(content.length, isCurrentSession ? 5 : 2)
          };
        }
        break;

      case 'flashcards':
        if (Array.isArray(content)) {
          formatted.content = {
            cardCount: content.length,
            cards: content.slice(0, isCurrentSession ? 5 : 3).map(card => ({
              question: card.question,
              answer: this.truncateContent(card.answer, 100)
            }))
          };
          formatted.metadata = {
            totalCards: content.length,
            shownCards: Math.min(content.length, isCurrentSession ? 5 : 3)
          };
        }
        break;

      case 'slides':
        if (Array.isArray(content)) {
          formatted.content = {
            slideCount: content.length,
            slides: content.slice(0, isCurrentSession ? 5 : 3).map(slide => ({
              title: slide.title,
              points: slide.points?.slice(0, 3) || []
            }))
          };
          formatted.metadata = {
            totalSlides: content.length,
            shownSlides: Math.min(content.length, isCurrentSession ? 5 : 3)
          };
        }
        break;

      default:
        formatted.content = this.truncateContent(JSON.stringify(content), 500);
    }

    return formatted;
  }

  /**
   * Get a preview of content for summaries
   * @param {*} contentData - Content data
   * @param {string} type - Content type
   * @returns {string} Content preview
   */
  getContentPreview(contentData, type) {
    if (!contentData) return 'No content';

    switch (type) {
      case 'blog':
        return this.truncateContent(contentData, 100);
      case 'summary':
        return this.truncateContent(contentData, 80);
      case 'quiz':
        if (Array.isArray(contentData)) {
          return `${contentData.length} questions`;
        }
        break;
      case 'flashcards':
        if (Array.isArray(contentData)) {
          return `${contentData.length} cards`;
        }
        break;
      case 'slides':
        if (Array.isArray(contentData)) {
          return `${contentData.length} slides`;
        }
        break;
    }

    return 'Content available';
  }

  /**
   * Check if content has meaningful data
   * @param {*} content - Content to check
   * @returns {boolean} Whether content exists
   */
  hasContent(content) {
    if (!content) return false;
    if (typeof content === 'string') return content.trim().length > 0;
    if (Array.isArray(content)) return content.length > 0;
    if (typeof content === 'object') return Object.keys(content).length > 0;
    return true;
  }

  /**
   * Truncate content to specified length
   * @param {string} content - Content to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated content
   */
  truncateContent(content, maxLength) {
    if (!content || typeof content !== 'string') {
      return content;
    }
    
    if (content.length <= maxLength) {
      return content;
    }
    
    return content.substring(0, maxLength) + '...';
  }

  /**
   * Create contextual system prompt
   * @param {Object} context - Built context
   * @param {string} userName - User's name
   * @returns {string} Enhanced system prompt
   */
  createContextualPrompt(context, userName = 'User') {
    let prompt = `You are an AI tutor for ${userName} using EduExtract, an educational content platform. You have access to their learning materials and can help them understand, revise, and create new educational content.

IMPORTANT: You can reference and discuss any of the content below to provide personalized help.`;

    // Add current session content
    if (context.currentSession && Object.keys(context.currentSession).length > 0) {
      prompt += `\n\nCURRENT SESSION CONTENT (Most Relevant):`;
      Object.keys(context.currentSession).forEach(type => {
        const content = context.currentSession[type];
        if (content) {
          prompt += `\n\n${type.toUpperCase()}:`;
          if (typeof content.content === 'string') {
            prompt += `\n${content.content}`;
          } else if (typeof content.content === 'object') {
            prompt += `\n${JSON.stringify(content.content, null, 2)}`;
          }
        }
      });
    }

    // Add original source
    if (context.originalSource) {
      prompt += `\n\nORIGINAL SOURCE MATERIAL:`;
      prompt += `\nType: ${context.originalSource.type}`;
      if (context.originalSource.url) {
        prompt += `\nSource: ${context.originalSource.url}`;
      }
      prompt += `\nContent: ${context.originalSource.content}`;
    }

    // Add user history summary
    if (context.userHistory && Object.keys(context.userHistory).length > 0) {
      prompt += `\n\nUSER'S LEARNING HISTORY:`;
      Object.keys(context.userHistory).forEach(type => {
        const history = context.userHistory[type];
        if (history && history.summary) {
          prompt += `\n${history.summary}`;
        }
      });
    }

    prompt += `\n\nYou can help the user by:
- Explaining concepts from their generated content
- Answering questions about their learning materials
- Suggesting improvements to their content
- Creating new educational materials based on their existing content
- Connecting ideas between different pieces of content they've created

Be helpful, educational, and reference their specific content when relevant.`;

    return prompt;
  }

  /**
   * Estimate token count for context (rough approximation)
   * @param {Object} context - Context object
   * @returns {number} Estimated token count
   */
  estimateTokenCount(context) {
    const contextString = JSON.stringify(context);
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(contextString.length / 4);
  }
}

module.exports = ChatContextService;
