import type { Metadata } from 'next';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Terms of Service | Gmail Organizer',
};

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Terms"
      title="Terms of Service"
      updated="May 24, 2026"
      notice="These terms are a starter template for launch preparation and should be reviewed before public release."
      sections={[
        {
          title: 'Use of the service',
          body: 'Gmail Organizer is provided to help users review, classify, archive, and move selected Gmail messages to trash. Users are responsible for reviewing selections before confirming actions.',
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
          body: 'The app only performs Gmail archive or trash actions after user confirmation. Moving an email to trash may still allow recovery from Gmail Trash for a limited time, depending on Google settings.',
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
          body: 'Questions about these terms should be sent to the product support contact configured before public launch.',
        },
      ]}
    />
  );
}
