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
  const [pendingAccess, setPendingAccess] = useState<'gmail' | null>(null);

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

          if (['gmail', 'actions'].includes(result.access_type) && result.credentials) {
            authUtils.storeCredentials(result.credentials);
            setGmailConnected(true);
            onLoginSuccess?.();
            window.location.href = '/dashboard';
            return;
          }

          setStatus('Account created. Connect Gmail metadata when you are ready to scan your inbox.');
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

  const startOAuth = async (access: 'profile' | 'gmail' | 'actions') => {
    try {
      setLoading(true);
      setStatus(access === 'profile' ? 'Opening Google signup...' : 'Opening Gmail metadata connection...');
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
  const handleConnectGmailClick = () => setPendingAccess('gmail');

  return (
    <div className={styles.container}>
      {loading && status.includes('Finishing') && (
        <div className={styles.loadingOverlay} role="status">
          <div className={styles.pulse} />
          <p>{status}</p>
          <span>Building your private cleanup session...</span>
        </div>
      )}

      <main className={styles.portal}>
        <section className={styles.showcase}>
          <p className={styles.eyebrow}>Inbox optimizer</p>
          <h1 className={styles.title}>Your Inbox, Reclaimed.</h1>
          <p className={styles.subtitle}>
            Sort Gmail clutter into clear cleanup groups with metadata-only scanning and user-confirmed actions.
          </p>

          <div className={styles.previewPanel} aria-hidden="true">
            <div className={styles.previewHeader}>
              <span>Cleanup score</span>
              <strong>82</strong>
            </div>
            <div className={styles.previewGrid}>
              <div><strong>76</strong><span>Promotions</span></div>
              <div><strong>6</strong><span>OTPs</span></div>
              <div><strong>13</strong><span>Jobs</span></div>
              <div><strong>2</strong><span>Attachments</span></div>
            </div>
            <div className={styles.previewRows}>
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className={styles.trustStrip}>
            <span>No body reads</span>
            <span>Session only</span>
            <span>Revoke anytime</span>
          </div>
        </section>

        <section className={styles.card}>
          <p className={styles.cardEyebrow}>Secure portal</p>
          <h2>{user ? `Welcome${user.name ? `, ${user.name}` : ''}` : 'Continue with Google'}</h2>
          <p className={styles.cardCopy}>
            {user
              ? 'Your account is ready. Connect Gmail metadata only when you want to scan.'
              : 'Signup only uses your basic Google profile. Gmail access is requested later, right before scanning.'}
          </p>

          {!user && (
            <button onClick={handleSignupClick} className={styles.loginButton} disabled={loading}>
              {loading ? 'Working...' : 'Continue with Google'}
            </button>
          )}

          {user && !gmailConnected && (
            <button onClick={handleConnectGmailClick} className={styles.loginButton} disabled={loading}>
              {loading ? 'Working...' : 'Scan my inbox'}
            </button>
          )}

          {user && gmailConnected && (
            <button onClick={() => { window.location.href = '/dashboard'; }} className={styles.loginButton}>
              Open dashboard
            </button>
          )}

          {status && <p className={styles.status}>{status}</p>}

          <div className={styles.privacyBox}>
            <div>
              <strong>Zero retention scan</strong>
              <span>Scan results stay in your active browser session.</span>
            </div>
            <div>
              <strong>Metadata-first</strong>
              <span>No message bodies, snippets, or attachment files are fetched.</span>
            </div>
            <div>
              <strong>No selling</strong>
              <span>Google data is used only to organize your inbox session.</span>
            </div>
          </div>

          <p className={styles.privacyNote}>
            By continuing, you agree to the Privacy Policy and Terms. Gmail scan and Gmail actions use separate Google consent steps.
          </p>

          <div className={styles.legalLinks}>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/data-deletion">Data deletion</a>
          </div>
        </section>
      </main>

      {pendingAccess === 'gmail' && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.permissionModal} role="dialog" aria-modal="true" aria-labelledby="gmail-permission-title">
            <p className={styles.cardEyebrow}>Google permission</p>
            <h2 id="gmail-permission-title">Connect Gmail metadata</h2>
            <p>
              To calculate your cleanup score and sort inbox clutter, Gmail Organizer needs temporary Gmail metadata access.
              It does not fetch message bodies, snippets, or attachment files.
            </p>
            <div className={styles.permissionFacts}>
              <span>Subjects, dates, labels, sender domains</span>
              <span>Processed in-memory for your dashboard</span>
              <span>Archive/trash permission requested later</span>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setPendingAccess(null)}>
                Not now
              </button>
              <button className={styles.loginButton} onClick={() => startOAuth('gmail')} disabled={loading}>
                Continue to Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
