import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export default async function HomePage() {
  const db = getSupabaseAdmin();

  const [{ data: topics }, { data: videos }] = await Promise.all([
    db
      .from('topics')
      .select('id,name,slug,youtube_playlist_id')
      .not('youtube_playlist_id', 'is', null)
      .order('name'),
    db
      .from('videos')
      .select('id,title,youtube_video_id,slug,thumbnail_url,published_at,topic_id,seo_description')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(500),
  ]);

  const playlistTopics = topics || [];
  const playlistIds = new Set(playlistTopics.map((topic) => topic.id));

  const latestByTopic = new Map<string, any>();
  for (const video of videos || []) {
    if (!video.topic_id || !playlistIds.has(video.topic_id)) continue;
    if (!latestByTopic.has(video.topic_id)) {
      latestByTopic.set(video.topic_id, video);
    }
  }

  const { data: shortsTopic } = await db
    .from('topics')
    .select('id,name,slug')
    .eq('slug', 'shorts')
    .maybeSingle();

  let shorts: any[] = [];
  if (shortsTopic) {
    const { data } = await db
      .from('videos')
      .select('id,title,youtube_video_id,slug,thumbnail_url,published_at,seo_description')
      .eq('topic_id', shortsTopic.id)
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(12);
    shorts = data || [];
  }

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
          Visit YouTube Channel ↗
        </a>
      </section>

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">Browse research</div>
            <h2>Stock Playlists</h2>
          </div>
          <span className="small">Select a playlist to see its full analysis</span>
        </div>

        <div className="playlistGrid">
          {playlistTopics.map((topic) => (
            <Link className="playlistCard" href={`/topics/${topic.slug}`} key={topic.id}>
              <h3>{topic.name}</h3>
              <span className="playlistArrow">View analysis →</span>
            </Link>
          ))}
        </div>

        {!playlistTopics.length && (
          <div className="card">
            <div className="cardbody">
              <p className="small">Add a YouTube playlist from the Admin area to create its section here.</p>
            </div>
          </div>
        )}
      </section>

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">Latest from each playlist</div>
            <h2>Recent Analysis</h2>
          </div>
        </div>

        <div className="grid">
          {playlistTopics.map((topic) => {
            const video = latestByTopic.get(topic.id);
            if (!video) return null;
            return (
              <Link className="card" href={`/videos/${video.slug}`} key={topic.id}>
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
                  <div className="eyebrow">{topic.name}</div>
                  <h3>{video.title}</h3>
                  <p className="small">
                    {video.seo_description || 'Latest analysis from this playlist.'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {!latestByTopic.size && (
          <div className="card">
            <div className="cardbody"><p className="small">No playlist videos are available yet.</p></div>
          </div>
        )}
      </section>

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">Quick videos</div>
            <h2>Shorts</h2>
          </div>
          {shortsTopic && <Link className="btn" href={`/topics/${shortsTopic.slug}`}>View all Shorts →</Link>}
        </div>

        <div className="grid">
          {shorts.map((video) => (
            <Link className="card" href={`/videos/${video.slug}`} key={video.id}>
              {video.thumbnail_url && (
                <div className="thumbWrap">
                  <Image className="thumb" src={video.thumbnail_url} alt={video.title} width={640} height={360} />
                </div>
              )}
              <div className="cardbody">
                <h3>{video.title}</h3>
                <p className="small">{video.seo_description || 'Short-form market analysis.'}</p>
              </div>
            </Link>
          ))}
        </div>

        {!shorts.length && (
          <div className="card">
            <div className="cardbody"><p className="small">No Shorts have been added yet.</p></div>
          </div>
        )}
      </section>
    </main>
  );
}
