import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/supabase';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: 'The Simplified Charts | Stock Market Analysis in Hindi', template: '%s | The Simplified Charts' },
  description: 'Stock market analysis in Hindi covering breakouts, support zones, price action and practical buy or sell frameworks.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>
    <header className="header"><div className="container nav">
      <Link className="brand" href="/">The Simplified Charts</Link>
      <nav className="navlinks"><Link href="/">Home</Link><Link href="/community">Community</Link><a href={process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || '#'} target="_blank" rel="noreferrer">YouTube</a></nav>
    </div></header>
    {children}
    <footer className="footer"><div className="container">© {new Date().getFullYear()} The Simplified Charts. Stock market analysis in Hindi.</div></footer>
  </body></html>;
}
