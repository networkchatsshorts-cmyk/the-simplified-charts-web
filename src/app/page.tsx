import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';

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

  /*
   * Get all topics/playlists and the latest long/short videos.
   */
  const [{ data: topics }, { data: videos }, { data: communityPosts }] =
    await Promise.all([
      db
        .from('topics')
        .select('id,name,slug,youtube_playlist_id')
        .order('name'),

      db
        .from('videos')
        .select(
          'id,title,slug,thumbnail_url,published_at,seo_description,topic_id,content_type'
        )
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(500),

      db
        .from('community_posts')
        .select(
          'id,body,image_url,published_at,created_at,youtube_post_url,published'
        )
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(1),
    ]);

  const playlistTopics = (topics || []).filter(
    (topic: any) =>
      topic.youtube_playlist_id &&
      topic.slug !== 'shorts'
  );

  /*
   * ONE latest long video per playlist.
   */
  const latestLongByPlaylist = new Map<string, any>();

  for (const video of videos || []) {
    if (video.content_type !== 'long') continue;
    if (!video.topic_id) continue;

    const current = latestLongByPlaylist.get(video.topic_id);

    if (
      !current ||
      new Date(video.published_at || 0).getTime() >
        new Date(current.published_at || 0).getTime()
    ) {
      latestLongByPlaylist.set(video.topic_id, video);
    }
  }

  /*
   * Build latest video from every playlist,
   * then globally sort newest -> oldest,
   * then keep ONLY top 5.
   */
  const recentLongVideos = playlistTopics
    .map((topic: any) => {
      const video = latestLongByPlaylist.get(topic.id);

      return video
        ? {
            topic,
            video,
          }
        : null;
    })
    .filter(Boolean)
    .sort(
      (a: any, b: any) =>
        new Date(b.video.published_at || 0).getTime() -
        new Date(a.video.published_at || 0).getTime()
    )
    .slice(0, 5);

  /*
   * Latest 5 Shorts globally.
   */
  const recentShorts = (videos || [])
    .filter((video: any) => video.content_type === 'short')
    .sort(
      (a: any, b: any) =>
        new Date(b.published_at || 0).getTime() -
        new Date(a.published_at || 0).getTime()
    )
    .slice(0, 5);

  const latestCommunityPost = communityPosts?.[0] || null;

  return (
    <main className="container">
      {/* HERO */}
      <section className="hero">
        <div className="eyebrow">The Simplified Charts</div>

        <h1>Stock Market Analysis in Hindi</h1>

        <p className="lead">
          We Don&apos;t Just Read Candles. We Score Them. Multiple
          technical parameters drive a structured candle score, which
          helps identify three key zones: HOLD, CAUTION, and STRUCTURE
          BREAKDOWN.
        </p>

        <a
          className="btn primary"
          href={
            process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || '#'
          }
          target="_blank"
          rel="noreferrer"
        >
          Visit YouTube Channel ↗
        </a>
      </section>

      {/* LONG VIDEOS */}
      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">
              Recently uploaded
            </div>
            <h2>Long Videos</h2>
          </div>

          <Link className="btn" href="/long-videos">
            Explore more long videos →
          </Link>
        </div>

        <div className="grid">
          {recentLongVideos.map(
            ({ topic, video }: any) => (
              <article
                className="card latestCard"
                key={video.id}
              >
                <Link href={`/videos/${video.slug}`}>
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
                    <div className="eyebrow">
                      {topic.name}
                    </div>

                    <h3>{video.title}</h3>

                    <p className="small">
                      {video.seo_description || ''}
                    </p>

                    {video.published_at && (
                      <div className="videoDate">
                        Uploaded{' '}
                        {formatDate(video.published_at)}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="playlistCta">
                  <Link
                    className="playlistLink"
                    href={`/topics/${topic.slug}`}
                  >
                    <span>
                      Explore all videos from this playlist
                    </span>
                    <span aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </article>
            )
          )}
        </div>

        {!recentLongVideos.length && (
          <div className="card">
            <div className="cardbody">
              <p className="small">
                No long videos available yet.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* SHORTS */}
      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">
              Recently uploaded
            </div>
            <h2>Shorts</h2>
          </div>

          <Link className="btn" href="/shorts">
            Explore more shorts →
          </Link>
        </div>

        <div className="grid">
          {recentShorts.map((video: any) => (
            <Link
              className="card latestCard"
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
                  {video.seo_description || ''}
                </p>

                {video.published_at && (
                  <div className="videoDate">
                    Uploaded{' '}
                    {formatDate(video.published_at)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {!recentShorts.length && (
          <div className="card">
            <div className="cardbody">
              <p className="small">
                No Shorts available yet.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* COMMUNITY */}
      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">
              Latest update
            </div>
            <h2>Community</h2>
          </div>

          <Link className="btn" href="/community">
            Explore more community posts →
          </Link>
        </div>

        {latestCommunityPost ? (
          <article className="card communityHomeCard">
            {latestCommunityPost.image_url && (
              <div className="communityImageWrap">
                <Image
                  src={latestCommunityPost.image_url}
                  alt="Latest community post"
                  width={1200}
                  height={800}
                  className="communityImage"
                />
              </div>
            )}

            <div className="cardbody">
              <div className="eyebrow">
                Recent Community Post
              </div>

              <p className="communityBody">
                {latestCommunityPost.body}
              </p>

              {(latestCommunityPost.published_at ||
                latestCommunityPost.created_at) && (
                <div className="videoDate">
                  Posted{' '}
                  {formatDate(
                    latestCommunityPost.published_at ||
                      latestCommunityPost.created_at
                  )}
                </div>
              )}
            </div>
          </article>
        ) : (
          <div className="card">
            <div className="cardbody">
              <h3>No community posts yet</h3>
              <p className="small">
                New community updates will appear here.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
