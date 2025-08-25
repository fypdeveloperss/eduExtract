# Admin Setup Guide

> **⚡ NEW: Modern Admin Management Available!**  
> See `modern-admin-setup.md` for the new email-based admin management system.
> This legacy guide is kept for backward compatibility.

## 🚀 Quick Modern Setup (Recommended)

Instead of following this guide, you can now:
1. **Register an account** in the system
2. **Add your UID once** to the hardcoded list (below)
3. **Use the web interface** for all future admin management
4. **Add admins by email** - no more manual UID copying!

[➡️ See Modern Admin Setup Guide](./modern-admin-setup.md)

---

## Legacy Method: How to Add Admin Users

> **Note**: This method still works but is no longer recommended for new setups.

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
4. **🎉 Now use "Admin Management" to add more admins by email!**

---

## 🆕 What's New

### Modern Features Available:
- ✅ **Add admins by email** (no UID copying)
- ✅ **Web-based admin management**
- ✅ **Role-based permissions**
- ✅ **Remove admins instantly**
- ✅ **No server restarts needed**
- ✅ **Audit trail**

### Migration Benefits:
- Your existing hardcoded admins become "Super Admins"
- Use the web interface for all future admin management
- No breaking changes to your current setup

---

## Security Notes

- **Only add trusted UIDs** to the initial admin list
- **Keep your Firebase UID private** - don't share it publicly
- **Use the modern web interface** for adding additional admins
- **Super Admins can access all user data and content**

## Multiple Admins (Legacy Way)

To add multiple admins the old way, add more UIDs to the array:

```javascript
const ADMIN_UIDS = [
  'admin1-firebase-uid',
  'admin2-firebase-uid',
  'admin3-firebase-uid',
];
```

**Better way**: Use the Admin Management interface in the web app!

## Admin Features

Admins can:
- View all users in the system
- Access any user's generated content
- View detailed content information
- Monitor system usage
- **🆕 Manage other admins** (Super Admins only)

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

**🆕 For modern admin management issues:**
- See the [Modern Admin Setup Guide](./modern-admin-setup.md)
- Check that the user exists in the system before adding as admin
- Ensure you have Super Admin privileges for admin management 