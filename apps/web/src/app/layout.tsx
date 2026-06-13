import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Life Dashboard',
  description: 'Personal observability center',
};

export const viewport: Viewport = {
  themeColor: '#0b0e14',
};

// System font stack, no web fonts: keeps the page light for the 4GB kiosk.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
