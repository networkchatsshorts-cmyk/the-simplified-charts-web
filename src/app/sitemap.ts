import type { MetadataRoute } from 'next';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getSupabaseAdmin();

  const [{ data: topics }, { data: videos }, { data: posts }] =
    await Promise.all([
      db
        .from('topics')
        .select('slug,created_at'),

      db
        .from('videos')
        .select('slug,updated_at,topic_id')
        .eq('published', true),

      db
        .from('community_posts')
        .select('slug,updated_at')
        .eq('published', true),
    ]);

  const base = getSiteUrl();

  /*
    Topic lastModified:
    Use the latest updated_at of published videos belonging to that topic.
    If a topic has no published videos, fall back to its created_at.
  */
  const topicLastModified = new Map<string, Date>();

  for (const video of videos || []) {
    if (!video.topic_id || !video.updated_at) continue;

    const videoDate = new Date(video.updated_at);
    const existing = topicLastModified.get(video.topic_id);

    if (!existing || videoDate > existing) {
      topicLastModified.set(video.topic_id, videoDate);
    }
  }

  /*
    Latest published community-post update.
    This becomes the lastModified value for /community.
  */
  let latestCommunityUpdate: Date | null = null;

  for (const post of posts || []) {
    if (!post.updated_at) continue;

    const postDate = new Date(post.updated_at);

    if (!latestCommunityUpdate || postDate > latestCommunityUpdate) {
      latestCommunityUpdate = postDate;
    }
  }

  /*
    Homepage:
    No dedicated homepage updated_at exists in the database,
    so derive it from the latest published video/community update.
  */
  let latestHomepageUpdate: Date | null = latestCommunityUpdate;

  for (const video of videos || []) {
    if (!video.updated_at) continue;

    const videoDate = new Date(video.updated_at);

    if (!latestHomepageUpdate || videoDate > latestHomepageUpdate) {
      latestHomepageUpdate = videoDate;
    }
  }

  return [
    {
      url: base,
      ...(latestHomepageUpdate
        ? { lastModified: latestHomepageUpdate }
        : {}),
    },

    {
      url: `${base}/community`,
      ...(latestCommunityUpdate
        ? { lastModified: latestCommunityUpdate }
        : {}),
    },

    ...(topics || []).map((topic) => ({
      url: `${base}/topics/${topic.slug}`,
      lastModified:
        topicLastModified.get(topic.slug) ||
        new Date(topic.created_at),
    })),

    ...(videos || []).map((video) => ({
      url: `${base}/videos/${video.slug}`,
      lastModified: new Date(video.updated_at),
    })),

    ...(posts || []).map((post) => ({
      url: `${base}/community/${post.slug}`,
      lastModified: new Date(post.updated_at),
    })),
  ];
}
