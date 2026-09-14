import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getSupabaseAdmin,
  getSiteUrl,
} from '@/lib/supabase';
import { youtubeEmbedUrl } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

function formatDate(value: string | null | undefined) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

async function getVideo(slug: string) {
  const db = getSupabaseAdmin();

  // Fetch the video independently.
  // This avoids making the video page dependent on
  // a successful topics relation lookup.
  const { data: video, error } = await db
    .from('videos')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error) {
    console.error('Video lookup error:', error);
    return null;
  }

  if (!video) {
    return null;
  }

  let topic = null;

  if (video.topic_id) {
    const { data: topicData, error: topicError } = await db
      .from('topics')
      .select(
        'id,name,slug,description,youtube_playlist_id'
      )
      .eq('id', video.topic_id)
      .maybeSingle();

    if (topicError) {
      console.error('Topic lookup error:', topicError);
    } else {
      topic = topicData;
    }
  }

  return {
    ...video,
    topic,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideo(slug);

  if (!video) {
    return {};
  }

  const description =
    video.seo_description ||
    video.description?.slice(0, 160) ||
    video.title;

  return {
    title: video.seo_title || video.title,
    description,

    alternates: {
      canonical: `/videos/${video.slug}`,
    },

    openGraph: {
      title: video.seo_title || video.title,
      description,
      type: 'video.other',
      images: video.thumbnail_url
        ? [video.thumbnail_url]
        : [],
    },
  };
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const video = await getVideo(slug);

  if (!video) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/videos/${video.slug}`;

  const embedUrl = youtubeEmbedUrl(
    video.youtube_video_id
  );

  const videoSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description:
      video.seo_description ||
      video.description ||
      video.title,
    thumbnailUrl: video.thumbnail_url
      ? [video.thumbnail_url]
      : [],
    uploadDate: video.published_at || undefined,
    duration: video.duration_iso || undefined,
    contentUrl: video.youtube_url || undefined,
    embedUrl,
    url: pageUrl,
    publisher: {
      '@type': 'Organization',
      name: 'The Simplified Charts',
      url: siteUrl,
    },
  };

  return (
    <main className="container">
      <article>
        <section className="hero">
          {video.topic?.name && (
            <div className="eyebrow">
              {video.topic.name}
            </div>
          )}

          <h1>{video.title}</h1>

          {video.seo_description && (
            <p className="lead">
              {video.seo_description}
            </p>
          )}

          {video.published_at && (
            <div className="videoDate">
              Uploaded{' '}
              {formatDate(video.published_at)}
            </div>
          )}
        </section>

        <section className="section">
          {/* Full-width responsive YouTube player */}
          <div
            style={{
              width: '100%',
              maxWidth: '1160px',
              margin: '0 auto',
              aspectRatio: '16 / 9',
              background: '#000',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow:
                '0 10px 30px rgba(0,0,0,0.08)',
            }}
          >
            <iframe
              src={embedUrl}
              title={video.title}
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                border: '0',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '20px',
            }}
          >
            {video.youtube_url && (
              <a
                className="btn primary"
                href={video.youtube_url}
                target="_blank"
                rel="noreferrer"
              >
                Watch on YouTube ↗
              </a>
            )}

            {video.topic?.slug && (
              <Link
                className="btn"
                href={`/topics/${video.topic.slug}`}
              >
                Explore all videos from this playlist →
              </Link>
            )}
          </div>
        </section>

        <section className="section">
          
          <h2>About this analysis</h2>

          <div className="prose">
            {video.description ||
              video.seo_description ||
              'Stock market analysis from The Simplified Charts.'}
          </div>

          {Array.isArray(video.key_points) &&
            video.key_points.length > 0 && (
              <>
                <h3>Key points</h3>

                <ul>
                  {video.key_points.map(
                    (point: string, index: number) => (
                      <li key={`${point}-${index}`}>
                        {point}
                      </li>
                    )
                  )}
                </ul>
              </>
            )}
        </section>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoSchema),
        }}
      />
    </main>
  );
}
