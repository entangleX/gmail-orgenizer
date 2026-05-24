import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MailTriage',
  description: 'MailTriage organizes Gmail metadata into private cleanup workflows.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
