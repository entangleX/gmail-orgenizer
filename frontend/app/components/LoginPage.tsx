'use client';

import { useEffect, useState } from 'react';
import { authAPI } from '../utils/api';
import { authUtils } from '../utils/auth';
import styles from './LoginPage.module.css';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [gmailConnected, setGmailConnected] = useState(false);

  useEffect(() => {
    setUser(authUtils.getUser());
    setGmailConnected(Boolean(authUtils.getCredentials()));

    // Check if we're returning from OAuth callback
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setStatus('Google sign-in was cancelled or failed.');
        return;
      }

      if (code && state) {
        try {
          setLoading(true);
          setStatus('Finishing secure sign-in...');
          // Verify state
          if (!authUtils.getAndVerifyOAuthState(state)) {
            console.error('State verification failed');
            setStatus('Sign-in state could not be verified. Please try again.');
            return;
          }

          const result = await authAPI.handleCallback(code, state, authUtils.getOAuthAccessType());
          if (result.user) {
            authUtils.storeUser(result.user);
            setUser(result.user);
          }

          if (result.access_type === 'gmail' && result.credentials) {
            authUtils.storeCredentials(result.credentials);
            setGmailConnected(true);
            onLoginSuccess?.();
            window.location.href = '/dashboard';
            return;
          }

          setStatus('Account created. Connect Gmail when you are ready to scan your inbox.');
          window.history.replaceState({}, '', '/');
        } catch (error) {
          console.error('Callback handling failed:', error);
          setStatus('Could not finish sign-in. Check your Google OAuth setup and backend server.');
        } finally {
          setLoading(false);
        }
      }
    };

    handleCallback();
  }, [onLoginSuccess]);

  const startOAuth = async (access: 'profile' | 'gmail') => {
    try {
      setLoading(true);
      setStatus(access === 'profile' ? 'Opening Google signup...' : 'Opening Gmail connection...');
      const { auth_url, state, access_type } = await authAPI.getLoginUrl(access);
      authUtils.storeOAuthState(state, access_type);
      
      // Redirect to Google OAuth
      window.location.href = auth_url;
    } catch (error) {
      console.error('Login failed:', error);
      setStatus('Failed to start sign-in. Make sure the backend is running and configured.');
      setLoading(false);
    }
  };

  const handleSignupClick = () => startOAuth('profile');
  const handleConnectGmailClick = () => startOAuth('gmail');

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Gmail Organizer</h1>
        <p className={styles.subtitle}>
          {user ? `Welcome${user.name ? `, ${user.name}` : ''}` : 'Create your account first. Connect Gmail only when ready.'}
        </p>
        
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.icon}>📧</span>
            <p>Automatically organize your emails</p>
          </div>
          <div className={styles.feature}>
            <span className={styles.icon}>🗑️</span>
            <p>Bulk delete promotions & spam</p>
          </div>
          <div className={styles.feature}>
            <span className={styles.icon}>🔒</span>
            <p>Your data stays private - no storage</p>
          </div>
        </div>

        {!user && (
          <button onClick={handleSignupClick} className={styles.loginButton} disabled={loading}>
            {loading ? 'Working...' : 'Sign up with Google'}
          </button>
        )}

        {user && !gmailConnected && (
          <button onClick={handleConnectGmailClick} className={styles.loginButton} disabled={loading}>
            {loading ? 'Working...' : 'Connect Gmail'}
          </button>
        )}

        {user && gmailConnected && (
          <button onClick={() => { window.location.href = '/dashboard'; }} className={styles.loginButton}>
            Open dashboard
          </button>
        )}

        {status && <p className={styles.status}>{status}</p>}

        <p className={styles.privacyNote}>
          Signup uses basic profile access. Gmail access is requested separately because it requires Google verification for public launch.
        </p>

        <div className={styles.legalLinks}>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/data-deletion">Data deletion</a>
        </div>
      </div>
    </div>
  );
}
