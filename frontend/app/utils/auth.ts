/**
 * Authentication utilities for managing credentials in session storage.
 * Tokens are not persisted after the browser session ends.
 */

const CREDENTIALS_KEY = 'gmail_organizer_credentials';
const USER_KEY = 'gmail_organizer_user';
const OAUTH_STATE_KEY = 'gmail_organizer_oauth_state';
const OAUTH_ACCESS_KEY = 'gmail_organizer_oauth_access';

export const authUtils = {
  // Store credentials in sessionStorage
  storeCredentials: (credentials: any) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    }
  },

  storeUser: (user: any) => {
    if (typeof window !== 'undefined' && user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  getUser: (): any | null => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  },

  // Retrieve credentials from sessionStorage
  getCredentials: (): any | null => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(CREDENTIALS_KEY);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  },

  hasScope: (scope: string): boolean => {
    const credentials = authUtils.getCredentials();
    const scopes = credentials?.scopes || [];
    return Array.isArray(scopes) && scopes.includes(scope);
  },

  // Clear credentials from current and legacy browser storage
  clearCredentials: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CREDENTIALS_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(OAUTH_STATE_KEY);
      sessionStorage.removeItem(OAUTH_ACCESS_KEY);
      localStorage.removeItem(CREDENTIALS_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(OAUTH_STATE_KEY);
      localStorage.removeItem(OAUTH_ACCESS_KEY);
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(USER_KEY) !== null;
    }
    return false;
  },

  // Store OAuth state for verification
  storeOAuthState: (state: string, accessType = 'gmail') => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(OAUTH_STATE_KEY, state);
      sessionStorage.setItem(OAUTH_ACCESS_KEY, accessType);
    }
  },

  getOAuthAccessType: (): string => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(OAUTH_ACCESS_KEY) || 'gmail';
    }
    return 'gmail';
  },

  // Retrieve and verify OAuth state
  getAndVerifyOAuthState: (returnedState: string): boolean => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(OAUTH_STATE_KEY);
      return stored === returnedState;
    }
    return false;
  },

};

export default authUtils;
