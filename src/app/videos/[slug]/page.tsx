import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
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

function extractHashtags(value: string | null | undefined) {
  if (!value) return [];

  const matches = value.match(/#[\p{L}\p{N}_]+/gu) || [];

  return [...new Set(matches)];
}


function splitAnalysisLines(value: string) {
  return value
    .split(/\r?\n/)
    .map(line =>
      line
        .replace(/^\s*[-•*]\s*/, '')
        .replace(/^\s*\d{2}(?=[A-Z])\s*/, '')
        .replace(/^\s*\d{1,2}[.)\-:]\s+/, '')
        .trim()
    )
    .filter(Boolean);
}

function splitAnalysisParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean);
}

function extractAnalysisDisclaimer(value: string) {
  const marker = /Educational content only\.[\s\S]*/i;
  const match = value.match(marker);

  if (!match || match.index === undefined) {
    return { content: value, disclaimer: '' };
  }

  return {
    content: value.slice(0, match.index).trim(),
    disclaimer: match[0].trim(),
  };
}

const getVideo = cache(async (slug: string) => {
  const db = getSupabaseAdmin();

  // First try the current slug.
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

  if (video) {
    return attachTopic(db, video);
  }

  // The slug may be an older URL saved before a title change.
  // Resolve it through the redirect history table.
  const { data: history, error: historyError } = await db
    .from('video_slug_history')
    .select('video_id,new_slug')
    .eq('old_slug', slug)
    .maybeSingle();

  if (historyError) {
    console.error('Video slug history lookup error:', historyError);
    return null;
  }

  if (!history?.video_id) {
    return null;
  }

  const { data: currentVideo, error: currentVideoError } = await db
    .from('videos')
    .select('*')
    .eq('id', history.video_id)
    .eq('published', true)
    .maybeSingle();

  if (currentVideoError) {
    console.error('Current video lookup error:', currentVideoError);
    return null;
  }

  if (!currentVideo) {
    return null;
  }

  return attachTopic(db, currentVideo);
});

async function attachTopic(
  db: ReturnType<typeof getSupabaseAdmin>,
  video: any
) {
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
    video.seo_description_managed && video.seo_description?.trim()
      ? video.seo_description.trim()
      : undefined;

  return {
    title: video.title,

    ...(description ? { description } : {}),

    alternates: {
      canonical: `/videos/${video.slug}`,
    },

    openGraph: {
      title: video.title,
      ...(description ? { description } : {}),
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

  if (video.slug !== slug) {
    permanentRedirect(`/videos/${video.slug}`);
  }

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/videos/${video.slug}`;

  const embedUrl = youtubeEmbedUrl(
    video.youtube_video_id
  );

  const activeSeoDescription =
    video.seo_description_managed && video.seo_description?.trim()
      ? video.seo_description.trim()
      : '';

  const whatWeCover = video.what_we_cover?.trim() || '';
  const keyQuestions = video.key_questions?.trim() || '';
  const ourApproach = video.our_approach?.trim() || '';
  const analysisDisclaimer = extractAnalysisDisclaimer(ourApproach);
  const ourApproachBody = analysisDisclaimer.content;
  const fullAnalysis = [whatWeCover, keyQuestions, ourApproachBody]
    .filter(Boolean)
    .join(' ');
  const hasStructuredAnalysis = Boolean(fullAnalysis);

  const whatWeCoverItems = splitAnalysisLines(whatWeCover);
  const keyQuestionItems = splitAnalysisLines(keyQuestions);
  const approachParagraphs = splitAnalysisParagraphs(ourApproachBody);

  const visibleFallbackDescription =
    !fullAnalysis && !activeSeoDescription
      ? video.description?.trim() || ''
      : '';

  const videoSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    ...(activeSeoDescription
      ? { description: activeSeoDescription }
      : fullAnalysis
        ? { description: fullAnalysis }
        : { description: `${video.title} — stock market analysis from The Simplified Charts.` }),
    thumbnailUrl: video.thumbnail_url
      ? [video.thumbnail_url]
      : [],
    uploadDate: video.published_at || undefined,

    // Added: tells search engines when the video page/content
    // was last actually modified.
    dateModified:
      video.updated_at ||
      video.published_at ||
      undefined,

    duration: video.duration_iso || undefined,
    // YouTube watch URLs are not the actual video file bytes, so we use
    // embedUrl for the player and omit contentUrl.
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

        {(fullAnalysis ||
          (Array.isArray(video.key_points) &&
            video.key_points.length > 0) ||
          visibleFallbackDescription) && (
          <section className="section fullAnalysisSection">
            {hasStructuredAnalysis ? (
              <div className="fullAnalysisCard">
                <h2>Check the Full Analysis, Key Levels & Confirmation Candles</h2>

                <p className="analysisIntroLead">
                  Don&apos;t have time to watch the full video? Start with the key setup, levels and approach below.
                </p>

                <div className="fullAnalysisContent">
                  {whatWeCoverItems.length > 0 && (
                    <section className="analysisPanel analysisPanelCover">
                      <h3>What We Cover</h3>
                      <ul className="analysisList">
                        {whatWeCoverItems.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {keyQuestionItems.length > 0 && (
                    <section className="analysisPanel analysisPanelQuestions">
                      <h3>The Key Questions</h3>
                      <ul className="analysisQuestions">
                        {keyQuestionItems.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {ourApproachBody && (
                    <section className="analysisPanel analysisPanelApproach">
                      <h3>Our Approach</h3>
                      <div className="analysisApproach">
                        {approachParagraphs.map((paragraph, index) => (
                          <p key={`${paragraph}-${index}`}>{paragraph}</p>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {analysisDisclaimer && (
                  <div className="analysisDisclaimer">
                    {analysisDisclaimer.disclaimer}
                  </div>
                )}
              </div>
            ) : activeSeoDescription ? (
              <div className="card fallbackDescriptionCard">
                <div className="cardbody">
                  <div className="eyebrow">About this video</div>
                  <p className="lead">{activeSeoDescription}</p>
                </div>
              </div>
            ) : visibleFallbackDescription ? (
              <div className="card fallbackDescriptionCard">
                <div className="cardbody">
                  <div className="eyebrow">About this video</div>
                  <div className="prose">
                    {visibleFallbackDescription}
                  </div>
                </div>
              </div>
            ) : null}

            {Array.isArray(video.key_points) &&
              video.key_points.length > 0 && (
                <div className="keyPointsBlock">
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
                </div>
              )}
          </section>
        )}

        {extractHashtags(video.description).length > 0 && (
          <section className="section">
            <h3>Topics</h3>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {extractHashtags(video.description).map(tag => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: '999px',
                    background: '#f3f4f6',
                    color: '#4b5563',
                    fontSize: '0.85rem',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}
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
