# AI Assist Troubleshooting Guide

## Issues and Solutions

### 1. AI Assist Not Responding

**Symptoms:**
- Clicking "Enhance with AI" button does nothing
- Getting network errors
- "Processing..." never finishes

**Solutions:**

#### Check Backend Server
```bash
# Make sure backend is running on port 5000
cd backend
npm start
```

#### Check Network Connection
- Open browser developer tools (F12)
- Go to Network tab
- Try AI assist and check for failed requests
- Look for errors in Console tab

#### Authentication Issues
- Make sure you're logged in
- Check if your JWT token is valid
- Try logging out and back in

### 2. AI Service Status

**Current Implementation:** Real AI using Groq API with Llama model + Format Preservation.

**How It Works:**
1. **With API Key (Recommended):**
   - Uses `meta-llama/llama-4-scout-17b-16e-instruct` model
   - Intelligent content analysis and enhancement
   - **Format-aware processing** for JSON/HTML content
   - Handles complex prompts and context
   - Provides natural, human-like improvements

2. **Fallback Mode (No API Key):**
   - Uses basic rule-based enhancements
   - **Still preserves original format structure**
   - Limited to simple transformations
   - "Make it more concise" → Shortens content (keeping format)
   - "Add bullet points" → Converts to bullet format
   - "Fix grammar" → Basic grammar corrections

**Check AI Status:**
- Look for green/yellow dot in AI Assistant tab
- Green = Groq AI available with format preservation
- Yellow = Fallback mode with format preservation

### 3. Format Preservation System

**Problem Solved:** AI changing JSON slides/quizzes to plain text, breaking rendering.

**How Format Preservation Works:**
1. **Auto-Detection**: System detects if content is JSON, HTML, or plain text
2. **Structure Analysis**: Identifies slides arrays, quiz objects, HTML tags
3. **Format-Aware Prompts**: AI receives specific instructions to preserve structure
4. **Validation**: Enhanced content is validated against original structure
5. **Fallback Protection**: If format is lost, system falls back to original structure

**Supported Formats:**
- **Slides JSON**: `[{"title": "...", "content": "..."}]`
- **Quiz JSON**: `{"questions": [{"question": "...", "options": [...]}]}`
- **Blog HTML**: `<h1>Title</h1><p>Content...</p>`
- **Summary HTML**: `<div><h2>...</h2><ul><li>...</li></ul></div>`
- **Plain Text**: Regular text content

**What Gets Enhanced:**
- ✅ Text content within JSON values
- ✅ Text content within HTML tags
- ✅ Plain text content
- ❌ JSON keys/structure (preserved)
- ❌ HTML tags/structure (preserved)

### 3. AI Status Monitoring

Check the AI status indicator:
- Green dot: Groq AI is available and working
- Yellow dot: Using fallback mode (basic enhancements)

### 4. Common Error Messages

#### "Network error: Unable to connect to server"
- Backend server is not running
- Wrong port configuration (should be 5000)
- Firewall blocking the connection

#### "Server error: 401"
- Authentication token expired
- User not logged in properly
- Firebase auth issues

#### "Content and prompt are required"
- Empty content field
- Empty prompt field
- Data not being sent properly

### 5. Console Debugging

Open browser console and look for:
```
Sending AI assist request: { content: "...", prompt: "...", contentType: "text" }
AI assist response: { success: true, enhancedContent: "..." }
```

### 6. Backend Logs

In the backend terminal, you should see:
```
AI assist request received: { userId: "...", contentLength: 123, prompt: "..." }
AI assist completed successfully
```

## Current Implementation Status

✅ **Working:**
- Groq API integration with Llama AI model
- Real AI-powered content enhancement
- Fallback mode when API unavailable
- AI service status monitoring
- Request/response flow with proper error handling
- Comprehensive logging and error handling

✅ **AI Features:**
- Uses `meta-llama/llama-4-scout-17b-16e-instruct` model
- Intelligent content analysis and enhancement
- **Format Preservation**: Maintains JSON/HTML structure
- Context-aware improvements for slides, quizzes, blogs
- Multiple content types supported (slides, quiz, blog, summary)
- Real-time AI status indicators

⚠️ **Dependencies:**
- Requires GROQ_API_KEY environment variable
- Falls back to basic rules if API unavailable
- Network dependent for AI features

🔧 **Enhanced Features:**
- Real AI responses instead of simulations
- **Format Preservation System**: Prevents data corruption
- Sophisticated prompt engineering with format awareness
- Content type specific enhancements (JSON vs HTML)
- Structure validation and fallback protection
- User feedback with AI service info

## Testing the Functionality

1. **Test AI Enhancement:**
   - Enter any content to edit
   - Enter prompt like "Make it more concise"
   - Click "Enhance with AI"
   - Should see enhanced content in edit tab

2. **Test Different Prompts:**
   - "Make it more concise"
   - "Add bullet points"
   - "Fix grammar"
   - "Make it more professional"

3. **Check Network Tab:**
   - Should see POST request to `/api/collaborate/content/ai-assist`
   - Status should be 200
   - Response should contain enhanced content and AI service info

## Current AI Integration

✅ **Groq API with Llama Model:**
```javascript
// Real AI implementation using Groq
const { Groq } = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const completion = await groq.chat.completions.create({
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  temperature: 0.7,
  max_tokens: 2048,
  messages: [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: userPrompt
    }
  ]
});
```

## Future Enhancements

1. **Advanced AI Features:**
- Multiple AI model support (GPT, Claude, etc.)
- Model selection based on content type
- Custom fine-tuned models
- Batch processing for multiple contents

2. **Enhanced Features:**
- Content type specific enhancements
- Multi-language support
- Plagiarism checking integration
- SEO optimization suggestions
- Readability analysis and scoring
- Collaborative editing with AI suggestions