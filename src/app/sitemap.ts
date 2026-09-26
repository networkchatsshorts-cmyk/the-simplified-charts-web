import type { MetadataRoute } from 'next';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getSupabaseAdmin();

  const [{ data: topics }, { data: videos }, { data: posts }] =
    await Promise.all([
      db
        .from('topics')
        .select('id,slug,created_at'),

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
    -------------------------------------------------------
    TOPIC LAST MODIFIED
    -------------------------------------------------------
    topics table does not have updated_at.

    Therefore:
    - If the topic has published videos, use the latest
      videos.updated_at belonging to that topic.
    - If it has no published videos, fall back to
      topics.created_at.
  */

  const topicLastModified = new Map<string, Date>();

  for (const video of videos || []) {
    if (!video.topic_id || !video.updated_at) {
      continue;
    }

    const videoDate = new Date(video.updated_at);

    if (Number.isNaN(videoDate.getTime())) {
      continue;
    }

    const existingDate = topicLastModified.get(video.topic_id);

    if (!existingDate || videoDate > existingDate) {
      topicLastModified.set(video.topic_id, videoDate);
    }
  }

  /*
    -------------------------------------------------------
    LATEST COMMUNITY UPDATE
    -------------------------------------------------------
    /community is a listing page, so use the most recent
    published community post update time.
  */

  let latestCommunityUpdate: Date | null = null;

  for (const post of posts || []) {
    if (!post.updated_at) {
      continue;
    }

    const postDate = new Date(post.updated_at);

    if (Number.isNaN(postDate.getTime())) {
      continue;
    }

    if (!latestCommunityUpdate || postDate > latestCommunityUpdate) {
      latestCommunityUpdate = postDate;
    }
  }

  /*
    -------------------------------------------------------
    LATEST HOMEPAGE UPDATE
    -------------------------------------------------------
    Homepage currently surfaces:
    - published videos
    - latest community post

    So use the latest real update among those records.
  */

  let latestHomepageUpdate: Date | null = latestCommunityUpdate;

  for (const video of videos || []) {
    if (!video.updated_at) {
      continue;
    }

    const videoDate = new Date(video.updated_at);

    if (Number.isNaN(videoDate.getTime())) {
      continue;
    }

    if (!latestHomepageUpdate || videoDate > latestHomepageUpdate) {
      latestHomepageUpdate = videoDate;
    }
  }

  return [
    /*
      -----------------------------------------------------
      HOMEPAGE
      -----------------------------------------------------
    */
    {
      url: base,
      ...(latestHomepageUpdate
        ? {
            lastModified: latestHomepageUpdate,
          }
        : {}),
    },

    /*
      -----------------------------------------------------
      COMMUNITY LISTING
      -----------------------------------------------------
    */
    {
      url: `${base}/community`,
      ...(latestCommunityUpdate
        ? {
            lastModified: latestCommunityUpdate,
          }
        : {}),
    },

    /*
      -----------------------------------------------------
      TOPIC PAGES
      -----------------------------------------------------
    */
    ...(topics || []).map((topic) => ({
      url: `${base}/topics/${topic.slug}`,
      lastModified:
        topicLastModified.get(topic.id) ||
        new Date(topic.created_at),
    })),

    /*
      -----------------------------------------------------
      VIDEO PAGES
      -----------------------------------------------------
    */
    ...(videos || []).map((video) => ({
      url: `${base}/videos/${video.slug}`,
      lastModified: new Date(video.updated_at),
    })),

    /*
      -----------------------------------------------------
      INDIVIDUAL COMMUNITY POSTS
      -----------------------------------------------------
    */
    ...(posts || []).map((post) => ({
      url: `${base}/community/${post.slug}`,
      lastModified: new Date(post.updated_at),
    })),
  ];
}
