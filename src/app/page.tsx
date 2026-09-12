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
      <section className="hero">
        <div className="eyebrow">The Simplified Charts</div>
        <h1>Stock Analysis Built on a Scored Candle System</h1>

        <p className="lead">
          We Don't Just Read Candles. We Score Them. Multiple technical
          parameters drive a structured candle score, which helps identify
          three key zones: HOLD, CAUTION, and STRUCTURE BREAKDOWN.
        </p>

        <a
          className="btn primary"
          href={process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || '#'}
          target="_blank"
          rel="noreferrer"
        >
          Direct on YouTube ↗
        </a>
      </section>

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">Newest long-form analysis</div>
            <h2>Recent Long Videos</h2>
          </div>

          <Link className="btn" href="/long-videos">
            Explore more long videos →
          </Link>
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
        </div>

        {!longVideos.length && (
          <div className="card">
            <div className="cardbody">
              <p className="small">No long videos are available yet.</p>
            </div>
          </div>
        )}
      </section>

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">Newest short-form analysis</div>
            <h2>Recent Shorts</h2>
          </div>

          <Link className="btn" href="/shorts">
            Explore more short videos →
          </Link>
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
        </div>

        {!shortVideos.length && (
          <div className="card">
            <div className="cardbody">
              <p className="small">No Shorts have been synced yet.</p>
            </div>
          </div>
        )}
      </section>

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
    </main>
  );
}
