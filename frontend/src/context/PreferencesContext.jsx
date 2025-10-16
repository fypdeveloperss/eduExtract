import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './FirebaseAuthContext';
import axios from '../utils/axios';

const PreferencesContext = createContext();

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
};

export const PreferencesProvider = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/preferences');
      setPreferences(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates) => {
    try {
      const response = await axios.put('/api/users/preferences', updates);
      setPreferences(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resetToDefaults = async () => {
    try {
      const response = await axios.get('/api/users/preferences/default');
      await updatePreferences(response.data);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return (
    <PreferencesContext.Provider value={{
      preferences,
      loading,
      error,
      updatePreferences,
      resetToDefaults,
      fetchPreferences
    }}>
      {children}
    </PreferencesContext.Provider>
  );
};
