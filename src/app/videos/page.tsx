import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import SearchAndPaginate from '@/components/SearchAndPaginate';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Long Videos',
  description:
    'Browse all long-form stock analysis from The Simplified Charts, sorted from newest to oldest.',
  alternates: {
    canonical: '/videos',
  },
};

function formatDate(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    : '';
}

export default async function LongVideosPage() {
  const db = getSupabaseAdmin();
  const { data: videos } = await db
    .from('videos')
    .select(
      'id,title,slug,thumbnail_url,published_at,seo_description,topic_id'
    )
    .eq('published', true)
    .eq('content_type', 'long')
    .not('topic_id', 'is', null)
    .order('published_at', { ascending: false });

  const topicIds = [
    ...new Set((videos || []).map((v) => v.topic_id).filter(Boolean)),
  ];
  const { data: topics } = topicIds.length
    ? await db.from('topics').select('id,name,slug').in('id', topicIds)
    : { data: [] as any[] };
  const topicMap = new Map((topics || []).map((t) => [t.id, t]));

  return (
    <main className="container">
      <section className="hero">
        <div className="eyebrow">All long-form analysis</div>
        <h1>Long Videos</h1>
        <p className="lead">
          Browse all long-form stock analysis, sorted from newest to oldest.
        </p>
      </section>

      <section className="section">
        <SearchAndPaginate
          placeholder="Search long videos"
          emptyMessage="No long videos match your search."
          itemsLabel="Videos"
        >
          <div className="grid">
            {(videos || []).map((v: any) => {
              const topic = topicMap.get(v.topic_id);
              const searchText = [
                v.title,
                v.seo_description,
                topic?.name,
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <article
                  className="card latestCard"
                  key={v.id}
                  data-search-item
                  data-search-text={searchText}
                >
                  <Link href={`/videos/${v.slug}`}>
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
                    <div className="cardbody">
                      {topic?.name && (
                        <div className="eyebrow">{topic.name}</div>
                      )}
                      <h3>{v.title}</h3>
                      <p className="small">{v.seo_description || ''}</p>
                      {v.published_at && (
                        <div className="videoDate">
                          Uploaded {formatDate(v.published_at)}
                        </div>
                      )}
                    </div>
                  </Link>
                  {topic?.slug && (
                    <div className="playlistCta">
                      <Link
                        className="playlistLink"
                        href={`/topics/${topic.slug}`}
                      >
                        <span>Explore all videos from this playlist</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {!videos?.length && (
            <div className="card">
              <div className="cardbody">
                <p className="small">No long videos yet.</p>
              </div>
            </div>
          )}
        </SearchAndPaginate>
      </section>
    </main>
  );
}
