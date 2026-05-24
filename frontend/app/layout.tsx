import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gmail Organizer',
  description: 'Clean your Gmail for free. Automatically organize and bulk delete emails.',
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
