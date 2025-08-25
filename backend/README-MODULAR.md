# Backend Modular Structure

This backend has been restructured into a modular architecture for better maintainability and organization.

## Directory Structure

```
backend/
├── server.js (main entry point - OLD)
├── server-new.js (new modular entry point)
├── config/
│   ├── firebase-admin.js (Firebase configuration)
│   └── database.js (database configuration)
├── models/
│   ├── User.js (User schema)
│   └── GeneratedContent.js (Content schema)
├── routes/
│   ├── auth.js (authentication routes)
│   ├── admin.js (admin routes)
│   ├── content.js (content routes)
│   └── users.js (user routes)
├── middleware/
│   ├── auth.js (authentication middleware)
│   └── upload.js (file upload middleware)
├── services/
│   ├── userService.js (user business logic)
│   ├── contentService.js (content business logic)
│   └── aiService.js (AI processing logic)
├── utils/
│   ├── helpers.js (utility functions)
│   ├── fileUtils.js (file processing utilities)
│   └── constants.js (application constants)
└── controllers/
    ├── authController.js (auth logic)
    ├── adminController.js (admin logic)
    ├── contentController.js (content logic)
    └── userController.js (user logic)
```

## Benefits of Modular Structure

1. **Separation of Concerns**: Each file has a specific responsibility
2. **Maintainability**: Easier to find and fix issues
3. **Scalability**: Easy to add new features
4. **Testing**: Individual components can be tested separately
5. **Code Reusability**: Services can be reused across different routes
6. **Team Collaboration**: Multiple developers can work on different modules

## Key Components

### Models (`/models`)
- **User.js**: User schema and model
- **GeneratedContent.js**: Content schema and model

### Services (`/services`)
- **userService.js**: User-related business logic
- **contentService.js**: Content-related business logic
- **aiService.js**: AI processing logic

### Routes (`/routes`)
- **auth.js**: Authentication endpoints
- **admin.js**: Admin-specific endpoints
- **users.js**: User management endpoints
- **content.js**: Content management endpoints

### Middleware (`/middleware`)
- **auth.js**: Authentication and authorization middleware
- **upload.js**: File upload configuration

### Utils (`/utils`)
- **helpers.js**: General utility functions
- **fileUtils.js**: File processing utilities
- **constants.js**: Application constants

## Migration Guide

### To use the new modular structure:

1. **Backup your current server.js**:
   ```bash
   cp server.js server-backup.js
   ```

2. **Rename the new server**:
   ```bash
   mv server-new.js server.js
   ```

3. **Install any missing dependencies**:
   ```bash
   npm install
   ```

4. **Test the new structure**:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `GET /api/auth/admin/check` - Check admin status

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:userId` - Get user by ID (admin only)
- `POST /api/users` - Create/update user

### Admin
- `GET /api/admin/stats` - Get admin dashboard stats
- `GET /api/admin/content/:userId` - Get user content (admin only)

### Content
- `POST /process-file` - Process uploaded file
- `POST /process-youtube` - Process YouTube URL
- `GET /api/content` - Get user's content

## Adding New Features

### To add a new route:
1. Create a new file in `/routes`
2. Import it in `server.js`
3. Add the route middleware

### To add a new service:
1. Create a new file in `/services`
2. Export the service functions
3. Import and use in routes

### To add a new model:
1. Create a new file in `/models`
2. Define the schema
3. Export the model

## Best Practices

1. **Keep routes thin**: Routes should only handle HTTP logic
2. **Use services for business logic**: Complex operations go in services
3. **Validate input**: Always validate user input
4. **Handle errors properly**: Use try-catch blocks
5. **Log important events**: Use console.log for debugging
6. **Use environment variables**: Keep sensitive data in .env

## Testing

Each module can be tested independently:

```javascript
// Test a service
const UserService = require('./services/userService');
const users = await UserService.getAllUsers();

// Test a model
const User = require('./models/User');
const user = await User.findOne({ uid: 'test' });
```

## Troubleshooting

### Common Issues:

1. **Module not found**: Check import paths
2. **Database connection**: Ensure MongoDB is running
3. **Firebase auth**: Check environment variables
4. **File uploads**: Ensure uploads directory exists

### Debug Steps:

1. Check console logs
2. Verify environment variables
3. Test individual modules
4. Check database connection
5. Verify Firebase configuration 