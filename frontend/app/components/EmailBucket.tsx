'use client';

import EmailItem from './EmailItem';
import styles from './EmailBucket.module.css';

interface Email {
  email_id: string;
  bucket: string;
  subject: string;
  snippet: string;
  reason: string;
}

interface EmailBucketProps {
  emails: Email[];
  selectedEmails: Set<string>;
  onSelectEmail: (emailId: string, selected: boolean) => void;
}

export default function EmailBucket({ emails, selectedEmails, onSelectEmail }: EmailBucketProps) {
  if (emails.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>✨</span>
        <p className={styles.emptyText}>No emails in this category</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {emails.map((email) => (
        <EmailItem
          key={email.email_id}
          email={email}
          selected={selectedEmails.has(email.email_id)}
          onSelect={(selected) => onSelectEmail(email.email_id, selected)}
        />
      ))}
    </div>
  );
}
