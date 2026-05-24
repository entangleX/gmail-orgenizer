import type { Metadata } from 'next';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Data Deletion | Gmail Organizer',
};

export default function DataDeletionPage() {
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
          body: 'For production, users should be able to request deletion of account metadata, stored scan metadata, and encrypted OAuth tokens. Configure a support email before launch and list it here.',
        },
        {
          title: 'Local browser data',
          body: 'During local testing, clear browser storage for the app domain or click Logout in the app to remove locally stored credentials and profile data.',
        },
        {
          title: 'Processing timeline',
          body: 'Production deletion requests should be processed within a reasonable period and confirmed to the user after completion.',
        },
      ]}
    />
  );
}
