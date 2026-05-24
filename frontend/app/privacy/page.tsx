import type { Metadata } from 'next';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | Gmail Organizer',
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy"
      title="Privacy Policy"
      updated="May 24, 2026"
      notice="This page is a product-ready starter policy for Google OAuth review. Have counsel review it before public launch."
      sections={[
        {
          title: 'What Gmail Organizer does',
          body: 'Gmail Organizer helps users scan their Gmail inbox, classify messages into cleanup categories, and perform user-confirmed archive or trash actions.',
        },
        {
          title: 'Information we access',
          items: [
            'Basic Google profile information such as name, email address, and profile image when you sign up.',
            'Gmail message metadata required to classify and display cleanup suggestions, such as message IDs, senders, subjects, snippets, labels, dates, and attachment presence.',
            'OAuth tokens needed to connect to Gmail after the user grants permission.',
          ],
        },
        {
          title: 'How we use Gmail data',
          items: [
            'To classify emails into cleanup groups such as OTPs, promotions, newsletters, jobs, finance, legal, government/ID, and institutional messages.',
            'To show previews and counts inside the dashboard so users can decide what to archive or move to trash.',
            'To perform Gmail actions only after the user explicitly selects emails and confirms the action.',
          ],
        },
        {
          title: 'What we do not do',
          items: [
            'We do not sell Gmail data.',
            'We do not use Gmail data for advertising.',
            'We do not allow humans to read user Gmail content unless the user asks for support and grants explicit permission.',
            'We do not transfer Gmail data to unrelated third parties.',
          ],
        },
        {
          title: 'Storage and security',
          body: 'For production, OAuth tokens must be stored server-side using encryption and access controls. Local development may use browser storage for testing only and should not be treated as production storage.',
        },
        {
          title: 'Data deletion',
          body: 'Users may revoke Google access from their Google Account permissions page and may request deletion of account data using the instructions on our Data Deletion page.',
        },
        {
          title: 'Contact',
          body: 'For privacy requests, contact the app owner at the support email configured for this product before production launch.',
        },
      ]}
    />
  );
}
