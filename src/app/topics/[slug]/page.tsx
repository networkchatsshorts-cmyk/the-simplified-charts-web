import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';

export const revalidate = 300;

export default async function TopicPage({ params }: { params: Promise<{ slug:string }> }) {
  const { slug } = await params;
  const db=getSupabaseAdmin();
  const { data: topic }=await db.from('topics').select('*').eq('slug', slug).single();
  if(!topic) notFound();
  const { data: videos }=await db.from('videos').select('*').eq('topic_id', topic.id).eq('published',true).order('published_at',{ascending:false});
  return <main className="container"><section className="hero"><div className="eyebrow">Stock analysis</div><h1>{topic.name} Analysis</h1><p className="lead">{topic.description || `Latest ${topic.name} stock market analysis, price action, breakouts and support levels from The Simplified Charts.`}</p></section>
  <section className="section"><div className="grid">{(videos||[]).map((v:any)=><Link className="card" href={`/videos/${v.slug}`} key={v.id}>{v.thumbnail_url&&<div className="thumbWrap"><Image className="thumb" src={v.thumbnail_url} alt={v.title} width={640} height={360}/></div>}<div className="cardbody"><h3>{v.title}</h3><p className="small">{v.seo_description || v.description?.slice(0,150)}</p></div></Link>)}</div></section></main>;
}
