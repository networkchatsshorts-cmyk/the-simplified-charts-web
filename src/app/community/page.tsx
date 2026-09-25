import type { Metadata } from 'next';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';
import CommunityPost from '@/components/CommunityPost';
import SearchAndPaginate from '@/components/SearchAndPaginate';

export const metadata: Metadata = {
  title: 'Community Posts',
  description:
    'Community updates, charts, market observations and discussions from The Simplified Charts.',
  alternates: { canonical: '/community' },
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
    description: 'Community updates, charts and market discussions.',
  };

  return (
    <main className="container">
      <section className="hero">
        <div className="eyebrow">The Simplified Charts</div>
        <h1>Community</h1>
        <p className="lead">
          Market observations, charts, updates and discussions from the
          channel. Open a post to read and join the conversation.
        </p>
      </section>

      <section className="section communityFeed">
        <SearchAndPaginate
          placeholder="Search community post"
          emptyMessage="No community posts match your search."
          itemsLabel="Posts"
        >
          <section className="section">
            <h2>Learning</h2>
            <p className="small">
              Educational posts, chart breakdowns and lessons from The Simplified Charts.
            </p>

            {(posts || [])
              .filter((post: any) =>
                (post.category || 'learning') === 'learning'
              )
              .map((post: any) => {
                const searchText = [post.title, post.body]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div
                    key={post.id}
                    data-search-item
                    data-search-text={searchText}
                  >
                    <CommunityPost post={post} />
                  </div>
                );
              })}
          </section>

          <section className="section">
            <h2>Stocks to watch next week</h2>
            <p className="small">
              Weekly watchlist posts covering stocks and setups worth tracking.
            </p>

            {(posts || [])
              .filter(
                (post: any) =>
                  post.category === 'stocks-to-watch-next-week'
              )
              .map((post: any) => {
                const searchText = [post.title, post.body]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div
                    key={post.id}
                    data-search-item
                    data-search-text={searchText}
                  >
                    <CommunityPost post={post} />
                  </div>
                );
              })}
          </section>

          {!posts?.length && (
            <div className="card">
              <div className="cardbody">
                <h2>No community posts yet</h2>
                <p className="small">New posts will appear here.</p>
              </div>
            </div>
          )}
        </SearchAndPaginate>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </main>
  );
}
import type { Metadata } from 'next';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';
import CommunityPost from '@/components/CommunityPost';
import SearchAndPaginate from '@/components/SearchAndPaginate';

export const metadata: Metadata = {
  title: 'Community Posts',
  description:
    'Community updates, charts, market observations and discussions from The Simplified Charts.',
  alternates: { canonical: '/community' },
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
    description: 'Community updates, charts and market discussions.',
  };

  return (
    <main className="container">
      <section className="hero">
        <div className="eyebrow">The Simplified Charts</div>
        <h1>Community</h1>
        <p className="lead">
          Market observations, charts, updates and discussions from the
          channel. Open a post to read and join the conversation.
        </p>
      </section>

      <section className="section communityFeed">
        <SearchAndPaginate
          placeholder="Search community post"
          emptyMessage="No community posts match your search."
          itemsLabel="Posts"
        >
          {(posts || []).map((post: any) => {
            const searchText = [post.title, post.body]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={post.id}
                data-search-item
                data-search-text={searchText}
              >
                <CommunityPost post={post} />
              </div>
            );
          })}

          {!posts?.length && (
            <div className="card">
              <div className="cardbody">
                <h2>No community posts yet</h2>
                <p className="small">New posts will appear here.</p>
              </div>
            </div>
          )}
        </SearchAndPaginate>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </main>
  );
}
