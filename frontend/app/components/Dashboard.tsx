'use client';

import type { CSSProperties } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { emailAPI, authAPI } from '../utils/api';
import { authUtils } from '../utils/auth';
import BrandMark from './BrandMark';
import EmailBucket from './EmailBucket';
import styles from './Dashboard.module.css';

interface Bucket {
  [key: string]: any[];
}

interface Stats {
  [key: string]: number;
}

const BUCKET_GROUPS = [
  {
    label: 'Quick Cleanup',
    buckets: [
      ['attachments', 'Attachments'],
      ['promotions', 'Promotions'],
      ['newsletters', 'Newsletters'],
      ['otp_security', 'OTPs'],
      ['latest_jobs', 'Latest Jobs'],
      ['jobs', 'Jobs'],
      ['spam_junk', 'Spam/Junk'],
    ],
  },
  {
    label: 'Identity & Institutions',
    buckets: [
      ['government_id', 'Govt/ID'],
      ['institutional', 'Institutional'],
      ['legal', 'Legal'],
      ['educational', 'Education'],
    ],
  },
  {
    label: 'Review First',
    buckets: [
      ['shopping', 'Shopping'],
      ['shopping_receipts', 'Receipts'],
      ['finance', 'Finance'],
      ['travel', 'Travel'],
    ],
  },
  {
    label: 'General',
    buckets: [
      ['social', 'Social'],
      ['updates', 'Updates'],
      ['other', 'Other'],
    ],
  },
];

const BUCKETS = BUCKET_GROUPS.flatMap((group) => group.buckets);
const BUCKET_NAMES = BUCKETS.map(([name]) => name);
const AGE_FILTERS = [
  ['all', 'All ages'],
  ['under_1y', '<1y'],
  ['1y_plus', '1y+'],
  ['2y_plus', '2y+'],
  ['3y_plus', '3y+'],
  ['5y_plus', '5y+'],
  ['unknown_age', 'Unknown'],
];

const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const TEN_MB = 10 * 1024 * 1024;

export default function Dashboard() {
  const [credentials, setCredentials] = useState<any>(null);
  const [buckets, setBuckets] = useState<Bucket>({});
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('attachments');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [scanLimit, setScanLimit] = useState<number | 'all'>(200);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasActionAccess, setHasActionAccess] = useState(false);
  const [permissionPrompt, setPermissionPrompt] = useState<'actions' | null>(null);

  const fetchEmails = useCallback(async (creds: any, limit = scanLimit) => {
    try {
      setLoading(true);
      setError('');
      const data = await emailAPI.fetchEmails(creds, limit);
      const nextBuckets = data.buckets || {};
      setBuckets(nextBuckets);
      setStats(
        BUCKET_NAMES.reduce(
          (nextStats, bucket) => ({
            ...nextStats,
            [`${bucket}_count`]: nextBuckets[bucket]?.length || 0,
          }),
          {
            total_emails: data.total_count || 0,
            scan_complete_mode: data.scan_mode === 'complete' ? 1 : 0,
          } as Stats
        )
      );
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      setError('Failed to fetch emails. Confirm the backend is running and your Google OAuth credentials are valid.');
    } finally {
      setLoading(false);
    }
  }, [scanLimit]);

  useEffect(() => {
    const creds = authUtils.getCredentials();
    if (!creds) {
      window.location.href = '/';
      return;
    }
    setCredentials(creds);
    setHasActionAccess(authUtils.hasScope(GMAIL_MODIFY_SCOPE));
    fetchEmails(creds, scanLimit);
  }, [fetchEmails, scanLimit]);

  const requestActionAccess = async () => {
    try {
      setActionLoading(true);
      setPermissionPrompt(null);
      setError('Archive and trash require one extra Gmail permission. Redirecting to Google...');
      const { auth_url, state, access_type } = await authAPI.getLoginUrl('actions');
      authUtils.storeOAuthState(state, access_type);
      window.location.href = auth_url;
    } catch (error) {
      console.error('Failed to request action access:', error);
      setError('Could not request archive/trash permission. Please try again.');
      setActionLoading(false);
    }
  };

  const handleSelectEmail = (emailId: string, selected: boolean) => {
    const newSelected = new Set(selectedEmails);
    if (selected) {
      newSelected.add(emailId);
    } else {
      newSelected.delete(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    const newSelected = new Set(selectedEmails);
    
    currentBucketEmails.forEach((email: any) => {
      if (selected) {
        newSelected.add(email.email_id);
      } else {
        newSelected.delete(email.email_id);
      }
    });
    
    setSelectedEmails(newSelected);
  };

  const selectMatchingEmails = (predicate: (email: any) => boolean) => {
    const nextSelected = new Set(selectedEmails);
    Object.values(buckets)
      .flat()
      .filter(predicate)
      .forEach((email: any) => nextSelected.add(email.email_id));
    setSelectedEmails(nextSelected);
  };

  const focusBucket = (bucket: string, nextAgeFilter = 'all') => {
    setActiveTab(bucket);
    setAgeFilter(nextAgeFilter);
  };

  const handleTrashSelected = async () => {
    if (selectedEmails.size === 0) {
      setError('Select at least one email first.');
      return;
    }

    if (!hasActionAccess) {
      setPermissionPrompt('actions');
      return;
    }

    if (!confirm(`Delete ${selectedEmails.size} emails?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      const selectedCount = selectedEmails.size;
      await emailAPI.trashEmails(credentials, Array.from(selectedEmails));
      
      // Refresh emails
      await fetchEmails(credentials);
      setSelectedEmails(new Set());
      setError(`Moved ${selectedCount} emails to trash.`);
    } catch (error) {
      console.error('Failed to trash emails:', error);
      setError('Failed to move emails to trash. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedEmails.size === 0) {
      setError('Select at least one email first.');
      return;
    }

    if (!hasActionAccess) {
      setPermissionPrompt('actions');
      return;
    }

    if (!confirm(`Archive ${selectedEmails.size} emails?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      const selectedCount = selectedEmails.size;
      await emailAPI.archiveEmails(credentials, Array.from(selectedEmails));
      
      // Refresh emails
      await fetchEmails(credentials);
      setSelectedEmails(new Set());
      setError(`Archived ${selectedCount} emails.`);
    } catch (error) {
      console.error('Failed to archive emails:', error);
      setError('Failed to archive emails. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const currentCredentials = authUtils.getCredentials();
      if (currentCredentials) {
        await authAPI.revoke(currentCredentials);
      } else {
        await authAPI.logout();
      }
      authUtils.clearCredentials();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      authUtils.clearCredentials();
      window.location.href = '/';
    }
  };

  const rawBucketEmails = buckets[activeTab] || [];
  const currentBucketEmails =
    ageFilter === 'all'
      ? rawBucketEmails
      : rawBucketEmails.filter((email: any) => email.age_group === ageFilter);
  const selectedInCurrentBucket = currentBucketEmails.filter((email: any) =>
    selectedEmails.has(email.email_id)
  ).length;
  const allEmails = Object.values(buckets).flat();
  const quickCleanupCount = ['otp_security', 'spam_junk', 'promotions', 'newsletters'].reduce(
    (total, bucket) => total + (buckets[bucket]?.length || 0),
    0
  );
  const protectedCount = ['government_id', 'institutional', 'legal', 'finance'].reduce(
    (total, bucket) => total + (buckets[bucket]?.length || 0),
    0
  );
  const oldEmailCount = allEmails.filter((email: any) =>
    ['1y_plus', '2y_plus', '3y_plus', '5y_plus'].includes(email.age_group)
  ).length;
  const cleanupScore = stats.total_emails
    ? Math.max(0, Math.round(100 - (quickCleanupCount / stats.total_emails) * 100))
    : 100;
  const scoreColor = cleanupScore >= 80 ? '#10b981' : cleanupScore >= 55 ? '#f59e0b' : '#f97316';
  const scoreStyle = {
    background: `conic-gradient(${scoreColor} ${cleanupScore * 3.6}deg, #e5eaf2 0deg)`,
  } as CSSProperties;
  const heavyCount = allEmails.filter((email: any) => Number(email.size_estimate || 0) >= TEN_MB).length;
  const attachmentSpaceMb = Math.round(
    (allEmails
      .filter((email: any) => email.bucket === 'attachments')
      .reduce((total: number, email: any) => total + Number(email.size_estimate || 0), 0) /
      (1024 * 1024)) *
      10
  ) / 10;
  const selectedSpaceMb = Math.round(
    (allEmails
      .filter((email: any) => selectedEmails.has(email.email_id))
      .reduce((total: number, email: any) => total + Number(email.size_estimate || 0), 0) /
      (1024 * 1024)) *
      10
  ) / 10;
  const scoreMessage =
    cleanupScore >= 80
      ? 'Your inbox is in strong shape.'
      : cleanupScore >= 55
        ? 'A focused cleanup pass will move this fast.'
        : 'Start with OTPs and old promotions for the easiest win.';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brandLockup}>
            <BrandMark size={42} />
            <div>
              <p className={styles.eyebrow}>Inbox optimizer</p>
              <h1 className={styles.title}>MailTriage</h1>
            </div>
          </div>
          <div className={styles.headerActions}>
            <select
              className={styles.scanSelect}
              value={scanLimit}
              onChange={(event) => setScanLimit(event.target.value === 'all' ? 'all' : Number(event.target.value))}
              aria-label="Email scan size"
            >
              <option value={50}>Scan 50</option>
              <option value={100}>Scan 100</option>
              <option value={200}>Scan 200</option>
              <option value={500}>Scan 500</option>
              <option value="all">Complete inbox</option>
            </select>
            <button onClick={() => credentials && fetchEmails(credentials)} className={styles.refreshBtn}>
              Refresh
            </button>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <div className={styles.mainContent}>
        <div className={styles.statsPanel}>
          <div className={styles.scorePanel}>
            <span className={styles.scoreLabel}>Cleanup score</span>
            <div className={styles.scoreRing} style={scoreStyle}>
              <div className={styles.scoreInner}>
                <strong className={styles.scoreValue}>{cleanupScore}</strong>
                <span>/100</span>
              </div>
            </div>
            <span className={styles.scoreHint}>{scoreMessage}</span>
            <span className={styles.scoreMeta}>{quickCleanupCount} easy cleanup candidates</span>
          </div>

          <div className={styles.trustPanel}>
            <strong>Private scan mode</strong>
            <span>Metadata only. No bodies, snippets, or files are fetched.</span>
          </div>

          <h2>Your Gmail Stats</h2>
          <div className={styles.statsList}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Emails:</span>
              <span className={styles.statValue}>{stats.total_emails || 0}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Heavy emails:</span>
              <span className={styles.statValue}>{heavyCount}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Attachment estimate:</span>
              <span className={styles.statValue}>{attachmentSpaceMb} MB</span>
            </div>
            {BUCKETS.slice(0, 8).map(([bucket, label]) => (
              <div className={styles.statItem} key={bucket}>
                <span className={styles.statLabel}>{label}:</span>
                <span className={styles.statValue}>{stats[`${bucket}_count`] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.emailPanel}>
          {error && <div className={styles.notice}>{error}</div>}

          <div className={styles.commandBar}>
            <div>
              <p className={styles.eyebrow}>Metadata scan</p>
              <h2 className={styles.panelTitle}>{stats.total_emails || 0} emails analyzed</h2>
              {stats.scan_complete_mode ? (
                <p className={styles.panelHint}>Complete mode scans Gmail metadata only: labels, selected headers, IDs, and dates. No bodies or attachments are fetched.</p>
              ) : (
                <p className={styles.panelHint}>Limited mode is faster. Scans use metadata only; archive/trash permission is requested separately.</p>
              )}
            </div>
            <div className={styles.metricStrip}>
              <div className={styles.metric}>
                <span>{quickCleanupCount}</span>
                <small>Quick cleanup</small>
              </div>
              <div className={styles.metric}>
                <span>{oldEmailCount}</span>
                <small>Old emails</small>
              </div>
              <div className={styles.metric}>
                <span>{protectedCount}</span>
                <small>Review carefully</small>
              </div>
              <div className={styles.metric}>
                <span>{selectedSpaceMb} MB</span>
                <small>Selected estimate</small>
              </div>
            </div>
          </div>

          <div className={styles.recommendations}>
            <button
              className={styles.recommendation}
              onClick={() => focusBucket('attachments')}
            >
              <span>Space watch</span>
              <strong>{heavyCount} heavy</strong>
              <small>Review messages estimated above 10 MB.</small>
            </button>
            <button
              className={styles.recommendation}
              onClick={() => {
                focusBucket('otp_security');
                selectMatchingEmails((email) => email.bucket === 'otp_security');
              }}
            >
              <span>Safe sweep</span>
              <strong>{buckets.otp_security?.length || 0} OTPs</strong>
              <small>Select expired security codes.</small>
            </button>
            <button
              className={styles.recommendation}
              onClick={() => {
                focusBucket('promotions', '1y_plus');
                selectMatchingEmails(
                  (email) => email.bucket === 'promotions' && ['1y_plus', '2y_plus', '3y_plus', '5y_plus'].includes(email.age_group)
                );
              }}
            >
              <span>Old promos</span>
              <strong>{buckets.promotions?.filter((email: any) => email.age_group !== 'under_1y').length || 0}</strong>
              <small>Find stale offers and campaigns.</small>
            </button>
            <button
              className={styles.recommendation}
              onClick={() => focusBucket('government_id')}
            >
              <span>Protect</span>
              <strong>{buckets.government_id?.length || 0} ID emails</strong>
              <small>Review identity and government notices.</small>
            </button>
            <button
              className={styles.recommendation}
              onClick={() => focusBucket('latest_jobs')}
            >
              <span>Act now</span>
              <strong>{buckets.latest_jobs?.length || 0} jobs</strong>
              <small>Recent recruiter and career emails.</small>
            </button>
          </div>

          <div className={styles.bucketGroups}>
            {BUCKET_GROUPS.map((group) => (
              <section className={styles.bucketGroup} key={group.label}>
                <h3 className={styles.bucketGroupTitle}>{group.label}</h3>
                <div className={styles.tabs}>
                  {group.buckets.map(([tab, label]) => (
                    <button
                      key={tab}
                      className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {label}
                      <span className={styles.tabCount}>
                        {buckets[tab]?.length || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className={styles.filters}>
            <span className={styles.filterLabel}>Age</span>
            {AGE_FILTERS.map(([value, label]) => (
              <button
                key={value}
                className={`${styles.filterBtn} ${ageFilter === value ? styles.activeFilter : ''}`}
                onClick={() => setAgeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className={styles.loading}>
              {scanLimit === 'all' ? 'Scanning complete inbox. This can take a while...' : 'Loading emails...'}
            </div>
          ) : (
            <>
              {currentBucketEmails.length > 0 && (
                <div className={styles.actions}>
                  <label className={styles.selectAllCheckbox}>
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      checked={
                        currentBucketEmails.length > 0 &&
                        currentBucketEmails.every((email: any) =>
                          selectedEmails.has(email.email_id)
                        )
                      }
                    />
                    Select All ({selectedInCurrentBucket} selected here, {selectedEmails.size} total)
                  </label>
                  
                  <div className={styles.actionButtons}>
                    {!hasActionAccess && (
                      <button
                        onClick={() => setPermissionPrompt('actions')}
                        disabled={actionLoading}
                        className={styles.enableActionsBtn}
                      >
                        Enable actions
                      </button>
                    )}
                    <button
                      onClick={handleArchiveSelected}
                      disabled={selectedEmails.size === 0 || actionLoading}
                      className={styles.archiveBtn}
                    >
                      {actionLoading ? 'Working...' : 'Archive'}
                    </button>
                    <button
                      onClick={handleTrashSelected}
                      disabled={selectedEmails.size === 0 || actionLoading}
                      className={styles.trashBtn}
                    >
                      {actionLoading ? 'Working...' : 'Trash'}
                    </button>
                  </div>
                </div>
              )}

              <EmailBucket
                emails={currentBucketEmails}
                selectedEmails={selectedEmails}
                onSelectEmail={handleSelectEmail}
              />
            </>
          )}
        </div>
      </div>

      {permissionPrompt === 'actions' && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.permissionModal} role="dialog" aria-modal="true" aria-labelledby="actions-title">
            <p className={styles.eyebrow}>Permission step</p>
            <h2 id="actions-title">Enable archive and trash</h2>
            <p>
              MailTriage scans with metadata-only access. To archive or move selected emails to trash,
              Google requires one extra Gmail modify permission. The app will only act on messages you select and confirm.
            </p>
            <div className={styles.permissionFacts}>
              <span>No message bodies fetched</span>
              <span>No attachment files downloaded</span>
              <span>Disconnect revokes Google access</span>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setPermissionPrompt(null)}>
                Not now
              </button>
              <button className={styles.primaryBtn} onClick={requestActionAccess} disabled={actionLoading}>
                Continue to Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
