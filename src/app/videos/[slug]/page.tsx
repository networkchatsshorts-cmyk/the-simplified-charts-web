import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';
import { youtubeEmbedUrl } from '@/lib/youtube';

export const revalidate = 300;

async function getVideo(slug: string) {
  const db = getSupabaseAdmin();
  const { data } = await db.from('videos').select('*, topics(*)').eq('slug', slug).eq('published', true).single();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVideo(slug);
  if (!v) return {};
  return {
    title: v.seo_title || v.title,
    description: v.seo_description || v.description?.slice(0, 160),
    alternates: { canonical: `/videos/${v.slug}` },
    openGraph: { title: v.seo_title || v.title, description: v.seo_description || v.description?.slice(0, 160), type: 'video.other', images: v.thumbnail_url ? [v.thumbnail_url] : [] }
  };
}

function isoToSeconds(iso: string | null) { if (!iso) return undefined; const m=iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if(!m)return undefined; return Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0); }

export default async function VideoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await getVideo(slug);
  if (!v) notFound();
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/videos/${v.slug}`;
  const schema = {
    '@context':'https://schema.org',
    '@type':'VideoObject',
    name:v.title,
    description:v.seo_description || v.description || v.title,
    thumbnailUrl:[v.thumbnail_url],
    uploadDate:v.published_at,
    duration:v.duration_iso || undefined,
    contentUrl:v.youtube_url,
    embedUrl:youtubeEmbedUrl(v.youtube_video_id),
    url:pageUrl,
    publisher:{ '@type':'Organization', name:'The Simplified Charts', url:siteUrl }
  };
  return <main className="container">
    <section className="section">
      <div className="eyebrow">{v.topics?.name || 'Stock Market Analysis'}</div>
      <h1>{v.title}</h1>
      <p className="lead">{v.seo_description || v.description?.slice(0, 300)}</p>
      <div className="videoWrap"><iframe src={youtubeEmbedUrl(v.youtube_video_id)} title={v.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
      <div><a className="btn primary" href={v.youtube_url} target="_blank" rel="noreferrer">Watch on YouTube ↗</a>{v.topics && <Link className="btn" href={`/topics/${v.topics.slug}`}>More {v.topics.name} Analysis</Link>}</div>
    </section>

    <section className="section"><div className="eyebrow">Analysis</div><h2>What this video covers</h2><div className="prose">{v.analysis_intro || v.description || 'Analysis details for this video.'}</div>
      {!!v.key_points?.length && <><h3>Key points</h3><ul>{v.key_points.map((p:string)=><li key={p}>{p}</li>)}</ul></>}
    </section>
    <section className="section"><div className="eyebrow">Original source</div><p className="small">This page is the companion page for the original YouTube video. The video remains hosted on YouTube.</p></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}} />
  </main>;
}
