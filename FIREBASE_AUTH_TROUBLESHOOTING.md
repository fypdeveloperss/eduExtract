# Firebase Authentication Troubleshooting Guide

## Issue: Firebase ID Token Missing "kid" Claim

### Problem Description
```
FirebaseAuthError: Firebase ID token has no "kid" claim
```

This error occurs when the backend receives a token that doesn't have the proper Firebase ID token structure.

### Common Causes

1. **Using localStorage token instead of Firebase ID token**
   - ❌ Wrong: `localStorage.getItem('token')`
   - ✅ Correct: `await user.getIdToken()`

2. **Expired or invalid token**
   - Firebase ID tokens expire after 1 hour
   - Solution: Always get fresh token with `user.getIdToken(true)`

3. **Wrong token format**
   - Some auth systems store custom tokens in localStorage
   - Firebase requires proper JWT with specific claims

### Solutions Implemented

#### 1. Enhanced Backend Token Validation
```javascript
// Check token structure before Firebase verification
const tokenParts = token.split('.');
if (tokenParts.length !== 3) {
  return res.status(401).json({ 
    error: 'Invalid token structure. Expected JWT format with 3 parts.' 
  });
}

// Check for required 'kid' claim in header
const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
if (!header.kid) {
  return res.status(401).json({ 
    error: 'Invalid Firebase ID token: missing "kid" claim.' 
  });
}
```

#### 2. Frontend Authentication Utility
Created `utils/auth.js` with:
- `getFirebaseToken()`: Always gets fresh Firebase ID token
- `authenticatedFetch()`: Wrapper for authenticated API calls
- Consistent token handling across components

#### 3. Updated Components
- ContentSelectionModal
- SpaceHeader
- ContentList

All now use proper Firebase authentication instead of localStorage tokens.

### How to Debug Token Issues

#### 1. Check Token Format
```javascript
// In browser console
const user = firebase.auth().currentUser;
const token = await user.getIdToken();
console.log('Token parts:', token.split('.').length); // Should be 3

// Decode header
const header = JSON.parse(atob(token.split('.')[0]));
console.log('Token header:', header); // Should have 'kid' field
```

#### 2. Verify Firebase Configuration
```javascript
// Check if Firebase is properly initialized
console.log('Firebase config:', firebase.app().options);
console.log('Current user:', firebase.auth().currentUser);
```

#### 3. Backend Debugging
```javascript
// In Firebase admin verification
console.log('Received token length:', token.length);
console.log('Token parts:', token.split('.').length);
console.log('Token header:', JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString()));
```

### Prevention

#### 1. Use Axios Interceptor (Recommended)
```javascript
// utils/axios.js
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

#### 2. Use Auth Utility Functions
```javascript
import { authenticatedFetch } from '../utils/auth';

// Instead of manual token handling
const response = await authenticatedFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### Error Messages Guide

| Error | Cause | Solution |
|-------|--------|----------|
| "No token provided" | Missing Authorization header | Ensure user is logged in |
| "Invalid token format" | Token too short or malformed | Check token generation |
| "Invalid token structure" | Not a proper JWT | Use Firebase ID token |
| "Missing kid claim" | Not a Firebase ID token | Use `user.getIdToken()` |
| "Token expired" | Token older than 1 hour | Get fresh token |

### Testing Authentication

#### 1. Test Token Generation
```javascript
// In browser console
const user = firebase.auth().currentUser;
if (user) {
  const token = await user.getIdToken(true); // Force refresh
  console.log('Fresh token generated:', !!token);
  
  // Test API call
  const response = await fetch('/api/test', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('API response:', response.status);
}
```

#### 2. Test Backend Verification
```javascript
// Add temporary debug endpoint
app.get('/api/debug-token', verifyToken, (req, res) => {
  res.json({
    user: req.user,
    message: 'Token verified successfully'
  });
});
```

### Best Practices

1. **Always use Firebase ID tokens** for backend authentication
2. **Never store Firebase ID tokens** in localStorage (they expire)
3. **Use axios interceptors** for automatic token management
4. **Handle token expiration** gracefully with refresh
5. **Validate token format** before Firebase verification
6. **Provide clear error messages** to help debugging

### When This Happens in Production

1. Check if user needs to re-authenticate
2. Clear any cached tokens: `localStorage.clear()`
3. Force token refresh: `user.getIdToken(true)`
4. Check Firebase project configuration
5. Verify backend Firebase admin setup