'use client';

import type { CSSProperties } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
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
    label: 'Safe Sweep',
    buckets: [
      ['otp_security', 'OTPs'],
      ['spam_junk', 'Spam/Junk'],
      ['promotions', 'Promotions'],
      ['newsletters', 'Newsletters'],
      ['social', 'Social'],
      ['updates', 'Updates'],
    ],
  },
  {
    label: 'High Attention',
    buckets: [
      ['latest_jobs', 'Latest Jobs'],
      ['finance', 'Finance'],
      ['government_id', 'Govt/ID'],
      ['legal', 'Legal'],
      ['travel', 'Travel'],
    ],
  },
  {
    label: 'Records',
    buckets: [
      ['shopping_receipts', 'Receipts'],
      ['institutional', 'Institutional'],
      ['educational', 'Education'],
    ],
  },
  {
    label: 'Storage & Shopping',
    buckets: [
      ['attachments', 'Attachments'],
      ['shopping', 'Shopping'],
    ],
  },
  {
    label: 'Career & Other',
    buckets: [
      ['jobs', 'Jobs'],
      ['other', 'Other'],
    ],
  },
];

const BUCKETS = BUCKET_GROUPS.flatMap((group) => group.buckets);
const BUCKET_NAMES = BUCKETS.map(([name]) => name);
const AGE_FILTERS = [
  ['all', 'All ages'],
  ['fresh', 'Fresh'],
  ['7d_plus', '7d+'],
  ['30d_plus', '30d+'],
  ['90d_plus', '90d+'],
  ['6mo_plus', '6mo+'],
  ['1y_plus', '1y+'],
  ['2y_plus', '2y+'],
  ['3y_plus', '3y+'],
  ['5y_plus', '5y+'],
  ['unknown_age', 'Unknown'],
];

const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const TEN_MB = 10 * 1024 * 1024;
const OLD_AGE_GROUPS = ['1y_plus', '2y_plus', '3y_plus', '5y_plus'];
const STALE_AGE_GROUPS = ['90d_plus', '6mo_plus', ...OLD_AGE_GROUPS];
const OLD_PROMO_GROUPS = ['6mo_plus', ...OLD_AGE_GROUPS];
const BUCKET_ICONS: Record<string, string> = {
  attachments: 'AT',
  promotions: 'PR',
  newsletters: 'NL',
  otp_security: '2F',
  latest_jobs: 'JB',
  jobs: 'JB',
  spam_junk: 'SP',
  government_id: 'ID',
  institutional: 'IN',
  legal: 'LG',
  educational: 'ED',
  shopping: 'SH',
  shopping_receipts: 'RC',
  finance: 'FN',
  travel: 'TR',
  social: 'SO',
  updates: 'UP',
  other: 'OT',
};

const SMART_INTELLIGENCE = [
  {
    title: 'Dead Ends',
    label: 'Expired OTPs, flash sales, delivered trackers',
    detail: 'Needs body-read consent to inspect expiration language and delivery states.',
  },
  {
    title: 'The Graveyard',
    label: 'Stale subscriptions and unopened digests',
    detail: 'Needs richer Gmail access to evaluate engagement signals safely.',
  },
  {
    title: 'Tracking Radar',
    label: 'Marketing pixels and campaign beacons',
    detail: 'Needs optional body-read consent to detect tracking image patterns.',
  },
];

interface CleanupJob {
  id: string;
  operation: 'archive' | 'trash';
  status: 'queued' | 'running' | 'succeeded' | 'partial' | 'failed';
  total: number;
  processed: number;
  succeeded_count: number;
  failed_count: number;
  message?: string;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
}

const CLEANUP_JOB_IDS_KEY = 'mailtriage_cleanup_job_ids';
const CLEANUP_CONFIRM_SKIP_KEY = 'mailtriage_skip_cleanup_confirm';
const CLEANUP_CONFIRM_SEEN_KEY = 'mailtriage_cleanup_confirm_seen';
const TERMINAL_JOB_STATUSES = new Set(['succeeded', 'partial', 'failed']);

const readStoredCleanupJobIds = () => {
  if (typeof window === 'undefined') {
    return [];
  }
  const stored = sessionStorage.getItem(CLEANUP_JOB_IDS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const storeCleanupJobId = (jobId: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  const nextIds = [jobId, ...readStoredCleanupJobIds().filter((id: string) => id !== jobId)].slice(0, 8);
  sessionStorage.setItem(CLEANUP_JOB_IDS_KEY, JSON.stringify(nextIds));
};

const removeStoredCleanupJobId = (jobId: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  const nextIds = readStoredCleanupJobIds().filter((id: string) => id !== jobId);
  sessionStorage.setItem(CLEANUP_JOB_IDS_KEY, JSON.stringify(nextIds));
};

const getStoredBoolean = (key: string) =>
  typeof window !== 'undefined' && localStorage.getItem(key) === 'true';

const storeBoolean = (key: string, value = true) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, String(value));
  }
};

export default function Dashboard() {
  const [credentials, setCredentials] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeAccountId, setActiveAccountId] = useState('');
  const [buckets, setBuckets] = useState<Bucket>({});
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [scanLimit, setScanLimit] = useState<number | 'all'>(200);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [reviewLaterEmails, setReviewLaterEmails] = useState<Set<string>>(new Set());
  const [cleanupPlan, setCleanupPlan] = useState<{ archive: Set<string>; trash: Set<string> }>({
    archive: new Set(),
    trash: new Set(),
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasActionAccess, setHasActionAccess] = useState(false);
  const [permissionPrompt, setPermissionPrompt] = useState<'actions' | null>(null);
  const [deepScanPrompt, setDeepScanPrompt] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['General']));
  const [cleanupJobs, setCleanupJobs] = useState<CleanupJob[]>([]);
  const [skipCleanupConfirm, setSkipCleanupConfirm] = useState(false);
  const [cleanupIntroOpen, setCleanupIntroOpen] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(true);
  const [pendingCleanupAction, setPendingCleanupAction] = useState<{
    operation: 'archive' | 'trash' | 'plan';
    messageIds: string[];
  } | null>(null);
  const inFlightFetches = useRef<Set<string>>(new Set());
  const jobPollers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const fetchEmails = useCallback(async (
    creds: any,
    limit = scanLimit,
    options: { force?: boolean; silent?: boolean } = {}
  ) => {
    const accountKey = creds?.account_email || creds?.client_id || creds?.token?.slice(-12) || 'active';
    const fetchKey = `${accountKey}:${limit}`;
    if (!options.force && inFlightFetches.current.has(fetchKey)) {
      return;
    }

    try {
      inFlightFetches.current.add(fetchKey);
      if (!options.silent) {
        setLoading(true);
      }
      setError('');
      const data = await emailAPI.fetchEmails(creds, limit);
      const nextBuckets = data.buckets || {};
      setBuckets(nextBuckets);
      setActiveTab((currentTab) => {
        if (currentTab === 'all' || (nextBuckets[currentTab]?.length || 0) > 0) {
          return currentTab;
        }
        return 'all';
      });
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
      setError('Failed to fetch emails. Confirm the production backend and Google OAuth credentials are valid.');
    } finally {
      inFlightFetches.current.delete(fetchKey);
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [scanLimit]);

  useEffect(() => {
    const activeAccount = authUtils.getActiveAccount();
    const allAccounts = authUtils.getAccounts();
    if (!activeAccount?.credentials) {
      window.location.href = '/';
      return;
    }
    setAccounts(allAccounts);
    setActiveAccountId(activeAccount.id);
    const creds = activeAccount.credentials;
    const hasCleanupPermission = authUtils.hasScope(GMAIL_MODIFY_SCOPE);
    setCredentials(creds);
    setHasActionAccess(hasCleanupPermission);
    setSkipCleanupConfirm(getStoredBoolean(CLEANUP_CONFIRM_SKIP_KEY));
    if (hasCleanupPermission && !getStoredBoolean(CLEANUP_CONFIRM_SEEN_KEY)) {
      setCleanupIntroOpen(true);
    }
    fetchEmails(creds, scanLimit);
  }, [fetchEmails, scanLimit]);

  const upsertCleanupJob = useCallback((job: CleanupJob) => {
    setCleanupJobs((currentJobs) => {
      const nextJobs = [job, ...currentJobs.filter((item) => item.id !== job.id)];
      return nextJobs
        .sort((first, second) => Date.parse(second.created_at || '') - Date.parse(first.created_at || ''))
        .slice(0, 8);
    });
  }, []);

  const stopJobPoll = useCallback((jobId: string) => {
    const poller = jobPollers.current.get(jobId);
    if (poller) {
      clearInterval(poller);
      jobPollers.current.delete(jobId);
    }
  }, []);

  const forgetCleanupJob = useCallback((jobId: string) => {
    removeStoredCleanupJobId(jobId);
    setCleanupJobs((currentJobs) => currentJobs.filter((job) => job.id !== jobId));
  }, []);

  const pollCleanupJob = useCallback((jobId: string) => {
    if (jobPollers.current.has(jobId)) {
      return;
    }

    const tick = async () => {
      try {
        const data = await emailAPI.getCleanupJob(jobId);
        if (!data.job) {
          stopJobPoll(jobId);
          return;
        }
        upsertCleanupJob(data.job);
        if (TERMINAL_JOB_STATUSES.has(data.job.status)) {
          stopJobPoll(jobId);
          removeStoredCleanupJobId(jobId);
          if (data.job.error) {
            setError(data.job.error);
          } else if (data.job.message) {
            setError(data.job.message);
          }
          if (credentials) {
            fetchEmails(credentials, scanLimit, { force: true, silent: true });
          }
        }
      } catch (error) {
        stopJobPoll(jobId);
        const message = error instanceof Error ? error.message : '';
        if (message.includes('Cleanup job not found')) {
          forgetCleanupJob(jobId);
          return;
        }
        setError('Job progress is temporarily unavailable. Refresh the dashboard to resync.');
      }
    };

    const poller = setInterval(tick, 1500);
    jobPollers.current.set(jobId, poller);
    tick();
  }, [credentials, fetchEmails, forgetCleanupJob, scanLimit, stopJobPoll, upsertCleanupJob]);

  useEffect(() => {
    const pollers = jobPollers.current;
    readStoredCleanupJobIds().forEach((jobId: string) => pollCleanupJob(jobId));
    return () => {
      pollers.forEach((poller) => clearInterval(poller));
      pollers.clear();
    };
  }, [pollCleanupJob]);

  const handleSwitchAccount = (accountId: string) => {
    const account = authUtils.setActiveAccount(accountId);
    if (!account?.credentials) {
      return;
    }
    setActiveAccountId(account.id);
    setCredentials(account.credentials);
    const hasCleanupPermission = authUtils.hasScope(GMAIL_MODIFY_SCOPE);
    setHasActionAccess(hasCleanupPermission);
    if (hasCleanupPermission && !getStoredBoolean(CLEANUP_CONFIRM_SEEN_KEY)) {
      setCleanupIntroOpen(true);
    }
    setSelectedEmails(new Set());
    setBuckets({});
    fetchEmails(account.credentials, scanLimit);
  };

  const handleAddAccount = async () => {
    try {
      setActionLoading(true);
      setError('Opening Google account chooser...');
      const { auth_url, state, access_type } = await authAPI.getLoginUrl('gmail');
      authUtils.storeOAuthState(state, access_type);
      window.location.href = auth_url;
    } catch (error) {
      console.error('Failed to add account:', error);
      setError('Could not start Google account connection. Please try again.');
      setActionLoading(false);
    }
  };

  const requestActionAccess = async () => {
    try {
      setActionLoading(true);
      setPermissionPrompt(null);
      setError('Cleanup actions require one extra Gmail permission. Redirecting to Google...');
      const { auth_url, state, access_type } = await authAPI.getLoginUrl('actions');
      authUtils.storeOAuthState(state, access_type);
      window.location.href = auth_url;
    } catch (error) {
      console.error('Failed to request action access:', error);
      setError('Could not request cleanup permission. Please try again.');
      setActionLoading(false);
    }
  };

  const handleActionError = (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    setError(message);
    if (message.toLowerCase().includes('reconnect google cleanup permission')) {
      setHasActionAccess(false);
      setPermissionPrompt('actions');
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

  const markReviewLater = (emailIds: string[]) => {
    setReviewLaterEmails((current) => {
      const next = new Set(current);
      emailIds.forEach((emailId) => {
        if (next.has(emailId)) {
          next.delete(emailId);
        } else {
          next.add(emailId);
        }
      });
      return next;
    });
    setSelectedEmails((current) => {
      const next = new Set(current);
      emailIds.forEach((emailId) => next.delete(emailId));
      return next;
    });
    setCleanupPlan((current) => {
      const archive = new Set(current.archive);
      const trash = new Set(current.trash);
      emailIds.forEach((emailId) => {
        archive.delete(emailId);
        trash.delete(emailId);
      });
      return { archive, trash };
    });
    setError(`${emailIds.length} email${emailIds.length === 1 ? '' : 's'} moved to Review later.`);
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

  const removeMessagesFromView = (messageIds: string[]) => {
    const ids = new Set(messageIds);
    setBuckets((currentBuckets) => {
      const nextBuckets = Object.fromEntries(
        Object.entries(currentBuckets).map(([bucketName, emails]) => [
          bucketName,
          emails.filter((email: any) => !ids.has(email.email_id)),
        ])
      );
      setStats(
        BUCKET_NAMES.reduce(
          (nextStats, bucket) => ({
            ...nextStats,
            [`${bucket}_count`]: nextBuckets[bucket]?.length || 0,
          }),
          {
            total_emails: Object.values(nextBuckets).flat().length,
            scan_complete_mode: stats.scan_complete_mode || 0,
          } as Stats
        )
      );
      return nextBuckets;
    });
    setSelectedEmails((current) => {
      const next = new Set(current);
      messageIds.forEach((id) => next.delete(id));
      return next;
    });
    setReviewLaterEmails((current) => {
      const next = new Set(current);
      messageIds.forEach((id) => next.delete(id));
      return next;
    });
    setCleanupPlan((current) => {
      const archive = new Set(current.archive);
      const trash = new Set(current.trash);
      messageIds.forEach((id) => {
        archive.delete(id);
        trash.delete(id);
      });
      return { archive, trash };
    });
  };

  const trackQueuedJob = (result: any, messageIds: string[]) => {
    if (!result.job) {
      setError(result.message || 'Cleanup action started.');
      return;
    }
    upsertCleanupJob(result.job);
    storeCleanupJobId(result.job.id);
    pollCleanupJob(result.job.id);
    removeMessagesFromView(messageIds);
    setError(result.message || `${result.job.operation} job queued. You can keep working while it runs.`);
  };

  const queueArchiveMessages = async (messageIds: string[]) => {
    try {
      setActionLoading(true);
      setError('');
      const result = await emailAPI.archiveEmails(credentials, messageIds);
      trackQueuedJob(result, messageIds);
    } catch (error) {
      console.error('Failed to archive emails:', error);
      handleActionError(error, 'Failed to remove emails from inbox. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const queueTrashMessages = async (messageIds: string[]) => {
    try {
      setActionLoading(true);
      setError('');
      const result = await emailAPI.trashEmails(credentials, messageIds);
      trackQueuedJob(result, messageIds);
    } catch (error) {
      console.error('Failed to trash emails:', error);
      handleActionError(error, 'Failed to move emails to trash. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const queuePlannedTrash = (messageIds: string[]) => {
    if (messageIds.length === 0) {
      setError('Add emails to the delete list first.');
      return;
    }

    if (!hasActionAccess) {
      setPermissionPrompt('actions');
      return;
    }

    if (!skipCleanupConfirm) {
      setDontAskAgain(false);
      setPendingCleanupAction({ operation: 'trash', messageIds });
      return;
    }

    queueTrashMessages(messageIds);
  };

  const addToCleanupPlan = (operation: 'archive' | 'trash', messageIds: string[]) => {
    if (messageIds.length === 0) {
      setError('Select at least one email first.');
      return;
    }

    setCleanupPlan((current) => {
      const archive = new Set(current.archive);
      const trash = new Set(current.trash);
      messageIds.forEach((messageId) => {
        if (operation === 'archive') {
          archive.add(messageId);
          trash.delete(messageId);
        } else {
          trash.add(messageId);
          archive.delete(messageId);
        }
      });
      return { archive, trash };
    });
    setReviewLaterEmails((current) => {
      const next = new Set(current);
      messageIds.forEach((messageId) => next.delete(messageId));
      return next;
    });
    setError(
      `${messageIds.length} email${messageIds.length === 1 ? '' : 's'} added to the ready-to-delete list.`
    );
  };

  const removeFromCleanupPlan = (messageIds?: string[]) => {
    const ids = messageIds?.length ? messageIds : [...cleanupPlan.archive, ...cleanupPlan.trash];
    if (ids.length === 0) {
      setError('No planned emails to remove.');
      return;
    }
    setCleanupPlan((current) => {
      const archive = new Set(current.archive);
      const trash = new Set(current.trash);
      ids.forEach((messageId) => {
        archive.delete(messageId);
        trash.delete(messageId);
      });
      return { archive, trash };
    });
    setError(`${ids.length} email${ids.length === 1 ? '' : 's'} removed from the ready-to-delete list.`);
  };

  const runCleanupPlan = () => {
    const planIds = [...cleanupPlan.archive, ...cleanupPlan.trash];
    if (planIds.length === 0) {
      setError('Add emails to the ready-to-delete list before starting cleanup.');
      return;
    }
    queuePlannedTrash(planIds);
  };

  const executeCleanupPlan = async () => {
    const archiveIds = Array.from(cleanupPlan.archive);
    const trashIds = Array.from(cleanupPlan.trash);
    if (archiveIds.length === 0 && trashIds.length === 0) {
      setError('The ready-to-delete list is empty.');
      return;
    }

    setCleanupPlan({ archive: new Set(), trash: new Set() });
    await queueTrashMessages([...archiveIds, ...trashIds]);
  };

  const archiveMessageIds = (messageIds: string[]) => addToCleanupPlan('archive', messageIds);
  const trashMessageIds = (messageIds: string[]) => queuePlannedTrash(messageIds);
  const handleArchiveSelected = () => archiveMessageIds(Array.from(selectedEmails));
  const handleReviewSelected = () => markReviewLater(Array.from(selectedEmails));

  const saveCleanupIntroPreference = () => {
    storeBoolean(CLEANUP_CONFIRM_SEEN_KEY);
    if (dontAskAgain) {
      storeBoolean(CLEANUP_CONFIRM_SKIP_KEY);
      setSkipCleanupConfirm(true);
    }
    setCleanupIntroOpen(false);
  };

  const confirmPendingCleanupAction = () => {
    if (!pendingCleanupAction) {
      return;
    }
    storeBoolean(CLEANUP_CONFIRM_SEEN_KEY);
    if (dontAskAgain) {
      storeBoolean(CLEANUP_CONFIRM_SKIP_KEY);
      setSkipCleanupConfirm(true);
    }
    const action = pendingCleanupAction;
    setPendingCleanupAction(null);
    if (action.operation === 'plan') {
      executeCleanupPlan();
    } else if (action.operation === 'archive') {
      queueArchiveMessages(action.messageIds);
    } else {
      queueTrashMessages(action.messageIds);
    }
  };
  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupLabel)) {
        next.delete(groupLabel);
      } else {
        next.add(groupLabel);
      }
      return next;
    });
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

  const allEmails = Object.values(buckets).flat();
  const rawBucketEmails = activeTab === 'all' ? allEmails : buckets[activeTab] || [];
  const currentBucketEmails =
    ageFilter === 'all'
      ? rawBucketEmails
      : rawBucketEmails.filter((email: any) => email.age_group === ageFilter);
  const selectedInCurrentBucket = currentBucketEmails.filter((email: any) =>
    selectedEmails.has(email.email_id)
  ).length;
  const quickCleanupCount = ['otp_security', 'spam_junk', 'promotions', 'newsletters'].reduce(
    (total, bucket) => total + (buckets[bucket]?.length || 0),
    0
  );
  const protectedCount = ['government_id', 'institutional', 'legal', 'finance'].reduce(
    (total, bucket) => total + (buckets[bucket]?.length || 0),
    0
  );
  const staleCleanupCount = allEmails.filter((email: any) =>
    ['promotions', 'newsletters', 'social', 'updates'].includes(email.bucket) &&
    STALE_AGE_GROUPS.includes(email.age_group)
  ).length;
  const safeTrashCount = allEmails.filter((email: any) => email.action_hint === 'trash').length;
  const sensitiveCount = allEmails.filter((email: any) => email.safety_level === 'sensitive').length;
  const reviewLaterCount = reviewLaterEmails.size;
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
  const selectedCount = selectedEmails.size;
  const plannedArchiveCount = cleanupPlan.archive.size;
  const plannedTrashCount = cleanupPlan.trash.size;
  const readyDeleteCount = plannedArchiveCount + plannedTrashCount;
  const selectedReviewCount = Array.from(selectedEmails).filter((emailId) => reviewLaterEmails.has(emailId)).length;
  const selectedPlannedCount = Array.from(selectedEmails).filter(
    (emailId) => cleanupPlan.archive.has(emailId) || cleanupPlan.trash.has(emailId)
  ).length;
  const plannedSpaceMb = Math.round(
    (allEmails
      .filter((email: any) => cleanupPlan.archive.has(email.email_id) || cleanupPlan.trash.has(email.email_id))
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
  const activeJobCount = cleanupJobs.filter((job) => !TERMINAL_JOB_STATUSES.has(job.status)).length;
  const visibleCleanupJobs = cleanupJobs.slice(0, 5);
  const visibleCompletedJobCount = visibleCleanupJobs.filter((job) => TERMINAL_JOB_STATUSES.has(job.status)).length;
  const jobQueueLabel = activeJobCount
    ? `${activeJobCount} active`
    : visibleCompletedJobCount
      ? `${visibleCompletedJobCount} recent`
      : 'Ready';

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
            {accounts.length > 0 && (
              <select
                className={styles.accountSelect}
                value={activeAccountId}
                onChange={(event) => handleSwitchAccount(event.target.value)}
                aria-label="Connected Gmail account"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.user?.email || account.credentials?.account_email || 'Connected Gmail'}
                  </option>
                ))}
              </select>
            )}
            <button onClick={handleAddAccount} className={styles.addAccountBtn} disabled={actionLoading}>
              Add account
            </button>
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
            <button onClick={() => credentials && fetchEmails(credentials, scanLimit, { force: true })} className={styles.refreshBtn}>
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

          <div className={styles.sideActionPanel}>
            <button type="button" className={styles.launchBtn} onClick={() => setDeepScanPrompt(true)}>
              Launch Fast Triage
            </button>
            <button type="button" className={styles.scanNowBtn} onClick={() => credentials && fetchEmails(credentials, scanLimit, { force: true })}>
              Scan New Batch
            </button>
          </div>

          <div className={styles.planPanel}>
            <div className={styles.jobPanelHeader}>
              <strong>Final review</strong>
              <span>{readyDeleteCount || reviewLaterCount ? `${readyDeleteCount + reviewLaterCount} sorted` : 'Nothing sorted'}</span>
            </div>
            <p className={styles.panelExplainer}>
              First sort emails into Ready to delete or Review first. Then trash the ready list, or inspect review items one by one.
            </p>
            {readyDeleteCount === 0 && reviewLaterCount === 0 ? (
              <p className={styles.emptyJobs}>Select emails, then choose Ready to delete or Review first.</p>
            ) : (
              <>
                <div className={styles.planStats}>
                  <div>
                    <span>Ready to delete</span>
                    <strong>{readyDeleteCount}</strong>
                  </div>
                  <div>
                    <span>Review first</span>
                    <strong>{reviewLaterCount}</strong>
                  </div>
                  <div>
                    <span>Estimate</span>
                    <strong>{plannedSpaceMb} MB</strong>
                  </div>
                </div>
                <div className={styles.planActions}>
                  <button type="button" className={styles.trashBtn} onClick={runCleanupPlan} disabled={actionLoading || readyDeleteCount === 0}>
                    Trash ready list
                  </button>
                  <button type="button" className={styles.secondaryBtn} onClick={() => removeFromCleanupPlan()} disabled={readyDeleteCount === 0}>
                    Empty ready list
                  </button>
                  <button
                    type="button"
                    className={styles.trashBtn}
                    onClick={() => queuePlannedTrash(Array.from(reviewLaterEmails))}
                    disabled={actionLoading || reviewLaterCount === 0}
                  >
                    Trash all review
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setReviewLaterEmails(new Set())}
                    disabled={reviewLaterCount === 0}
                  >
                    Clear review
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={styles.jobPanel}>
            <div className={styles.jobPanelHeader}>
              <strong>Cleanup activity</strong>
              <span>{jobQueueLabel}</span>
            </div>
            <p className={styles.panelExplainer}>Running and recently finished actions from this browser session.</p>
            {visibleCleanupJobs.length === 0 ? (
              <p className={styles.emptyJobs}>No cleanup activity yet.</p>
            ) : (
              <div className={styles.jobList}>
                {visibleCleanupJobs.map((job) => {
                  const progress = job.total ? Math.min(100, Math.round((job.processed / job.total) * 100)) : 0;
                  const operationLabel = job.operation === 'trash' ? 'Moving to trash' : 'Removing from inbox';
                  const statusLabel = job.status === 'succeeded' ? 'done' : job.status;
                  return (
                    <div className={styles.jobItem} key={job.id}>
                      <div className={styles.jobMeta}>
                        <span>{operationLabel}</span>
                        <strong>{job.processed}/{job.total}</strong>
                      </div>
                      <div className={styles.jobProgress} aria-label={`${operationLabel} progress ${progress}%`}>
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <div className={styles.jobFooter}>
                        <small className={styles[`jobStatus_${job.status}`]}>{statusLabel}</small>
                        {job.failed_count > 0 && <small>{job.failed_count} failed</small>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <h2>Global Signals</h2>
          <div className={styles.statsList}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Analyzed:</span>
              <span className={styles.statValue}>{stats.total_emails || 0}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Heavy emails:</span>
              <span className={styles.statValue}>{heavyCount}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Safe to trash:</span>
              <span className={styles.statValue}>{safeTrashCount}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Sensitive:</span>
              <span className={styles.statValue}>{sensitiveCount}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Review later:</span>
              <span className={styles.statValue}>{reviewLaterCount}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Attachment estimate:</span>
              <span className={styles.statValue}>{attachmentSpaceMb} MB</span>
            </div>
          </div>

          <div className={styles.trustPanel}>
            <strong>Private scan mode</strong>
            <span>Metadata only. No bodies, snippets, or files are fetched.</span>
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
                <p className={styles.panelHint}>Limited mode is faster. Scans use metadata only; trash permission is requested separately.</p>
              )}
            </div>
            <div className={styles.metricStrip}>
              <div className={styles.metric}>
                <span>{quickCleanupCount}</span>
                <small>Quick cleanup</small>
              </div>
              <div className={styles.metric}>
                <span>{staleCleanupCount}</span>
                <small>Stale noise</small>
              </div>
              <div className={styles.metric}>
                <span>{protectedCount}</span>
                <small>Review carefully</small>
              </div>
              <div className={styles.metric}>
                <span>{reviewLaterCount}</span>
                <small>Review later</small>
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
                  (email) => email.bucket === 'promotions' && OLD_PROMO_GROUPS.includes(email.age_group)
                );
              }}
            >
              <span>Old promos</span>
              <strong>{buckets.promotions?.filter((email: any) => OLD_PROMO_GROUPS.includes(email.age_group)).length || 0}</strong>
              <small>Find offers older than 6 months.</small>
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

          <section className={styles.smartPanel}>
            <div className={styles.smartHeader}>
              <div>
                <p className={styles.eyebrow}>Smart Intelligence</p>
                <h2 className={styles.panelTitle}>Granular buckets require optional deep consent</h2>
              </div>
              <button type="button" className={styles.deepScanBtn} onClick={() => setDeepScanPrompt(true)}>
                Explore deep scan
              </button>
            </div>
            <div className={styles.smartGrid}>
              {SMART_INTELLIGENCE.map((item) => (
                <button
                  type="button"
                  className={styles.smartCard}
                  key={item.title}
                  onClick={() => setDeepScanPrompt(true)}
                >
                  <span>Locked</span>
                  <strong>{item.title}</strong>
                  <small>{item.label}</small>
                  <em>{item.detail}</em>
                </button>
              ))}
            </div>
          </section>

          <div className={styles.bucketGroups}>
            <section className={styles.bucketGroup}>
              <div className={styles.tabs}>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  <span className={styles.tabIcon}>ALL</span>
                  All scanned
                  <span className={styles.tabCount}>{allEmails.length}</span>
                </button>
              </div>
            </section>
            {BUCKET_GROUPS.map((group) => (
              <section className={styles.bucketGroup} key={group.label}>
                <button
                  type="button"
                  className={styles.bucketGroupHeader}
                  onClick={() => toggleGroup(group.label)}
                >
                  <span>{group.label}</span>
                  <small>{collapsedGroups.has(group.label) ? 'Show' : 'Hide'}</small>
                </button>
                {!collapsedGroups.has(group.label) && (
                  <div className={styles.tabs}>
                    {group.buckets.map(([tab, label]) => (
                      <button
                        key={tab}
                        className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        <span className={styles.tabIcon}>{BUCKET_ICONS[tab] || 'MT'}</span>
                        {label}
                        <span className={styles.tabCount}>
                          {buckets[tab]?.length || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
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
                  
                  <span className={styles.selectionHint}>Sort emails into Ready to delete or Review first.</span>
                </div>
              )}

              <EmailBucket
                emails={currentBucketEmails}
                selectedEmails={selectedEmails}
                reviewLaterEmails={reviewLaterEmails}
                onSelectEmail={handleSelectEmail}
                onArchiveEmail={(emailId) => archiveMessageIds([emailId])}
                onTrashEmail={(emailId) => trashMessageIds([emailId])}
                onRemoveFromPlanEmail={(emailId) => removeFromCleanupPlan([emailId])}
                onReviewLaterEmail={(emailId) => markReviewLater([emailId])}
                onArchiveEmails={archiveMessageIds}
                onTrashEmails={trashMessageIds}
                onRemoveFromPlanEmails={removeFromCleanupPlan}
                onReviewLaterEmails={markReviewLater}
                actionLoading={actionLoading}
                plannedArchiveEmails={cleanupPlan.archive}
                plannedTrashEmails={cleanupPlan.trash}
              />
            </>
          )}
        </div>
      </div>

      {selectedCount > 0 && (
        <div className={styles.stickyActionBar}>
          <div>
            <strong>Selected: {selectedCount} email{selectedCount === 1 ? '' : 's'}</strong>
            <span>Potential storage impact: ~{selectedSpaceMb} MB</span>
          </div>
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
              disabled={actionLoading}
              className={styles.archiveBtn}
            >
              Ready to delete
            </button>
            <button
              onClick={handleReviewSelected}
              disabled={actionLoading}
              className={styles.secondaryBtn}
            >
              Review first
            </button>
            {selectedPlannedCount > 0 && (
              <button
                onClick={() => removeFromCleanupPlan(Array.from(selectedEmails))}
                className={styles.secondaryBtn}
              >
                Remove ready
              </button>
            )}
            {selectedReviewCount > 0 && (
              <button
                onClick={() => queuePlannedTrash(Array.from(selectedEmails).filter((emailId) => reviewLaterEmails.has(emailId)))}
                disabled={actionLoading}
                className={styles.trashBtn}
              >
                Trash selected review
              </button>
            )}
            {readyDeleteCount > 0 && (
              <button
                onClick={runCleanupPlan}
                disabled={actionLoading}
                className={styles.trashBtn}
              >
                Trash ready list
              </button>
            )}
          </div>
        </div>
      )}

      {cleanupIntroOpen && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.permissionModal} role="dialog" aria-modal="true" aria-labelledby="cleanup-confirm-title">
            <p className={styles.eyebrow}>Cleanup safety</p>
            <h2 id="cleanup-confirm-title">Confirm cleanup actions once</h2>
            <p>
              Trash jobs run in the background so you can keep organizing other buckets.
              MailTriage only acts on emails you select.
            </p>
            <label className={styles.preferenceCheckbox}>
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(event) => setDontAskAgain(event.target.checked)}
              />
              Do not ask again for cleanup actions on this browser.
            </label>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => {
                setDontAskAgain(false);
                storeBoolean(CLEANUP_CONFIRM_SEEN_KEY);
                setCleanupIntroOpen(false);
              }}>
                Ask each time
              </button>
              <button className={styles.primaryBtn} onClick={saveCleanupIntroPreference}>
                Save preference
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingCleanupAction && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.permissionModal} role="dialog" aria-modal="true" aria-labelledby="cleanup-action-title">
            <p className={styles.eyebrow}>Confirm action</p>
            <h2 id="cleanup-action-title">
              {pendingCleanupAction.operation === 'plan'
                ? 'Trash ready-to-delete list?'
                : pendingCleanupAction.operation === 'trash'
                  ? 'Move selected emails to trash?'
                  : 'Move selected emails to trash?'}
            </h2>
            <p>
              {pendingCleanupAction.operation === 'plan'
                ? `This will move ${readyDeleteCount} ready email${
                    pendingCleanupAction.messageIds.length === 1 ? '' : 's'
                  } to trash.`
                : `This will queue ${pendingCleanupAction.messageIds.length} email${
                    pendingCleanupAction.messageIds.length === 1 ? '' : 's'
                  } for Move to Trash.`}
              You can continue working while the job runs.
            </p>
            <label className={styles.preferenceCheckbox}>
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(event) => setDontAskAgain(event.target.checked)}
              />
              Do not ask again for cleanup actions on this browser.
            </label>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setPendingCleanupAction(null)}>
                Cancel
              </button>
              <button
                className={pendingCleanupAction.operation === 'trash' ? styles.trashBtn : styles.primaryBtn}
                onClick={confirmPendingCleanupAction}
                disabled={actionLoading}
              >
                {pendingCleanupAction.operation === 'plan'
                  ? 'Trash ready list'
                  : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {permissionPrompt === 'actions' && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.permissionModal} role="dialog" aria-modal="true" aria-labelledby="actions-title">
            <p className={styles.eyebrow}>Permission step</p>
            <h2 id="actions-title">Enable Gmail cleanup actions</h2>
            <p>
              MailTriage scans with metadata-only access. To remove selected emails from the inbox or move them to trash,
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

      {deepScanPrompt && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.permissionModal} role="dialog" aria-modal="true" aria-labelledby="deep-scan-title">
            <p className={styles.eyebrow}>Optional future mode</p>
            <h2 id="deep-scan-title">Deep scan can unlock smarter groups</h2>
            <p>
              MailTriage currently protects users with metadata-only scanning. Buckets like tracking pixels,
              expired sales, and plaintext setup risks would require a separate body-read permission and a fresh
              Google verification justification before launch.
            </p>
            <div className={styles.permissionFacts}>
              <span>Current mode stays metadata-only</span>
              <span>Deep scan would be opt-in and just-in-time</span>
              <span>No broader Gmail scope is requested by this build</span>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.primaryBtn} onClick={() => setDeepScanPrompt(false)}>
                Keep metadata-only
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
