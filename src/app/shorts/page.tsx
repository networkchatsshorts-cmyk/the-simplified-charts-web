import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shorts',
  description:
    'Browse the latest short-form stock market analysis from The Simplified Charts.',
  alternates: {
    canonical: '/shorts',
  },
};


function formatDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '';
}

export default async function ShortsPage() {
  const db = getSupabaseAdmin();
  const { data: videos } = await db
    .from('videos')
    .select('id,title,slug,thumbnail_url,published_at,seo_description')
    .eq('published', true)
    .eq('content_type', 'short')
    .order('published_at', { ascending: false });

  return <main className="container"><section className="hero"><div className="eyebrow">Short-form videos</div><h1>Shorts</h1><p className="lead">All synced Shorts from The Simplified Charts, newest first.</p></section><section className="section"><div className="grid">{(videos || []).map((v: any)=><Link className="card" href={`/videos/${v.slug}`} key={v.id}>{v.thumbnail_url && <div className="thumbWrap"><Image className="thumb" src={v.thumbnail_url} alt={v.title} width={640} height={360}/></div>}<div className="cardbody"><h3>{v.title}</h3><p className="small">{v.seo_description || 'Short-form market analysis.'}</p>{v.published_at && <div className="videoDate">Uploaded {formatDate(v.published_at)}</div>}</div></Link>)}</div>{!videos?.length && <div className="card"><div className="cardbody"><p className="small">No Shorts have been synced yet.</p></div></div>}</section></main>;
}
