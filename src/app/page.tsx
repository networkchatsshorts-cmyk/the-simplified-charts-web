import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import CommunityPost from '@/components/CommunityPost';

export const dynamic = 'force-dynamic';

function formatDate(value: string | null | undefined) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

/*
  Fixed representative signals for the homepage USP.

  Desktop shows all 7.
  Mobile shows only the first 3.
*/
const scoringSignals = [
  { name: 'RSI', value: '26%' },
  { name: 'Price Action', value: '90%' },
  { name: 'Volume Pressure', value: '18%' },
  { name: 'Momentum', value: '23%' },
  { name: 'Candle Structure', value: '90%' },
  { name: 'Support / Resistance', value: '17%' },
  { name: 'Candle Score', value: '78%' },
];

export default async function HomePage() {
  const db = getSupabaseAdmin();

  const [longResult, shortResult, postResult] = await Promise.all([
    db
      .from('videos')
      .select(
        'id,title,slug,thumbnail_url,published_at,seo_description,topic_id'
      )
      .eq('published', true)
      .eq('content_type', 'long')
      .not('topic_id', 'is', null)
      .order('published_at', { ascending: false })
      .limit(5),

    db
      .from('videos')
      .select(
        'id,title,slug,thumbnail_url,published_at,seo_description,topic_id'
      )
      .eq('published', true)
      .eq('content_type', 'short')
      .order('published_at', { ascending: false })
      .limit(5),

    db
      .from('community_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const longVideos = longResult.data || [];
  const shortVideos = shortResult.data || [];
  const latestPost = postResult.data || null;

  const topicIds = [
    ...new Set(
      [...longVideos, ...shortVideos]
        .map((video) => video.topic_id)
        .filter(Boolean)
    ),
  ];

  const { data: topics } = topicIds.length
    ? await db
        .from('topics')
        .select('id,name,slug')
        .in('id', topicIds)
    : { data: [] as any[] };

  const topicMap = new Map(
    (topics || []).map((topic) => [topic.id, topic])
  );

  return (
    <main className="container">
      {/* =========================================
          HERO
         ========================================= */}

      <section className="hero heroSplit">
        {/* =======================================
            LEFT: INTRODUCTION
           ======================================= */}

        <div className="heroIntro">
          {/* Decorative visual */}
          <div className="heroVisual" aria-hidden="true">
            <div className="heroCandles">
              <span className="candle candle1"></span>
              <span className="candle candle2"></span>
              <span className="candle candle3"></span>
              <span className="candle candle4"></span>
              <span className="candle candle5"></span>
              <span className="candle candle6"></span>
              <span className="trendLine"></span>
            </div>

            <div className="clarityTag">
              <span>From</span>
              <span>Signals to</span>
              <span>Clarity</span>
            </div>
          </div>

          {/* Logo */}
          <div className="heroLogoWrap">
            <Image
              src="/logo.png"
              alt="The Simplified Charts"
              width={180}
              height={180}
              className="heroLogo"
              priority
            />
          </div>

          <h1>Stock Analysis Built on a Scored Candle System</h1>

          <p className="heroStatement">
            We Don&apos;t Just Read Candles. We Score Them.
          </p>

          {/* Trust / subscriber row */}
          <div className="heroTrustRow">
            <div className="subscriberBadge">
              <span className="youtubeMiniIcon">▶</span>
              <strong>1,300+ Subscribers</strong>
            </div>

            <div className="educationInfo">
              <span className="infoIcon">ⓘ</span>

              <span
                className="tooltipWrap"
                tabIndex={0}
                aria-label="Educational purpose only"
              >
                Educational purpose only

                <span className="tooltip">
                  I am not SEBI registered. I am a learner with three years of
                  experience in the stock market, sharing my knowledge and
                  learnings with friends for educational purposes only.
                </span>
              </span>
            </div>
          </div>

          {/* Three learning pillars */}
          <div className="heroPillars">
            <div className="heroPillar">
              <div className="pillarIcon">▤</div>

              <div>
                <strong>Learn</strong>
                <span>Practical chart analysis</span>
              </div>
            </div>

            <div className="heroPillar">
              <div className="pillarIcon">▥</div>

              <div>
                <strong>Understand</strong>
                <span>Simple and structured</span>
              </div>
            </div>

            <div className="heroPillar">
              <div className="pillarIcon">♟</div>

              <div>
                <strong>Grow Together</strong>
                <span>With a like-minded community</span>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================
            RIGHT: USP / SCORING SYSTEM
           ======================================= */}

        <div className="scoringPanel">
          <div className="scoringEyebrow">OUR APPROACH</div>

          <h2>
            What makes us <span>different?</span>
          </h2>

          <div className="scoreHeadline">
            Multiple signals. <strong>The Simplified Score.</strong>
          </div>

          <p className="scoreDescription">
            Our AI generated system evaluates multiple technical parameters
            from each candle and converts them into a single score, so you
            don&apos;t have to analyse everything manually.
          </p>

          <div className="scoreContent">
            <div className="signalColumn">
              {scoringSignals.map((signal, index) => (
                <div
                  className={`signalRow ${
                    index >= 3 ? 'desktopExtraSignal' : ''
                  }`}
                  key={signal.name}
                >
                  <span>{signal.name}</span>

                  <div className="signalBar">
                    <div
                      className="signalFill"
                      style={{ width: signal.value }}
                    />
                  </div>

                  <strong>{signal.value}</strong>
                </div>
              ))}

              {/* Static. Not expandable. */}
              <div className="moreSignalsLabel">
                <span>+ More technical parameters</span>
              </div>
            </div>

            <div className="scoreDivider" />

            <div className="scoreResult">
              <div className="resultLabel">THE SIMPLIFIED SCORE</div>

              <div className="scoreNumber">-5.18</div>

              <div className="zoneArrow">↓</div>

              <div className="zonesCard">
                <div className="zonesTitle">THREE KEY ZONES</div>

                <div className="zones">
                  <span className="zone hold">HOLD</span>
                  <span className="zone caution">CAUTION</span>
                  <span className="zone breakdown">BREAKDOWN</span>
                </div>
              </div>
            </div>
          </div>

          <div className="scoringFooter">
            See how our scoring system works in the videos.
          </div>
        </div>
      </section>

      {/* =========================================
          LONG VIDEOS
         ========================================= */}

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">Newest long-form analysis</div>
            <h2>Recent Long Videos</h2>
          </div>

        </div>

        <div className="grid">
          {longVideos.map((video: any) => (
            <Link
              className="card"
              href={`/videos/${video.slug}`}
              key={video.id}
            >
              {video.thumbnail_url && (
                <div className="thumbWrap">
                  <Image
                    className="thumb"
                    src={video.thumbnail_url}
                    alt={video.title}
                    width={640}
                    height={360}
                  />
                </div>
              )}

              <div className="cardbody">
                {topicMap.get(video.topic_id)?.name && (
                  <div className="eyebrow">
                    {topicMap.get(video.topic_id)?.name}
                  </div>
                )}

                <h3>{video.title}</h3>

                <p className="small">
                  {video.seo_description ||
                    'Long-form stock market analysis from The Simplified Charts.'}
                </p>

                {video.published_at && (
                  <div className="videoDate">
                    Uploaded {formatDate(video.published_at)}
                  </div>
                )}
              </div>
            </Link>
          ))}

          <Link
            className="card exploreMoreCard"
            href="/long-videos"
            aria-label="Explore more videos and playlists"
          >
            <div
              style={{
                width: '100%',
                minHeight: '100%',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxSizing: 'border-box',
                background:
                  'linear-gradient(145deg, #ffffff 0%, #f4f6f8 100%)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#111827',
                  color: '#ffffff',
                  fontSize: '21px',
                  marginBottom: '18px',
                }}
              >
                ↗
              </div>

              <div className="eyebrow">EXPLORE MORE</div>

              <h3 style={{ margin: '8px 0 10px' }}>
                Videos &amp; Playlists
              </h3>

              <p className="small" style={{ lineHeight: 1.6 }}>
                Discover more stock analysis and explore all our playlists.
              </p>

              <span
                style={{
                  marginTop: '18px',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                Explore →
              </span>
            </div>
          </Link>
        </div>

        {!longVideos.length && (
          <div className="card">
            <div className="cardbody">
              <p className="small">No long videos are available yet.</p>
            </div>
          </div>
        )}
      </section>

      {/* =========================================
          SHORTS
         ========================================= */}

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">Newest short-form analysis</div>
            <h2>Recent Shorts</h2>
          </div>

        </div>

        <div className="grid">
          {shortVideos.map((video: any) => (
            <Link
              className="card"
              href={`/videos/${video.slug}`}
              key={video.id}
            >
              {video.thumbnail_url && (
                <div className="thumbWrap">
                  <Image
                    className="thumb"
                    src={video.thumbnail_url}
                    alt={video.title}
                    width={640}
                    height={360}
                  />
                </div>
              )}

              <div className="cardbody">
                <h3>{video.title}</h3>

                <p className="small">
                  {video.seo_description ||
                    'Short-form market analysis from The Simplified Charts.'}
                </p>

                {video.published_at && (
                  <div className="videoDate">
                    Uploaded {formatDate(video.published_at)}
                  </div>
                )}
              </div>
            </Link>
          ))}

          <Link
            className="card exploreMoreCard"
            href="/shorts"
            aria-label="Explore more Shorts"
          >
            <div
              style={{
                width: '100%',
                minHeight: '100%',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxSizing: 'border-box',
                background:
                  'linear-gradient(145deg, #ffffff 0%, #f4f6f8 100%)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#111827',
                  color: '#ffffff',
                  fontSize: '21px',
                  marginBottom: '18px',
                }}
              >
                ↗
              </div>

              <div className="eyebrow">EXPLORE MORE</div>

              <h3 style={{ margin: '8px 0 10px' }}>
                Shorts
              </h3>

              <p className="small" style={{ lineHeight: 1.6 }}>
                Quick stock insights, charts and market ideas.
              </p>

              <span
                style={{
                  marginTop: '18px',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                Explore →
              </span>
            </div>
          </Link>
        </div>

        {!shortVideos.length && (
          <div className="card">
            <div className="cardbody">
              <p className="small">No Shorts have been synced yet.</p>
            </div>
          </div>
        )}
      </section>

      {/* =========================================
          COMMUNITY
         ========================================= */}

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">Latest community update</div>
            <h2>Latest Community Post</h2>
          </div>

          <Link className="btn" href="/community">
            Explore more community posts →
          </Link>
        </div>

        {latestPost ? (
          <CommunityPost post={latestPost as any} />
        ) : (
          <div className="card">
            <div className="cardbody">
              <p className="small">No community posts yet.</p>
            </div>
          </div>
        )}
      </section>

      <style>{`
        .exploreMoreCard {
          overflow: hidden;
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .exploreMoreCard > div {
          transition:
            background 0.22s ease,
            transform 0.22s ease;
        }

        .exploreMoreCard:hover > div {
          background:
            linear-gradient(145deg, #f8fafc 0%, #eef2f7 100%);
        }

        .exploreMoreCard:hover .eyebrow {
          letter-spacing: 0.12em;
        }
      `}</style>
    </main>
  );
}
