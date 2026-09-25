import type { Metadata } from 'next';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';
import CommunitySections from '@/components/CommunitySections';

export const metadata: Metadata = {
  title: 'Community Posts',
  description:
    'Community updates, charts, market observations and discussions from The Simplified Charts.',
  alternates: {
    canonical: '/community',
  },
};

export const revalidate = 120;

export default async function CommunityPage() {
  const db = getSupabaseAdmin();

  const { data: posts } = await db
    .from('community_posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(500);

  const siteUrl = getSiteUrl();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'The Simplified Charts Community',
    url: `${siteUrl}/community`,
    description:
      'Community updates, charts and market discussions.',
  };

  return (
    <main className="container">
      <CommunitySections posts={posts || []} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />
    </main>
  );
}
