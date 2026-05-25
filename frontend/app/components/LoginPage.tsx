'use client';

import { useEffect, useState } from 'react';
import { authAPI } from '../utils/api';
import { authUtils } from '../utils/auth';
import BrandMark from './BrandMark';
import styles from './LoginPage.module.css';

const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [pendingAccess, setPendingAccess] = useState<'gmail' | 'actions' | null>(null);

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
            const grantedScopes = result.credentials.granted_scopes || result.credentials.scopes || [];
            if (result.access_type === 'actions' && !grantedScopes.includes(GMAIL_MODIFY_SCOPE)) {
              setStatus('Google did not grant cleanup permission. Please choose Scan + enable cleanup actions again and approve Gmail cleanup access.');
              window.history.replaceState({}, '', '/');
              return;
            }
            authUtils.storeAccount(result.user, result.credentials);
            setGmailConnected(true);
            onLoginSuccess?.();
            window.location.href = '/dashboard';
            return;
          }

          setStatus('Account created. Connect Gmail metadata when you are ready to scan your inbox.');
          window.history.replaceState({}, '', '/');
        } catch (error) {
          console.error('Callback handling failed:', error);
          const message = error instanceof Error ? error.message : '';
          setStatus(
            message.includes('Scope has changed')
              ? 'Google returned an older permission set. Disconnect the app from your Google Account permissions, then try again.'
              : 'Could not finish sign-in. Check the production Google OAuth setup and try again.'
          );
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
      const nextStatus =
        access === 'profile'
          ? 'Opening Google signup...'
          : access === 'actions'
            ? 'Opening Gmail cleanup permission...'
            : 'Opening Gmail metadata connection...';
      setStatus(nextStatus);
      const { auth_url, state, access_type } = await authAPI.getLoginUrl(access);
      authUtils.storeOAuthState(state, access_type);
      
      // Redirect to Google OAuth
      window.location.href = auth_url;
    } catch (error) {
      console.error('Login failed:', error);
      setStatus('Failed to start sign-in. Check the production backend and Google OAuth configuration.');
      setLoading(false);
    }
  };

  const handleSignupClick = () => startOAuth('profile');
  const handleConnectGmailClick = () => setPendingAccess('gmail');
  const handleCleanupAccessClick = () => setPendingAccess('actions');

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
          <div className={styles.brandLockup}>
            <BrandMark size={48} />
            <div>
              <strong>MailTriage</strong>
              <span>Private inbox optimizer</span>
            </div>
          </div>
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
          <BrandMark size={40} />
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
            <div className={styles.connectChoices}>
              <button onClick={handleConnectGmailClick} className={styles.loginButton} disabled={loading}>
                {loading ? 'Working...' : 'Scan only'}
              </button>
              <button onClick={handleCleanupAccessClick} className={styles.secondaryActionButton} disabled={loading}>
                Scan + enable cleanup actions
              </button>
            </div>
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
            By continuing, you agree to the Privacy Policy and Terms. Choose metadata-only scan or grant archive/trash permission upfront if you plan to clean immediately.
          </p>

          <div className={styles.legalLinks}>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/data-deletion">Data deletion</a>
          </div>
        </section>
      </main>

      {pendingAccess && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.permissionModal} role="dialog" aria-modal="true" aria-labelledby="gmail-permission-title">
            <p className={styles.cardEyebrow}>Google permission</p>
            <h2 id="gmail-permission-title">
              {pendingAccess === 'actions' ? 'Enable scan and cleanup actions' : 'Connect Gmail metadata'}
            </h2>
            <p>
              {pendingAccess === 'actions'
                ? 'MailTriage can request Gmail modify permission now so Archive and Trash are ready when you start selecting emails. It will still only act on messages you explicitly choose and confirm.'
                : 'To calculate your cleanup score and sort inbox clutter, MailTriage needs temporary Gmail metadata access. It does not fetch message bodies, snippets, or attachment files.'}
            </p>
            <div className={styles.permissionFacts}>
              <span>{pendingAccess === 'actions' ? 'Includes metadata scan access' : 'Subjects, dates, labels, sender domains'}</span>
              <span>Processed in-memory for your dashboard</span>
              <span>{pendingAccess === 'actions' ? 'Archive/trash only after your confirmation' : 'Archive/trash permission requested later'}</span>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setPendingAccess(null)}>
                Not now
              </button>
              <button className={styles.loginButton} onClick={() => startOAuth(pendingAccess)} disabled={loading}>
                Continue to Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
