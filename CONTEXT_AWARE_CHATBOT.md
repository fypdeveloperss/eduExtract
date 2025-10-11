# Context-Aware Personalized AI Chatbot

## Overview

The EduExtract platform now features a **fully context-aware AI chatbot** that provides personalized educational assistance by understanding your generated content, original source materials, and learning history.

## 🚀 Key Features

### ✅ **Current Session Context**
- **Real-time awareness** of content you're currently generating (blogs, quizzes, flashcards, slides, summaries)
- **Original source integration** (YouTube transcripts, document content)
- **Immediate context updates** when new content is created

### ✅ **Learning History Integration**
- **Database-driven context** from your past generated content
- **Intelligent content summarization** to manage token limits
- **Content type awareness** (knows about your previous blogs, quizzes, etc.)

### ✅ **Persistent Conversations**
- **Session management** with conversation history
- **Context persistence** across page navigation
- **Smart context loading** based on relevance

### ✅ **User-Friendly Interface**
- **Context status indicators** showing what the AI knows
- **Expandable context panel** with detailed information
- **Context management** (view/remove specific content)
- **Helpful tips** for effective AI interaction

## 🏗️ Architecture

### Backend Components

#### 1. **ChatContextService** (`backend/services/chatContextService.js`)
- **Context building** from current session + database history
- **Content formatting** for different types (blog, quiz, flashcards, etc.)
- **Token management** and content compression
- **Intelligent summarization** of historical content

#### 2. **ChatHistory Model** (`backend/models/ChatHistory.js`)
- **Session persistence** with MongoDB
- **Message storage** with timestamps and metadata
- **Context snapshots** for each conversation
- **User-specific** conversation history

#### 3. **Enhanced Chat Endpoint** (`backend/routes/generation.js`)
- **Context-aware API** (`POST /api/chat`)
- **Session management** with automatic creation/retrieval
- **Context integration** with AI prompts
- **History endpoints** for conversation retrieval

### Frontend Components

#### 1. **useContentContext Hook** (`frontend/src/hooks/useContentContext.js`)
- **Global context state** management
- **Content capture** from Dashboard
- **Context formatting** for API calls
- **History loading** from backend

#### 2. **Enhanced ChatBot** (`frontend/src/components/ChatBot.jsx`)
- **Context-aware messaging** with session management
- **Visual context indicators** (green dot when context is active)
- **Context information panel** with expandable details
- **Smart welcome messages** based on available context

#### 3. **ChatContextDisplay** (`frontend/src/components/ChatContextDisplay.jsx`)
- **Detailed context visualization** with icons and counts
- **Content type breakdown** (current session vs. history)
- **Interactive context management** (remove items)
- **Helpful tips** for effective AI interaction

#### 4. **Dashboard Integration** (`frontend/src/pages/Dashboard.jsx`)
- **Automatic context capture** when content is generated
- **Original source storage** (YouTube URLs, file content)
- **Real-time context updates** for immediate AI awareness

## 🔧 API Endpoints

### Enhanced Chat Endpoint
```javascript
POST /api/chat
{
  "messages": [{"role": "user", "content": "Your question"}],
  "contentContext": {
    "currentSession": {...},
    "originalSource": {...}
  },
  "sessionId": "optional_session_id"
}

Response:
{
  "message": "AI response",
  "sessionId": "session_id",
  "contextLoaded": true
}
```

### Context Retrieval
```javascript
GET /api/chat/context
Response: {
  "success": true,
  "context": {
    "totalItems": 15,
    "recentItems": [...],
    "contentTypes": {"blog": 3, "quiz": 5, ...}
  }
}
```

### Chat History
```javascript
GET /api/chat/history?limit=10
GET /api/chat/history/:sessionId
```

## 🎯 Usage Examples

### 1. **Content-Specific Questions**
```
User: "Can you explain the third question in my quiz?"
AI: "Looking at your quiz about machine learning, the third question asks about neural networks. Let me explain..."
```

### 2. **Content Improvement**
```
User: "How can I make my blog more engaging?"
AI: "Based on your blog about React hooks, I suggest adding more practical examples and interactive code snippets..."
```

### 3. **Cross-Content Connections**
```
User: "What topics should I study next?"
AI: "Based on your flashcards about JavaScript and your quiz on React, I recommend studying state management patterns..."
```

### 4. **Source Material Questions**
```
User: "What was the main point of the video?"
AI: "From the YouTube video you processed, the main point was about the importance of clean code architecture..."
```

## 🧪 Testing

Run the test suite to validate the implementation:

```bash
# From the project root
node test-context-chatbot.js
```

The test suite validates:
- ✅ Context service functionality
- ✅ Chat history model operations
- ✅ Generated content integration
- ✅ Database operations

## 🚀 Getting Started

### 1. **Backend Setup**
Ensure your backend has the new dependencies:
- MongoDB connection for ChatHistory model
- Updated generation routes with context endpoints

### 2. **Frontend Setup**
The new components are automatically integrated:
- `useContentContext` hook is imported in Dashboard
- `ChatBot` component is enhanced with context awareness
- `ChatContextDisplay` provides detailed context information

### 3. **Testing the Feature**
1. **Generate Content**: Create a blog, quiz, or flashcards on the Dashboard
2. **Open Chatbot**: Click the chat icon in the bottom-right corner
3. **Check Context**: Look for the green "Context Active" indicator
4. **Ask Questions**: Try asking about your generated content
5. **View Context**: Click the info icon to see what the AI knows

## 🔍 Context Management

### **Automatic Context Building**
- **Current Session**: All content generated in the current session
- **Original Sources**: YouTube transcripts or file content
- **User History**: Last 20 items from your content history
- **Smart Summarization**: Older content is summarized to save tokens

### **Context Display**
- **Visual Indicators**: Green dot shows when context is active
- **Content Breakdown**: Shows counts by type (blogs, quizzes, etc.)
- **Source Information**: Displays original source (YouTube/file)
- **Interactive Management**: Remove specific content from context

### **Token Management**
- **Intelligent Limits**: ~3000 tokens reserved for context
- **Priority System**: Current session > Original source > Recent history
- **Content Compression**: Older content is summarized
- **Dynamic Sizing**: Context adapts based on available tokens

## 🎨 UI/UX Features

### **Context Status Indicators**
- 🟢 **Green dot**: Context is active and loaded
- ℹ️ **Info icon**: Shows detailed context information
- 📊 **Count badges**: Display content type counts
- 🔄 **Loading states**: Show when context is being loaded

### **Smart Welcome Messages**
- **With Context**: "Hi! I'm your AI tutor. I can help you with your generated content..."
- **Without Context**: "Hi! I'm your AI assistant. Generate some content first to enable personalized assistance..."

### **Context Information Panel**
- **Expandable design** with chevron indicators
- **Color-coded content types** with appropriate icons
- **Timestamp information** for current session items
- **Helpful tips** for effective AI interaction

## 🔮 Future Enhancements

### **Phase 2 Possibilities**
- **Vector Database Integration**: Semantic search across all content
- **Content Recommendations**: AI suggests related topics to study
- **Learning Analytics**: Track learning patterns and suggest improvements
- **Multi-language Support**: Context awareness in different languages
- **Content Export**: Export conversations with context for review

### **Advanced Features**
- **Content Versioning**: Track changes and improvements over time
- **Collaborative Context**: Share context with study groups
- **AI Content Generation**: Create new content based on existing materials
- **Learning Paths**: AI-guided learning journeys based on your content

## 🐛 Troubleshooting

### **Common Issues**

1. **Context Not Loading**
   - Check browser console for API errors
   - Verify user authentication
   - Ensure MongoDB connection is working

2. **AI Responses Generic**
   - Verify context is being sent in API calls
   - Check that content was generated successfully
   - Look for "Context Active" indicator

3. **Performance Issues**
   - Large content history may slow context loading
   - Consider implementing pagination for very active users
   - Monitor token usage in API calls

### **Debug Information**
- **Browser Console**: Check for context-related logs
- **Network Tab**: Verify API calls include context data
- **Backend Logs**: Look for context building and token estimation logs

## 📊 Performance Considerations

### **Optimization Strategies**
- **Lazy Loading**: Context is built only when needed
- **Content Summarization**: Older content is compressed
- **Session Caching**: Recent conversations are cached
- **Token Management**: Intelligent limits prevent API overload

### **Scalability**
- **Database Indexing**: Optimized queries for user content
- **Content Compression**: Summarized historical content
- **Session Management**: Efficient conversation storage
- **API Rate Limiting**: Prevents abuse of context features

---

## 🎉 Success!

Your EduExtract platform now has a **fully personalized, context-aware AI chatbot** that understands your learning journey and provides intelligent, relevant assistance based on your generated content and learning history!

The chatbot will now:
- ✅ Know about your current session's generated content
- ✅ Remember your learning history from the database
- ✅ Understand your original source materials
- ✅ Provide personalized, contextually relevant responses
- ✅ Maintain conversation history across sessions
- ✅ Show you exactly what context it has access to

**Happy Learning! 🚀**
