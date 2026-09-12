import type { Metadata } from 'next';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';
import CommunityPost from '@/components/CommunityPost';

export const metadata: Metadata = {
  title: 'Community Posts',
  description: 'Community updates, charts, market observations and discussions from The Simplified Charts.',
  alternates: { canonical: '/community' }
};

export const revalidate = 120;

export default async function CommunityPage() {
  const db = getSupabaseAdmin();
  const { data: posts } = await db.from('community_posts').select('*').eq('published', true).order('created_at', { ascending: false }).limit(50);
  const siteUrl = getSiteUrl();
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'The Simplified Charts Community', url: `${siteUrl}/community`, description: 'Community updates, charts and market discussions.' };

  return <main className="container">
    <section className="hero">
      <div className="eyebrow">The Simplified Charts</div>
      <h1>Community</h1>
      <p className="lead">Market observations, charts, updates and discussions from the channel. Open a post to read and join the conversation.</p>
    </section>
    <section className="section communityFeed">
      {(posts || []).map((post: any) => <CommunityPost key={post.id} post={post} />)}
      {!posts?.length && <div className="card"><div className="cardbody"><h2>No community posts yet</h2><p className="small">New posts will appear here.</p></div></div>}
    </section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  </main>;
}
