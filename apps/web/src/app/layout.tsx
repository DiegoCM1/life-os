import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { cssVars, palette } from '@/design/tokens';
import './globals.css';

export const metadata: Metadata = {
  title: 'Life Dashboard',
  description: 'Personal observability center',
};

export const viewport: Viewport = {
  themeColor: palette.bg,
};

// JetBrains Mono, self-hosted by next/font (no external request — kiosk-safe).
// Exposed as --font-mono, which src/design/tokens.ts references in the mono stack.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <head>
        {/* One :root block shared by CSS effects, SVG/canvas, and Tailwind. */}
        <style dangerouslySetInnerHTML={{ __html: cssVars() }} />
      </head>
      <body className="scanlines crt">{children}</body>
    </html>
  );
}
