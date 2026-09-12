import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';
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

  // Fetch the video independently. This avoids making the video page
  // depend on a PostgREST relationship between videos and topics.
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

  if (!video) return null;

  let topic: any = null;

  if (video.topic_id) {
    const { data: topicData, error: topicError } = await db
      .from('topics')
      .select('id,name,slug,description,youtube_playlist_id')
      .eq('id', video.topic_id)
      .maybeSingle();

    if (topicError) {
      console.error('Topic lookup error:', topicError);
    } else {
      topic = topicData;
    }
  }

  return { ...video, topic };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideo(slug);

  if (!video) return {};

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

  if (!video) notFound();

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/videos/${video.slug}`;
  const embedUrl = youtubeEmbedUrl(video.youtube_video_id);

  const schema = {
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
    uploadDate: video.published_at,
    duration: video.duration_iso || undefined,
    contentUrl: video.youtube_url,
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
      <section className="section">
        <div className="eyebrow">
          {video.topic?.name || 'Stock Market Analysis'}
        </div>

        <h1>{video.title}</h1>

        <p className="lead">
          {video.seo_description ||
            video.description?.slice(0, 300) ||
            'Stock market analysis from The Simplified Charts.'}
        </p>

        {video.published_at && (
          <div className="videoDate">
            Uploaded {formatDate(video.published_at)}
          </div>
        )}

        <div className="videoWrap">
          <iframe
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <div>
          <a
            className="btn primary"
            href={video.youtube_url}
            target="_blank"
            rel="noreferrer"
          >
            Watch on YouTube ↗
          </a>

          {video.topic?.slug && (
            <Link
              className="btn"
              href={`/topics/${video.topic.slug}`}
            >
              More {video.topic.name} Analysis
            </Link>
          )}
        </div>
      </section>

      <section className="section">
        <div className="eyebrow">Analysis</div>
        <h2>What this video covers</h2>

        <div className="prose">
          {video.analysis_intro ||
            video.description ||
            'Analysis details for this video.'}
        </div>

        {!!video.key_points?.length && (
          <>
            <h3>Key points</h3>
            <ul>
              {video.key_points.map((point: string) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="section">
        <div className="eyebrow">Original source</div>
        <p className="small">
          This page is the companion page for the original YouTube video.
          The video remains hosted on YouTube.
        </p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />
    </main>
  );
}
