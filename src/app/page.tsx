import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';

export const revalidate = 300;

export default async function HomePage() {
  const db = getSupabaseAdmin();
  const [{ data: topics }, { data: videos }] = await Promise.all([
    db.from('topics').select('*').order('name'),
    db.from('videos').select('*').eq('published', true).order('published_at', { ascending: false }).limit(12)
  ]);
  return <main className="container">
    <section className="hero">
      <div className="eyebrow">The Simplified Charts</div>
      <h1>Stock Market Analysis in Hindi</h1>
      <p className="lead">Practical chart analysis focused on breakouts, support zones, price action and clear buy-or-sell frameworks. Explore each stock category and watch the original YouTube analysis.</p>
      <a className="btn primary" href={process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || '#'} target="_blank" rel="noreferrer">Visit YouTube Channel ↗</a>
    </section>

    <section className="section"><div className="topicHeader"><div><div className="eyebrow">Browse research</div><h2>Stock Analysis</h2></div></div>
      <div className="grid">{(topics || []).map((t: any) => <Link className="card" href={`/topics/${t.slug}`} key={t.id}><div className="cardbody"><h3>{t.name}</h3><p className="small">{t.description || `Latest ${t.name} stock analysis and videos.`}</p></div></Link>)}</div>
    </section>

    <section className="section"><div className="topicHeader"><div><div className="eyebrow">Latest</div><h2>Recent Videos</h2></div></div>
      <div className="grid">{(videos || []).map((v: any) => <Link className="card" href={`/videos/${v.slug}`} key={v.id}>
        {v.thumbnail_url && (
                <div className="thumbWrap">
                  <Image
                    className="thumb"
                    src={v.thumbnail_url}
                    alt={v.title}
                    width={640}
                    height={360}
                  />
                </div>
              )}
        <div className="cardbody"><h3>{v.title}</h3><p className="small">{v.seo_description || v.description?.slice(0, 150)}</p></div>
      </Link>)}</div>
    </section>
  </main>;
}
