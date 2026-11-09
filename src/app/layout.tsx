import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import './explain.css';
import { SITE, SITE_URL } from '@/lib/site';

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
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE.title} | ${SITE.name}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [SITE.author],
  creator: SITE.author.name,
  keywords: [
    'Sri Lanka income tax calculator',
    'income tax 2025/26',
    'APIT calculator',
    'IRD Sri Lanka',
    'RAMIS tax return',
    'freelance tax Sri Lanka',
    'foreign income 15% tax',
    'pegged salary USD',
    'T-10 certificate',
    'personal income tax Sri Lanka',
  ],
  category: 'finance',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE.name,
    locale: 'en_LK',
    title: SITE.title,
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image', title: SITE.title, description: SITE.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  formatDetection: { telephone: false },
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
