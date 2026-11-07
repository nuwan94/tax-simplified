import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';

// Paper theme: a book-style serif for reading, a typewriter-ledger mono for figures.
const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-serif',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Tax Simplified — Sri Lanka income tax calculator',
  description:
    'Work out your Sri Lankan income tax for YA 2025/26 from your salary and bank interest. Find out if you need to file, what you owe or what you can claim back. Runs entirely in your browser.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f3eee3',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
