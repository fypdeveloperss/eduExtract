import { auth } from '../config/firebase';

/**
 * Helper function to get the current Firebase user's ID token
 * @returns {Promise<string>} The Firebase ID token
 * @throws {Error} If user is not authenticated
 */
export const getFirebaseToken = async () => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated. Please log in again.');
  }

  try {
    // Force refresh to ensure we get a valid token
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    throw new Error('Failed to get authentication token. Please log in again.');
  }
};

/**
 * Helper function to make authenticated API requests
 * @param {string} url - The API endpoint URL
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>} The fetch response
 */
export const authenticatedFetch = async (url, options = {}) => {
  const token = await getFirebaseToken();
  
  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

/**
 * Helper function to check if user is currently authenticated
 * @returns {boolean} True if user is authenticated
 */
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

/**
 * Helper function to get current user information
 * @returns {object|null} Current user object or null if not authenticated
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};