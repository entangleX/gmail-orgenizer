import type { Metadata } from 'next';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Terms of Service | Gmail Organizer',
};

export default function TermsPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'Set NEXT_PUBLIC_SUPPORT_EMAIL before public launch';

  return (
    <PolicyPage
      eyebrow="Terms"
      title="Terms of Service"
      updated="May 24, 2026"
      sections={[
        {
          title: 'Use of the service',
          body: 'Gmail Organizer helps users review metadata-based classifications, then archive or move selected Gmail messages to trash after they grant the separate action permission. Users are responsible for reviewing selections before confirming actions.',
        },
        {
          title: 'User responsibilities',
          items: [
            'Use the service only with Google accounts you own or are authorized to manage.',
            'Review all selected messages before confirming archive or trash actions.',
            'Keep your account access secure.',
          ],
        },
        {
          title: 'Gmail actions',
          body: 'The app scans with Gmail metadata access. It only requests Gmail modify access when a user wants archive or trash actions. Moving an email to trash may still allow recovery from Gmail Trash for a limited time, depending on Google settings.',
        },
        {
          title: 'Privacy and Google data',
          body: 'Use of Google user data is governed by the Privacy Policy. Gmail Organizer is designed to scan Gmail metadata only and does not fetch message bodies, snippets, or attachment contents for classification.',
        },
        {
          title: 'Service availability',
          body: 'The service may change, pause, or become unavailable due to maintenance, Google API limits, OAuth verification status, or infrastructure changes.',
        },
        {
          title: 'No warranty',
          body: 'The service is provided as-is. We do not guarantee that classifications will be perfect or that every cleanup suggestion will be appropriate for every user.',
        },
        {
          title: 'Contact',
          body: `Questions about these terms should be sent to ${supportEmail}.`,
        },
      ]}
    />
  );
}
