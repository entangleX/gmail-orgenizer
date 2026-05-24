'use client';

import styles from './EmailItem.module.css';

interface Email {
  email_id: string;
  bucket: string;
  subject: string;
  reason: string;
  sender?: string;
  sent_at?: string;
  age_label?: string;
  tags?: string[];
}

interface EmailItemProps {
  email: Email;
  selected: boolean;
  onSelect: (selected: boolean) => void;
}

export default function EmailItem({ email, selected, onSelect }: EmailItemProps) {
  const getBucketColor = (bucket: string) => {
    const colors: { [key: string]: string } = {
      attachments: '#8e24aa',
      promotions: '#1a73e8',
      newsletters: '#00796b',
      otp_security: '#f9ab00',
      latest_jobs: '#3367d6',
      jobs: '#188038',
      spam_junk: '#c5221f',
      shopping: '#b06000',
      shopping_receipts: '#795548',
      government_id: '#6d4c41',
      institutional: '#00695c',
      finance: '#0b8043',
      travel: '#3f51b5',
      social: '#d01884',
      updates: '#4285f4',
      educational: '#2e7d32',
      legal: '#5f6368',
      other: '#7b8496',
    };
    return colors[bucket] || '#999';
  };

  return (
    <div className={`${styles.emailItem} ${selected ? styles.selected : ''}`}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        aria-label={`Select email: ${email.subject}`}
      />
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.subject}>{email.subject || '(no subject)'}</h3>
          <span
            className={styles.bucketTag}
            style={{ backgroundColor: getBucketColor(email.bucket) }}
          >
            {email.bucket}
          </span>
        </div>
        {email.sender && <p className={styles.sender}>Sender domain: {email.sender}</p>}
        {(email.age_label || email.tags?.length) && (
          <div className={styles.tags}>
            {email.age_label && <span className={styles.ageTag}>{email.age_label}</span>}
            {email.tags?.slice(0, 6).map((tag) => (
              <span className={styles.metaTag} key={tag}>
                {tag.split('_').join(' ')}
              </span>
            ))}
          </div>
        )}
        <div className={styles.footer}>
          <span className={styles.reason}>Classified: {email.reason}</span>
          {email.sent_at && <span className={styles.date}>{email.sent_at}</span>}
        </div>
      </div>
    </div>
  );
}
