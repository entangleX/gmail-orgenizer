import type { Metadata } from 'next';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Data Deletion | Gmail Organizer',
};

export default function DataDeletionPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'Set NEXT_PUBLIC_SUPPORT_EMAIL before public launch';

  return (
    <PolicyPage
      eyebrow="Data deletion"
      title="Data Deletion Instructions"
      updated="May 24, 2026"
      sections={[
        {
          title: 'Revoke Google access',
          body: 'You can disconnect Gmail Organizer from your Google Account at any time from Google Account permissions.',
          items: [
            'Open https://myaccount.google.com/permissions',
            'Find Gmail Organizer in the list of connected apps.',
            'Select it and choose Remove Access.',
          ],
        },
        {
          title: 'Delete app data',
          body: `Gmail Organizer is designed not to store message bodies, snippets, attachment contents, or scan results on the backend. To request deletion of any account metadata associated with support or production operations, email ${supportEmail}.`,
        },
        {
          title: 'Local browser data',
          body: 'The web app uses browser session storage for profile, OAuth session data, and current scan results. Click Logout or close the browser session to clear active app credentials. You can also clear browser storage for the app domain.',
        },
        {
          title: 'Processing timeline',
          body: 'Deletion requests are reviewed and processed within 30 days unless a longer period is required for security, fraud prevention, or legal obligations. A confirmation is sent after completion.',
        },
      ]}
    />
  );
}
