# EduExtract AI Copilot Instructions

## Project Architecture

EduExtract is a full-stack learning platform that generates educational content from YouTube videos and files using AI. The architecture follows a **service-oriented pattern** with Firebase authentication, MongoDB storage, and Groq AI integration.

### Core Stack
- **Backend**: Node.js/Express with MongoDB (Mongoose ODM)
- **Frontend**: React 19 + Vite with React Router 7 and Tailwind CSS
- **AI**: Groq SDK for content generation with retry mechanisms
- **Auth**: Firebase Admin SDK with predefined admin UIDs in `ADMIN_UIDS` array
- **Real-time**: Socket.io for collaboration features

## Critical Patterns & Conventions

### Authentication Flow
- **Token Usage**: Always use `await user.getIdToken()` for fresh Firebase tokens, never localStorage
- **Admin Check**: Two-tier system with `verifyAdmin` and `verifyAdminEnhanced` middleware
- **Permission Caching**: Firebase tokens cached with 30min TTL in `config/firebase-admin.js`

### Content Generation Architecture
- **AI Retry Pattern**: All Groq API calls use `withRetry()` utility with exponential backoff (3 attempts)
- **JSON Parsing**: Use `parseAIResponseWithRetry()` for extracting structured data from AI responses
- **Content Storage**: Generated content saved to `GeneratedContent` model with `userId`, `type`, `contentData`

### Service Layer Pattern
- **Services Directory**: Business logic isolated in `services/` (aiAssistService, collaborationService, etc.)
- **Model Relationships**: Mongoose models in `models/` with Firebase UID references
- **Route Structure**: RESTful routes with `/api` prefix, except generation routes at root level

### Frontend Architecture
- **Context Providers**: `AuthProvider` and `CollaborationProvider` wrap the entire app
- **Route Protection**: Admin routes use `AdminLayout` with automatic admin status checking  
- **State Management**: React Context for auth, local state for component data

## Development Workflows

### Starting Development
```bash
# Backend
cd backend && npm install && npm start

# Frontend  
cd frontend && npm install && npm run dev
```

### Admin Setup
1. Get Firebase UID from user account
2. Add to `ADMIN_UIDS` array in `backend/config/firebase-admin.js`
3. Restart backend server
4. Admin features accessible via `/admin` routes

### Content Generation Testing
- Use `backend/test-groq-ai.js` for AI integration testing
- Check `backend/debug-format-issue.js` for format preservation issues
- YouTube transcript extraction via `get_transcript.py` Python script

## Key Integration Points

### File Processing Pipeline
- **Upload**: Multer middleware handles file uploads to `uploads/` directory
- **Processing**: PDF (pdf-parse), DOCX (mammoth) parsers extract text
- **Generation**: Text passed to Groq API with structured prompts for different content types

### Real-time Collaboration
- **Socket Manager**: `services/socketManager.js` handles room-based collaboration
- **Permission Caching**: User permissions cached for 5min to reduce DB queries
- **Event System**: Socket events for content sharing, live editing, and notifications

### Error Handling Patterns
- **Token Issues**: Check `FIREBASE_AUTH_TROUBLESHOOTING.md` for "kid" claim errors
- **AI Failures**: Retry mechanisms with fallback responses when Groq API unavailable
- **Database**: Mongoose validation with custom error messages

## Project-Specific Quirks

### Route Organization
- Generation routes (`/generate-*`) are at root level, not under `/api`
- Admin routes require both token verification AND admin status check
- Content routes have dual endpoints: user view and admin view with different data

### Caching Strategy
- **Firebase tokens**: 30min cache with automatic cleanup
- **Transcript data**: 10min cache using NodeCache for YouTube transcripts
- **Socket permissions**: 5min cache with periodic cleanup intervals

### Content Type Handling
- All generated content stored as `contentData` JSON field
- Content types: 'blog', 'slides', 'flashcards', 'quiz', 'summary'
- Format preservation critical for AI responses - use specific parsing utilities

When working on this codebase:
- Always handle token expiration in Firebase auth flows
- Use the established retry patterns for external API calls  
- Follow the service layer abstraction for business logic
- Consider caching implications when adding new features
- Test admin functionality requires proper UID configuration