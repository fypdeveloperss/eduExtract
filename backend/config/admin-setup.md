# Admin Setup Guide

## How to Add Admin Users

### Step 1: Get Your Firebase UID

1. **Sign up/Login to your application**
2. **Open browser developer tools** (F12)
3. **Go to Console tab**
4. **Run this command to get your UID:**
   ```javascript
   getCurrentUserUid()
   ```
   
   This will output something like:
   ```
   Your Firebase UID: abc123def456ghi789
   Copy this UID and add it to the ADMIN_UIDS array in backend/config/firebase-admin.js
   ```

5. **Manually copy the UID** from the console output

### Step 2: Add UID to Admin List

1. **Open `backend/config/firebase-admin.js`**
2. **Find the `ADMIN_UIDS` array:**
   ```javascript
   const ADMIN_UIDS = [
      '13zeFEG6XqTUtc0muOzZl3Ikba32'
     // Add your admin UIDs here
     // Example: 'your-firebase-uid-here',
   ];
   ```
3. **Add your UID to the array:**
   ```javascript
   const ADMIN_UIDS = [
     'your-actual-firebase-uid-here',
     // Add more admin UIDs as needed
   ];
   ```

### Step 3: Restart Your Backend

1. **Stop your backend server** (Ctrl+C)
2. **Restart it:**
   ```bash
   npm start
   # or
   node server.js
   ```

### Step 4: Test Admin Access

1. **Login to your application**
2. **You should now see an "Admin" button in the header**
3. **Click it to access the admin dashboard**

## Security Notes

- **Only add trusted UIDs** to the admin list
- **Keep your Firebase UID private** - don't share it publicly
- **The admin list is stored in code**, so it's secure and version-controlled
- **Admins can access all user data and content**

## Multiple Admins

To add multiple admins, simply add more UIDs to the array:

```javascript
const ADMIN_UIDS = [
  'admin1-firebase-uid',
  'admin2-firebase-uid',
  'admin3-firebase-uid',
];
```

## Admin Features

Admins can:
- View all users in the system
- Access any user's generated content
- View detailed content information
- Monitor system usage

## Troubleshooting

**If admin access isn't working:**
1. Check that your UID is correctly added to the array
2. Restart the backend server
3. Logout and login again
4. Check browser console for any errors

**If getCurrentUserUid() doesn't work:**
1. Make sure you're logged in to the application
2. Try refreshing the page and running the command again
3. Check if there are any console errors 