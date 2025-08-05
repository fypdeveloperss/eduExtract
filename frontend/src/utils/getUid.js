// Utility function to get current user's Firebase UID
// This can be used in browser console to get your UID for admin setup

import { auth } from '../config/firebase';

export const getCurrentUserUid = () => {
  const user = auth.currentUser;
  if (user) {
    console.log('Your Firebase UID:', user.uid);
    console.log('Copy this UID and add it to the ADMIN_UIDS array in backend/config/firebase-admin.js');
    console.log('Then restart your backend server and login again.');
    return user.uid;
  } else {
    console.log('No user is currently signed in');
    console.log('Please login to your application first, then try again.');
    return null;
  }
};

export const getUidForAdmin = () => {
  const uid = getCurrentUserUid();
  if (uid) {
    console.log('✅ UID retrieved successfully!');
    console.log('📋 Next steps:');
    console.log('1. Copy the UID above');
    console.log('2. Open backend/config/firebase-admin.js');
    console.log('3. Add your UID to the ADMIN_UIDS array');
    console.log('4. Restart your backend server');
    console.log('5. Login again to access admin features');
  }
  return uid;
};

if (typeof window !== 'undefined') {
  window.getUidForAdmin = getUidForAdmin;
  window.getCurrentUserUid = getCurrentUserUid;
} 