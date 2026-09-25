import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/supabase';
import RouteProgress from '@/components/RouteProgress';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

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

              {/* Community dropdown */}
              <details className="navCommunityDropdown">
                <summary className="navCommunityTrigger">
                  <span>Community</span>

                  <span
                    className="navCommunityArrow"
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </summary>

                <div className="navCommunityPanel">
                  <Link href="/community#learning">
                    <span className="navCommunityIcon">
                      📘
                    </span>

                    <span className="navCommunityText">
                      <strong>Learning</strong>

                      <small>
                        Educational posts & chart lessons
                      </small>
                    </span>
                  </Link>

                  <Link href="/community#stocks-to-watch-next-week">
                    <span className="navCommunityIcon">
                      📈
                    </span>

                    <span className="navCommunityText">
                      <strong>
                        Stocks to watch next week
                      </strong>

                      <small>
                        Weekly watchlist & setups
                      </small>
                    </span>
                  </Link>
                </div>
              </details>

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
        <SpeedInsights />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />

        {/* Community header dropdown styles.
            Plain CSS — intentionally NOT styled-jsx. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .navCommunityDropdown {
                position: relative;
                display: inline-block;
              }

              .navCommunityTrigger {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 0;
                border: 0;
                background: transparent;
                color: inherit;
                font: inherit;
                font-size: inherit;
                cursor: pointer;
                list-style: none;
              }

              .navCommunityTrigger::-webkit-details-marker {
                display: none;
              }

              .navCommunityArrow {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                line-height: 1;
                transition: transform 0.18s ease;
              }

              .navCommunityDropdown[open]
                .navCommunityArrow {
                transform: rotate(180deg);
              }

              .navCommunityPanel {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                z-index: 99999;

                width: 330px;
                padding: 8px;

                border: 1px solid rgba(15, 23, 42, 0.12);
                border-radius: 14px;

                background: #ffffff;

                box-shadow:
                  0 16px 40px rgba(15, 23, 42, 0.16);

                opacity: 0;
                visibility: hidden;
                pointer-events: none;

                transform: translateY(-4px);

                transition:
                  opacity 0.16s ease,
                  visibility 0.16s ease,
                  transform 0.16s ease;
              }

              /* Desktop hover */
              @media (hover: hover) and (pointer: fine) {
                .navCommunityDropdown:hover
                  .navCommunityPanel,
                .navCommunityDropdown:focus-within
                  .navCommunityPanel {
                  opacity: 1;
                  visibility: visible;
                  pointer-events: auto;
                  transform: translateY(0);
                }
              }

              /* Mobile / click */
              .navCommunityDropdown[open]
                .navCommunityPanel {
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
                transform: translateY(0);
              }

              .navCommunityPanel a {
                display: flex;
                align-items: flex-start;
                gap: 11px;

                width: 100%;
                box-sizing: border-box;

                padding: 11px 12px;

                border-radius: 10px;

                color: inherit;
                text-decoration: none;

                transition:
                  background 0.16s ease;
              }

              .navCommunityPanel a:hover {
                background:
                  rgba(15, 23, 42, 0.055);
              }

              .navCommunityIcon {
                display: inline-flex;
                align-items: center;
                justify-content: center;

                flex: 0 0 auto;

                width: 34px;
                height: 34px;

                border-radius: 9px;

                background:
                  rgba(15, 23, 42, 0.07);

                font-size: 17px;
              }

              .navCommunityText {
                min-width: 0;
              }

              .navCommunityText strong,
              .navCommunityText small {
                display: block;
              }

              .navCommunityText strong {
                margin-bottom: 2px;
                font-size: 14px;
                line-height: 1.3;
              }

              .navCommunityText small {
                font-size: 12px;
                line-height: 1.4;
                opacity: 0.68;
              }

              @media (max-width: 700px) {
                .navCommunityPanel {
                  left: 50%;
                  right: auto;

                  width: min(
                    320px,
                    calc(100vw - 28px)
                  );

                  transform:
                    translate(-50%, -4px);
                }

                .navCommunityDropdown[open]
                  .navCommunityPanel {
                  transform:
                    translate(-50%, 0);
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
