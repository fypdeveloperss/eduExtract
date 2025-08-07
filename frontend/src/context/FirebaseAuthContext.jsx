import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [modalMode, setModalMode] = useState('signin');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      // Check admin status when user changes
      if (user) {
        await checkAdminStatus();
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      setAdminLoading(true);
      console.log('Checking admin status for user:', user.uid);
      const token = await user.getIdToken();
      
      // First check the enhanced admin status
      try {
        const enhancedResponse = await fetch('/api/admin/check-enhanced', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (enhancedResponse.ok) {
          const enhancedData = await enhancedResponse.json();
          console.log('Enhanced admin check response:', enhancedData);
          setIsAdmin(enhancedData.isAdmin);
          return; // Exit early if enhanced check works
        }
      } catch (enhancedError) {
        console.log('Enhanced admin check failed, falling back to legacy check');
      }
      
      // Fallback to legacy admin check
      const response = await fetch('/api/admin/check', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Admin check response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Admin check response data:', data);
        setIsAdmin(data.isAdmin);
      } else {
        console.log('Admin check failed with status:', response.status);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  };

  // Add a separate useEffect to trigger admin check when user changes
  useEffect(() => {
    if (user) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Manual trigger for admin check (for debugging)
  const manualAdminCheck = async () => {
    console.log('Manual admin check triggered');
    await checkAdminStatus();
  };

  const login = async (email, password) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      setShowAuthModal(false);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const signup = async (email, password) => {
    try {
      setError(null);
      await createUserWithEmailAndPassword(auth, email, password);
      setShowAuthModal(false);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const toggleAuthModal = (show = !showAuthModal) => {
    setShowAuthModal(show);
    if (!show) {
      setModalMode('signin');
      setError(null);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        loginWithGoogle,
        showAuthModal,
        toggleAuthModal,
        error,
        modalMode,
        setModalMode,
        isAdmin,
        adminLoading,
        checkAdminStatus,
        manualAdminCheck
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 