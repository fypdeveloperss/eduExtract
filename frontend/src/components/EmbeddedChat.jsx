import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import api from '../utils/axios';
import useContentContext from '../hooks/useContentContext';
import ChatContextDisplay from './ChatContextDisplay';

const EmbeddedChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [contextLoaded, setContextLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  // Content context hook
  const {
    getContextForChat,
    hasContext,
    getContextSummary,
    isLoadingHistory,
    updateCurrentSessionContent
  } = useContentContext();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to remove item from context
  const removeFromContext = (type) => {
    updateCurrentSessionContent(type, null);
    console.log(`Removed ${type} from context`);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup: Delete context when component unmounts
  useEffect(() => {
    return () => {
      // Delete context from database when chat component unmounts
      api.delete('/api/chat/context/delete').catch(error => {
        console.error('Error deleting context on unmount:', error);
      });
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Fetch context from database
      let contentContext = null;
      try {
        const contextResponse = await api.get('/api/chat/context/fetch');
        if (contextResponse.data.success && contextResponse.data.context) {
          contentContext = contextResponse.data.context;
          console.log('Context fetched from database:', contentContext);
        } else {
          console.log('No context found in database, using local context');
          contentContext = getContextForChat();
        }
      } catch (contextError) {
        console.error('Error fetching context from database:', contextError);
        contentContext = getContextForChat();
      }
      
      const hasContextData = contentContext && (contentContext.originalSource || Object.keys(contentContext.currentSession || {}).length > 0);
      
      console.log('Sending RESTRICTED chat with context:', hasContextData, contentContext);
      console.log('Original source content:', contentContext?.originalSource);
      console.log('Current session content:', contentContext?.currentSession);
      console.log('Full context object:', JSON.stringify(contentContext, null, 2));

      const response = await api.post('/api/chat/restricted', {
        messages: [
          { role: 'user', content: userMessage }
        ],
        contentContext: hasContextData ? contentContext : null,
        sessionId: sessionId
      });

      const aiResponse = response.data.message;
      const newSessionId = response.data.sessionId;
      const contextWasLoaded = response.data.contextLoaded;
      
      // Update session ID if this is a new session
      if (newSessionId && newSessionId !== sessionId) {
        setSessionId(newSessionId);
      }
      
      // Update context loaded status
      if (contextWasLoaded && !contextLoaded) {
        setContextLoaded(true);
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-[#fafafacc] mt-4">
            {hasContext() ? (
              <div>
                <div className="text-lg font-semibold mb-2 text-gray-900 dark:text-[#fafafa]">👋 Hi! I'm your AI tutor</div>
                <div className="text-sm text-gray-600 dark:text-[#fafafacc]">
                  I can help you with your generated content, answer questions about your learning materials, 
                  and assist with creating new educational content. What would you like to know?
                </div>
              </div>
            ) : (
              <div>
                <div className="text-lg font-semibold mb-2 text-gray-900 dark:text-[#fafafa]">👋 Hi! I'm your AI assistant</div>
                <div className="text-sm text-gray-600 dark:text-[#fafafacc]">
                  Generate some content first to enable personalized assistance. 
                  I can help you understand, revise, and create educational materials.
                </div>
              </div>
            )}
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-[#171717] dark:bg-[#fafafa] text-[#fafafa] dark:text-[#171717]'
                  : 'bg-gray-100 dark:bg-[#2E2E2E] text-gray-900 dark:text-[#fafafacc]'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-[#2E2E2E] rounded-lg p-3 text-gray-900 dark:text-[#fafafacc]">
              <div className="flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Display */}
      <ChatContextDisplay 
        contextSummary={getContextSummary()} 
        onRemoveItem={removeFromContext}
      />

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#2E2E2E]">
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 border border-gray-300 dark:border-[#2E2E2E] rounded-xl bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafacc] placeholder-gray-500 dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-[#171717] dark:bg-[#fafafa] text-[#fafafa] dark:text-[#171717] p-3 rounded-xl hover:bg-[#333333] dark:hover:bg-[#e5e5e5] transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmbeddedChat;
