import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD40KCePU98wn4NCKTJE0iGe37RKz5PAlE",
  authDomain: "eduextract-auth.firebaseapp.com",
  projectId: "eduextract-auth",
  storageBucket: "eduextract-auth.firebasestorage.app",
  messagingSenderId: "296150158601",
  appId: "1:296150158601:web:71fbaf6c467d98a919d7d8",
  measurementId: "G-XRR8XMWEPN"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app; 