import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    : '';

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getSupabaseAdmin();

  const { data: topic } = await db
    .from('topics')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!topic) notFound();

  const { data: videos } = await db
    .from('videos')
    .select('*')
    .eq('topic_id', topic.id)
    .eq('published', true)
    .order('published_at', { ascending: false });

  const isShorts = topic.slug === 'shorts';

  return (
    <main className="container">
      <section className="hero">
        <div className="eyebrow">{isShorts ? 'Short-form videos' : 'YouTube Playlist'}</div>
        <h1>{topic.name}</h1>
        <p className="lead">
          {topic.description ||
            `All ${topic.name} videos from The Simplified Charts, including price action, breakouts, support zones and structured decision analysis.`}
        </p>
        {topic.youtube_playlist_url && (
          <a className="btn primary" href={topic.youtube_playlist_url} target="_blank" rel="noreferrer">
            Open YouTube Playlist ↗
          </a>
        )}
      </section>

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">{videos?.length || 0} videos</div>
            <h2>All Videos</h2>
          </div>
        </div>

        <div className="grid">
          {(videos || []).map((v: any) => (
            <Link className="card" href={`/videos/${v.slug}`} key={v.id}>
              {v.thumbnail_url && (
                <div className="thumbWrap">
                  <Image className="thumb" src={v.thumbnail_url} alt={v.title} width={640} height={360} />
                </div>
              )}
              <div className="cardbody">
                <h3>{v.title}</h3>
                <p className="small">{v.seo_description || v.description?.slice(0, 150)}</p>
                {v.published_at && (
                  <div className="videoDate">Uploaded {formatDate(v.published_at)}</div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {!videos?.length && (
          <div className="card"><div className="cardbody"><p className="small">No published videos in this section yet.</p></div></div>
        )}
      </section>
    </main>
  );
}
