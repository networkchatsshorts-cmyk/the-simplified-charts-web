import type { MetadataRoute } from 'next';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function safeDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function latestDate(
  values: Array<string | null | undefined>
) {
  let latest: Date | null = null;

  for (const value of values) {
    const date = safeDate(value);

    if (date && (!latest || date.getTime() > latest.getTime())) {
      latest = date;
    }
  }

  return latest;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getSupabaseAdmin();
  const base = getSiteUrl();

  const [topicsResult, videosResult, postsResult] =
    await Promise.all([
      db
        .from('topics')
        .select('id,slug,created_at'),
      db
        .from('videos')
        .select(
          'slug,published_at,updated_at,topic_id,content_type'
        )
        .eq('published', true),
      db
        .from('community_posts')
        .select('slug,created_at,updated_at')
        .eq('published', true),
    ]);

  if (topicsResult.error) {
    throw new Error(topicsResult.error.message);
  }

  if (videosResult.error) {
    throw new Error(videosResult.error.message);
  }

  if (postsResult.error) {
    throw new Error(postsResult.error.message);
  }

  const topics = topicsResult.data || [];
  const videos = videosResult.data || [];
  const posts = postsResult.data || [];

  // A newly created video starts with updated_at = its original
  // YouTube published_at. Only a real DB update moves updated_at
  // forward. Therefore lastmod is always based on actual content
  // history, never on sitemap generation time.
  const videoLastModified = videos.map((video) =>
    latestDate([video.updated_at, video.published_at])
  );

  const topicLastModified = new Map<
    string,
    Date | null
  >(
    topics.map((topic) => [
      topic.id,
      safeDate(topic.created_at),
    ])
  );

  videos.forEach((video, index) => {
    if (!video.topic_id) return;

    const current =
      topicLastModified.get(video.topic_id) || null;

    const candidate =
      videoLastModified[index] || null;

    if (
      candidate &&
      (!current || candidate.getTime() > current.getTime())
    ) {
      topicLastModified.set(
        video.topic_id,
        candidate
      );
    }
  });

  const latestVideo = latestDate(
    videos.flatMap((video) => [
      video.updated_at,
      video.published_at,
    ])
  );

  const latestCommunityPost = latestDate(
    posts.flatMap((post) => [
      post.updated_at,
      post.created_at,
    ])
  );

  // Latest long-form video for /videos listing page.
  const latestLongVideo = latestDate(
    videos
      .filter(
        (video) => video.content_type === 'long'
      )
      .flatMap((video) => [
        video.updated_at,
        video.published_at,
      ])
  );

  // Latest Short for /shorts listing page.
  const latestShortVideo = latestDate(
    videos
      .filter(
        (video) => video.content_type === 'short'
      )
      .flatMap((video) => [
        video.updated_at,
        video.published_at,
      ])
  );

  const latestHomepageChange = latestDate([
    latestVideo?.toISOString(),
    latestCommunityPost?.toISOString(),
  ]);

  const sitemap: MetadataRoute.Sitemap = [
    {
      url: base,
      ...(latestHomepageChange
        ? {
            lastModified:
              latestHomepageChange,
          }
        : {}),
    },

    {
      url: `${base}/community`,
      ...(latestCommunityPost
        ? {
            lastModified:
              latestCommunityPost,
          }
        : {}),
    },

    // Canonical long-video listing page.
    // /long-videos is a redirect to /videos and is intentionally
    // NOT included in the sitemap.
    {
      url: `${base}/videos`,
      ...(latestLongVideo
        ? {
            lastModified:
              latestLongVideo,
          }
        : {}),
    },

    // Canonical Shorts listing page.
    {
      url: `${base}/shorts`,
      ...(latestShortVideo
        ? {
            lastModified:
              latestShortVideo,
          }
        : {}),
    },

    ...topics.map((topic) => ({
      url: `${base}/topics/${topic.slug}`,
      ...(topicLastModified.get(topic.id)
        ? {
            lastModified:
              topicLastModified.get(
                topic.id
              ) as Date,
          }
        : {}),
    })),

    ...videos.map((video, index) => ({
      url: `${base}/videos/${video.slug}`,
      ...(videoLastModified[index]
        ? {
            lastModified:
              videoLastModified[index] as Date,
          }
        : {}),
    })),

    ...posts.map((post) => ({
      url: `${base}/community/${post.slug}`,
      ...(safeDate(post.updated_at) ||
      safeDate(post.created_at)
        ? {
            lastModified:
              (safeDate(post.updated_at) ||
                safeDate(post.created_at)) as Date,
          }
        : {}),
    })),
  ];

  return sitemap;
}
