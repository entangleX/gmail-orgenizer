/**
 * Authentication utilities for managing credentials in browser storage
 */

const CREDENTIALS_KEY = 'gmail_organizer_credentials';
const USER_KEY = 'gmail_organizer_user';
const OAUTH_STATE_KEY = 'gmail_organizer_oauth_state';
const OAUTH_ACCESS_KEY = 'gmail_organizer_oauth_access';

export const authUtils = {
  // Store credentials in localStorage
  storeCredentials: (credentials: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    }
  },

  storeUser: (user: any) => {
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  getUser: (): any | null => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  },

  // Retrieve credentials from localStorage
  getCredentials: (): any | null => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(CREDENTIALS_KEY);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  },

  // Clear credentials from localStorage
  clearCredentials: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CREDENTIALS_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(OAUTH_STATE_KEY);
      localStorage.removeItem(OAUTH_ACCESS_KEY);
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(USER_KEY) !== null;
    }
    return false;
  },

  // Store OAuth state for verification
  storeOAuthState: (state: string, accessType = 'gmail') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(OAUTH_STATE_KEY, state);
      localStorage.setItem(OAUTH_ACCESS_KEY, accessType);
    }
  },

  getOAuthAccessType: (): string => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(OAUTH_ACCESS_KEY) || 'gmail';
    }
    return 'gmail';
  },

  // Retrieve and verify OAuth state
  getAndVerifyOAuthState: (returnedState: string): boolean => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(OAUTH_STATE_KEY);
      return stored === returnedState;
    }
    return false;
  },

};

export default authUtils;
