# EduExtract - Learning Assistant

A comprehensive learning platform that generates educational content from YouTube videos and uploaded files.

## Features

### Content Generation
- **Blog Posts**: Generate detailed, well-structured blog articles from video transcripts
- **Slides**: Create presentation slides with key points and bullet points
- **Flashcards**: Generate educational flashcards for study and review
- **Quizzes**: Create multiple-choice quizzes to test knowledge
- **Summaries**: Generate concise summaries of video content

### User Management
- **User Registration**: Automatic user creation when content is generated
- **User Dashboard**: View all users with their basic information (ID, Name, Email)
- **Content Management**: Click on any user to view their generated content
- **Content Details**: View detailed content with proper formatting and display

## Database Structure

### Users Collection
```javascript
{
  uid: String,           // Firebase UID (unique)
  name: String,          // User's display name
  email: String,         // User's email address
  createdAt: Date,       // Account creation date
  lastLogin: Date        // Last login timestamp
}
```

### GeneratedContent Collection
```javascript
{
  userId: String,        // Reference to user's UID
  type: String,          // 'blog', 'slides', 'flashcards', 'quiz', 'summary'
  title: String,         // Content title
  createdAt: Date,       // Creation timestamp
  contentData: Mixed,    // The actual generated content
  url: String,           // Original YouTube URL (optional)
  filePath: String       // Original file path (optional)
}
```

## API Endpoints

### User Management
- `POST /api/users` - Create or update user record
- `GET /api/users` - Get all users (admin view)
- `GET /api/users/:userId` - Get specific user by ID

### Content Management
- `GET /api/content/:userId` - Get user's content (user view)
- `GET /api/admin/content/:userId` - Get user's content with user info (admin view)
- `GET /api/content/details/:contentId` - Get specific content details

### Content Generation
- `POST /generate-blog` - Generate blog post from YouTube URL
- `POST /generate-slides` - Generate slides from YouTube URL
- `POST /generate-flashcards` - Generate flashcards from YouTube URL
- `POST /generate-quiz` - Generate quiz from YouTube URL
- `POST /generate-summary` - Generate summary from YouTube URL
- `POST /process-file` - Process uploaded files for content generation

## Setup Instructions

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Add your environment variables
   npm start
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Environment Variables**
   - `GROQ_API_KEY`: Your Groq API key
   - `MONGODB_URI`: MongoDB connection string
   - `PORT`: Server port (default: 5000)

## Usage

### For Users
1. Sign in with your Google account or email
2. Paste a YouTube URL or upload a file
3. Choose the type of content you want to generate
4. View and download your generated content

### For Administrators
1. **Setup Admin Access**: Follow the guide in `backend/config/admin-setup.md`
2. **Login with your admin account**
3. **Access Admin Dashboard**: Click the "Admin" button in the header
4. **Manage Users**: Navigate to the Users page to view all users and their content
5. **Monitor System**: View user activity and generated content

## Admin Authentication

The application uses a predefined admin list approach for security:

### Admin Features
- **User Management**: View all users in the system
- **Content Access**: Access any user's generated content
- **System Monitoring**: Track user activity and content generation
- **Admin Dashboard**: Centralized admin interface

### Security
- **Predefined Admin List**: Admin UIDs are stored in the backend configuration
- **Firebase Authentication**: Leverages existing Firebase auth system
- **Role-based Access**: Only predefined admins can access admin features
- **Secure Endpoints**: Admin endpoints are protected with `verifyAdmin` middleware

### Adding Admins
1. Get your Firebase UID (see setup guide)
2. Add it to the `ADMIN_UIDS` array in `backend/config/firebase-admin.js`
3. Restart the backend server
4. Login to access admin features
4. Click on any content item to view detailed content

## Technology Stack

- **Backend**: Node.js, Express, MongoDB, Groq AI
- **Frontend**: React, Vite, Tailwind CSS
- **Authentication**: Firebase Auth
- **File Processing**: Multer, PDF-parse, Mammoth
- **AI Integration**: Groq API for content generation

## File Structure

```
eduExtract/
├── backend/
│   ├── server.js          # Main server file
│   ├── get_transcript.py  # YouTube transcript extraction
│   └── config/
│       └── firebase-admin.js
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   └── utils/         # Utility functions
│   └── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.