'use client';

import { useMemo, useState } from 'react';
import EmailItem from './EmailItem';
import styles from './EmailBucket.module.css';

interface Email {
  email_id: string;
  bucket: string;
  subject: string;
  reason: string;
  sender?: string;
  sent_at?: string;
  age_label?: string;
  tags?: string[];
  size_estimate?: number;
  safety_level?: 'safe' | 'review' | 'sensitive';
  safety_label?: string;
  action_hint?: string;
  safety_reason?: string;
}

interface EmailBucketProps {
  emails: Email[];
  selectedEmails: Set<string>;
  onSelectEmail: (emailId: string, selected: boolean) => void;
  onArchiveEmail?: (emailId: string) => void;
  onTrashEmail?: (emailId: string) => void;
  onRemoveFromPlanEmail?: (emailId: string) => void;
  onReviewLaterEmail?: (emailId: string) => void;
  onArchiveEmails?: (emailIds: string[]) => void;
  onTrashEmails?: (emailIds: string[]) => void;
  onRemoveFromPlanEmails?: (emailIds: string[]) => void;
  onReviewLaterEmails?: (emailIds: string[]) => void;
  reviewLaterEmails?: Set<string>;
  plannedArchiveEmails?: Set<string>;
  plannedTrashEmails?: Set<string>;
  actionLoading?: boolean;
}

interface SenderGroup {
  key: string;
  label: string;
  emails: Email[];
  firstIndex: number;
  totalSize: number;
  selectedCount: number;
}

const formatSize = (bytes: number) => {
  if (!bytes) {
    return null;
  }
  const sizeMb = Math.round((bytes / (1024 * 1024)) * 10) / 10;
  return `${sizeMb} MB`;
};

export default function EmailBucket({
  emails,
  selectedEmails,
  onSelectEmail,
  onArchiveEmail,
  onTrashEmail,
  onRemoveFromPlanEmail,
  onReviewLaterEmail,
  onArchiveEmails,
  onTrashEmails,
  onRemoveFromPlanEmails,
  onReviewLaterEmails,
  reviewLaterEmails = new Set(),
  plannedArchiveEmails = new Set(),
  plannedTrashEmails = new Set(),
  actionLoading = false,
}: EmailBucketProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const senderGroups = useMemo<SenderGroup[]>(() => {
    const groups = new Map<string, SenderGroup>();

    emails.forEach((email, index) => {
      const label = email.sender?.trim() || 'Unknown sender';
      const key = label.toLowerCase();
      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.emails.push(email);
        existingGroup.totalSize += Number(email.size_estimate || 0);
      } else {
        groups.set(key, {
          key,
          label,
          emails: [email],
          firstIndex: index,
          totalSize: Number(email.size_estimate || 0),
          selectedCount: 0,
        });
      }
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        selectedCount: group.emails.filter((email) => selectedEmails.has(email.email_id)).length,
      }))
      .sort((first, second) => {
        if (first.emails.length !== second.emails.length) {
          return second.emails.length - first.emails.length;
        }
        return first.firstIndex - second.firstIndex;
      });
  }, [emails, selectedEmails]);

  const hasSenderGroups = senderGroups.some((group) => group.emails.length > 1);

  if (emails.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>✨</span>
        <p className={styles.emptyText}>No emails in this category</p>
      </div>
    );
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const selectSenderGroup = (group: SenderGroup, selected: boolean) => {
    group.emails.forEach((email) => onSelectEmail(email.email_id, selected));
  };

  const senderInitials = (sender: string) =>
    sender
      .split('.')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'MT';

  return (
    <div className={styles.container}>
      {hasSenderGroups && (
        <div className={styles.groupNotice}>
          <strong>Grouped by sender domain</strong>
          <span>Clean repeated OTPs, promos, receipts, and alerts in one move, or expand to review each email.</span>
        </div>
      )}

      {senderGroups.map((group) => {
        const emailIds = group.emails.map((email) => email.email_id);
        const isGrouped = group.emails.length > 1;
        const isExpanded = expandedGroups.has(group.key);
        const allSelected = group.selectedCount === group.emails.length;
        const totalSize = formatSize(group.totalSize);

        if (!isGrouped) {
          const email = group.emails[0];
          const plannedAction = plannedArchiveEmails.has(email.email_id)
            ? 'archive'
            : plannedTrashEmails.has(email.email_id)
              ? 'trash'
              : null;
          return (
            <EmailItem
              key={email.email_id}
              email={email}
              selected={selectedEmails.has(email.email_id)}
              onSelect={(selected) => onSelectEmail(email.email_id, selected)}
              onArchive={onArchiveEmail ? () => onArchiveEmail(email.email_id) : undefined}
              onTrash={onTrashEmail ? () => onTrashEmail(email.email_id) : undefined}
              onRemoveFromPlan={onRemoveFromPlanEmail ? () => onRemoveFromPlanEmail(email.email_id) : undefined}
              onReviewLater={onReviewLaterEmail ? () => onReviewLaterEmail(email.email_id) : undefined}
              reviewLater={reviewLaterEmails.has(email.email_id)}
              plannedAction={plannedAction}
              actionLoading={actionLoading}
            />
          );
        }

        const archivePlannedCount = group.emails.filter((email) => plannedArchiveEmails.has(email.email_id)).length;
        const trashPlannedCount = group.emails.filter((email) => plannedTrashEmails.has(email.email_id)).length;
        const groupPlannedCount = archivePlannedCount + trashPlannedCount;

        return (
          <section className={styles.senderGroup} key={group.key}>
            <div className={styles.senderGroupHeader}>
              <input
                type="checkbox"
                className={styles.groupCheckbox}
                checked={allSelected}
                onChange={(event) => selectSenderGroup(group, event.target.checked)}
                aria-label={`Select all emails from sender domain ${group.label}`}
              />
              <button type="button" className={styles.senderSummary} onClick={() => toggleGroup(group.key)}>
                <span className={styles.senderBadge}>{senderInitials(group.label)}</span>
                <span className={styles.senderDetails}>
                  <strong>{group.label}</strong>
                  <span>
                    {group.emails.length} emails
                    {group.selectedCount > 0 ? `, ${group.selectedCount} selected` : ''}
                    {groupPlannedCount > 0 ? `, ${groupPlannedCount} planned` : ''}
                    {totalSize ? `, ${totalSize}` : ''}
                  </span>
                </span>
              </button>
              <div className={styles.senderActions}>
                {onArchiveEmails && (
                  <button type="button" onClick={() => onArchiveEmails(emailIds)} disabled={actionLoading}>
                    Ready list
                  </button>
                )}
                {onTrashEmails && (
                  <button type="button" onClick={() => onTrashEmails(emailIds)} disabled={actionLoading}>
                    Trash now
                  </button>
                )}
                {onRemoveFromPlanEmails && groupPlannedCount > 0 && (
                  <button type="button" onClick={() => onRemoveFromPlanEmails(emailIds)}>
                    Remove plan
                  </button>
                )}
                {onReviewLaterEmails && (
                  <button type="button" onClick={() => onReviewLaterEmails(emailIds)} disabled={actionLoading}>
                    Review all
                  </button>
                )}
                <button type="button" onClick={() => toggleGroup(group.key)} className={styles.expandBtn}>
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className={styles.senderGroupItems}>
                {group.emails.map((email) => {
                  const plannedAction = plannedArchiveEmails.has(email.email_id)
                    ? 'archive'
                    : plannedTrashEmails.has(email.email_id)
                      ? 'trash'
                      : null;

                  return (
                    <EmailItem
                      key={email.email_id}
                      email={email}
                      selected={selectedEmails.has(email.email_id)}
                      onSelect={(selected) => onSelectEmail(email.email_id, selected)}
                      onArchive={onArchiveEmail ? () => onArchiveEmail(email.email_id) : undefined}
                      onTrash={onTrashEmail ? () => onTrashEmail(email.email_id) : undefined}
                      onRemoveFromPlan={onRemoveFromPlanEmail ? () => onRemoveFromPlanEmail(email.email_id) : undefined}
                      onReviewLater={onReviewLaterEmail ? () => onReviewLaterEmail(email.email_id) : undefined}
                      reviewLater={reviewLaterEmails.has(email.email_id)}
                      plannedAction={plannedAction}
                      actionLoading={actionLoading}
                    />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
