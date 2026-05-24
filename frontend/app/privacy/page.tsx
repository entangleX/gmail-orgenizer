import type { Metadata } from 'next';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | MailTriage',
};

export default function PrivacyPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'mailtriage.contact@yahoo.com';

  return (
    <PolicyPage
      eyebrow="Privacy"
      title="Privacy Policy"
      updated="May 24, 2026"
      notice="MailTriage is designed for user-directed inbox cleanup. It uses the minimum Google permissions needed for signup, metadata scanning, and optional archive/trash actions."
      sections={[
        {
          title: 'What MailTriage does',
          body: 'MailTriage helps users scan Gmail metadata, classify messages into cleanup categories, and perform user-confirmed archive or trash actions only after the user grants the separate Gmail action permission.',
        },
        {
          title: 'Google user data we access',
          items: [
            'Signup uses basic Google profile data: name, email address, profile image, and email verification status.',
            'Gmail scan uses metadata needed to classify cleanup suggestions: message IDs, selected headers, sender domains, subjects, labels, and dates.',
            'Gmail action access is requested separately and only when a user chooses archive or trash actions.',
            'We do not fetch Gmail message bodies, Gmail snippets, attachment contents, or attachment file downloads for scanning.',
            'OAuth tokens are used only to make user-requested Google API calls during the active app session.',
          ],
        },
        {
          title: 'How we use Gmail data',
          items: [
            'To classify emails into cleanup groups such as OTPs, promotions, newsletters, jobs, finance, legal, government/ID, and institutional messages.',
            'To show metadata-based counts, tags, and user-visible review rows inside the dashboard.',
            'To perform Gmail actions only after the user explicitly selects emails, confirms the action, and grants Gmail modify permission.',
          ],
        },
        {
          title: 'What we do not do',
          items: [
            'We do not sell Gmail data.',
            'We do not use Gmail data for advertising.',
            'We do not use Gmail data to train AI models.',
            'We do not allow humans to read user Gmail data unless the user asks for support and grants explicit permission.',
            'We do not transfer Gmail data to unrelated third parties.',
          ],
        },
        {
          title: 'Google API Limited Use',
          body: 'MailTriage use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.',
        },
        {
          title: 'Storage and security',
          body: 'The app is designed to avoid storing email content on the backend. OAuth credentials and scan results are kept in browser session storage so they are cleared when the browser session ends. Server code does not persist Gmail scan results, message bodies, snippets, or attachment contents.',
        },
        {
          title: 'Data deletion',
          body: 'Users may revoke Google access from their Google Account permissions page and may request deletion of account data using the instructions on our Data Deletion page.',
        },
        {
          title: 'Contact',
          body: `For privacy requests, contact ${supportEmail}.`,
        },
      ]}
    />
  );
}
