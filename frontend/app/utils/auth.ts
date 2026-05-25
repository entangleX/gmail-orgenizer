/**
 * Authentication utilities for managing credentials in session storage.
 * Tokens are not persisted after the browser session ends.
 */

const CREDENTIALS_KEY = 'gmail_organizer_credentials';
const USER_KEY = 'gmail_organizer_user';
const ACCOUNTS_KEY = 'mailtriage_accounts';
const ACTIVE_ACCOUNT_KEY = 'mailtriage_active_account';
const OAUTH_STATE_KEY = 'gmail_organizer_oauth_state';
const OAUTH_ACCESS_KEY = 'gmail_organizer_oauth_access';

const accountIdFor = (user: any, credentials: any) =>
  user?.email || credentials?.account_email || credentials?.client_id || `account_${Date.now()}`;

const readAccounts = (): any[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const stored = sessionStorage.getItem(ACCOUNTS_KEY);
  const accounts = stored ? JSON.parse(stored) : [];
  if (accounts.length > 0) {
    return accounts;
  }

  const legacyCredentials = sessionStorage.getItem(CREDENTIALS_KEY);
  const legacyUser = sessionStorage.getItem(USER_KEY);
  if (!legacyCredentials) {
    return [];
  }

  const user = legacyUser ? JSON.parse(legacyUser) : null;
  const credentials = JSON.parse(legacyCredentials);
  const id = accountIdFor(user, credentials);
  const migrated = [{ id, user, credentials, connected_at: new Date().toISOString() }];
  sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(migrated));
  sessionStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
  return migrated;
};

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

  storeAccount: (user: any, credentials: any) => {
    if (typeof window !== 'undefined' && credentials) {
      const accounts = readAccounts();
      const id = accountIdFor(user, credentials);
      const nextAccount = {
        id,
        user,
        credentials: {
          ...credentials,
          account_email: user?.email || credentials?.account_email,
        },
        connected_at: new Date().toISOString(),
      };
      const nextAccounts = [
        nextAccount,
        ...accounts.filter((account) => account.id !== id),
      ];
      sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
      sessionStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
      sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(nextAccount.credentials));
      if (user) {
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      return nextAccount;
    }
    return null;
  },

  getAccounts: (): any[] => readAccounts(),

  getActiveAccount: (): any | null => {
    if (typeof window !== 'undefined') {
      const accounts = readAccounts();
      const activeId = sessionStorage.getItem(ACTIVE_ACCOUNT_KEY);
      return accounts.find((account) => account.id === activeId) || accounts[0] || null;
    }
    return null;
  },

  setActiveAccount: (accountId: string): any | null => {
    if (typeof window !== 'undefined') {
      const accounts = readAccounts();
      const account = accounts.find((item) => item.id === accountId);
      if (!account) {
        return null;
      }
      sessionStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
      sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(account.credentials));
      if (account.user) {
        sessionStorage.setItem(USER_KEY, JSON.stringify(account.user));
      }
      return account;
    }
    return null;
  },

  getUser: (): any | null => {
    if (typeof window !== 'undefined') {
      const account = authUtils.getActiveAccount();
      if (account?.user) {
        return account.user;
      }
      const stored = sessionStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  },

  // Retrieve credentials from sessionStorage
  getCredentials: (): any | null => {
    if (typeof window !== 'undefined') {
      const account = authUtils.getActiveAccount();
      if (account?.credentials) {
        return account.credentials;
      }
      const stored = sessionStorage.getItem(CREDENTIALS_KEY);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  },

  hasScope: (scope: string): boolean => {
    const credentials = authUtils.getCredentials();
    if (scope === 'https://www.googleapis.com/auth/gmail.modify' && !credentials?.granted_scopes) {
      return false;
    }
    const scopes = credentials?.granted_scopes || credentials?.scopes || [];
    return Array.isArray(scopes) && scopes.includes(scope);
  },

  // Clear credentials from current and legacy browser storage
  clearCredentials: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CREDENTIALS_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(ACCOUNTS_KEY);
      sessionStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      sessionStorage.removeItem(OAUTH_STATE_KEY);
      sessionStorage.removeItem(OAUTH_ACCESS_KEY);
      localStorage.removeItem(CREDENTIALS_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ACCOUNTS_KEY);
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      localStorage.removeItem(OAUTH_STATE_KEY);
      localStorage.removeItem(OAUTH_ACCESS_KEY);
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      return readAccounts().length > 0 || sessionStorage.getItem(USER_KEY) !== null;
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
