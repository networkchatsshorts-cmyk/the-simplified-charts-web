import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/supabase';
import RouteProgress from '@/components/RouteProgress';
import { Analytics } from '@vercel/analytics/next';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: 'The Simplified Charts | Scored Candle Stock Analysis',
    template: '%s | The Simplified Charts',
  },

  description:
    "We don't just read candles. We score them. Explore Indian stock analysis, simplified technical analysis, key price zones, breakouts and chart-based market insights.",

  alternates: {
    canonical: '/',
  },

  robots: {
    index: true,
    follow: true,
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'The Simplified Charts',
  alternateName: 'The Simplified Charts',
  url: siteUrl,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const youtubeUrl =
    process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || '#';

  return (
    <html lang="en">
      <body>
        <RouteProgress />

        <header className="header">
          <div className="container nav">
            <Link className="brand" href="/">
              The Simplified Charts
            </Link>

            <nav className="navlinks" aria-label="Primary">
              <Link href="/">Home</Link>

              <Link href="/videos">
                Long Videos
              </Link>

              <Link href="/shorts">
                Shorts
              </Link>

              <Link href="/community">
                Community
              </Link>

              <a
                href={youtubeUrl}
                target="_blank"
                rel="noreferrer"
              >
                Direct on YouTube
              </a>
            </nav>
          </div>
        </header>

        {children}

        <footer className="footer">
          <div className="container">
            <div>
              © {new Date().getFullYear()} The Simplified Charts.
              Scored candle analysis for simpler, clearer stock-market
              learning.
            </div>

            <div style={{ marginTop: '8px' }}>
              Email:{' '}
              <a href="mailto:contact@thesimplifiedcharts.in">
                contact@thesimplifiedcharts.in
              </a>
            </div>
          </div>
        </footer>

        <Analytics />

        {/* Homepage/site identity structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
      </body>
    </html>
  );
}
