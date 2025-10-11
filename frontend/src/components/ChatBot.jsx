import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, Info, Loader2 } from 'lucide-react';
import api from '../utils/axios';
import useContentContext from '../hooks/useContentContext';
import ChatContextDisplay from './ChatContextDisplay';

const ChatBot = ({ isOpen, setIsOpen }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [showContextInfo, setShowContextInfo] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get context for the chat
      const contentContext = getContextForChat();
      const hasContextData = hasContext();
      
      console.log('Sending chat with context:', hasContextData, contentContext);

      const response = await api.post('/api/chat', {
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
    <div className="fixed bottom-6 right-6 z-[9999]">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-800 dark:bg-gray-700 text-white p-4 rounded-full shadow-xl hover:bg-gray-900 dark:hover:bg-gray-600 transition-all duration-300 flex items-center justify-center hover:scale-105"
          style={{ width: '64px', height: '64px' }}
        >
          <MessageCircle size={28} />
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-96 h-[500px] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-800 dark:bg-gray-700 text-white">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-lg">EduExtract Assistant</h3>
              {contextLoaded && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-300">Context Active</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowContextInfo(!showContextInfo)}
                className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-700 dark:hover:bg-gray-600"
                title="Show context info"
              >
                <Info size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-700 dark:hover:bg-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Context Info Panel */}
          {showContextInfo && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900 border-b dark:border-gray-700">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <div className="font-semibold mb-2">🤖 AI Context Status</div>
                {isLoadingHistory ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Loading your content history...</span>
                  </div>
                ) : hasContext() ? (
                  <div>
                    <div className="mb-1">✅ Context loaded successfully</div>
                    <div className="text-xs text-blue-600 dark:text-blue-300">
                      I can help you with your generated content and learning materials
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1">ℹ️ No context available</div>
                    <div className="text-xs text-blue-600 dark:text-blue-300">
                      Generate some content first to enable personalized assistance
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
                {hasContext() ? (
                  <div>
                    <div className="text-lg font-semibold mb-2">👋 Hi! I'm your AI tutor</div>
                    <div className="text-sm">
                      I can help you with your generated content, answer questions about your learning materials, 
                      and assist with creating new educational content. What would you like to know?
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-lg font-semibold mb-2">👋 Hi! I'm your AI assistant</div>
                    <div className="text-sm">
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                  Thinking...
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

          <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-gray-800 dark:bg-gray-700 text-white p-3 rounded-xl hover:bg-gray-900 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot; 