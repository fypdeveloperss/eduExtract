import { auth } from '../config/firebase';

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

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

/**
 * Helper to validate and normalize email addresses
 * @param {string} email
 * @returns {string} Normalized email if valid
 * @throws {Error} If email is invalid
 */
export const validateEmail = (email = '') => {
  const normalizedEmail = email.trim();

  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  const [, domain = ''] = normalizedEmail.split('@');

  if (domain.includes('..')) {
    throw new Error('Email domain cannot contain consecutive dots.');
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  const secondLevel = domainParts[domainParts.length - 2];

  if (!tld || tld.length < 2 || tld.length > 24 || /[^A-Za-z]/.test(tld)) {
    throw new Error('Please enter a valid email domain.');
  }

  if (secondLevel && secondLevel.toLowerCase() === tld.toLowerCase()) {
    throw new Error('Please double-check the email domain spelling.');
  }

  return normalizedEmail.toLowerCase();
};