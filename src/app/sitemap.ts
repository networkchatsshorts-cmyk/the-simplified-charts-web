import type { MetadataRoute } from 'next';
import {
  getSupabaseAdmin,
  getSiteUrl,
} from '@/lib/supabase';

/*
  Sitemap is generated at request time.

  This is important because videos.updated_at and
  community_posts.updated_at can change without a new deployment.
*/
export const dynamic = 'force-dynamic';

type VideoRow = {
  slug: string;
  updated_at: string | null;
  topic_id: string | null;
};

type TopicRow = {
  id: string;
  slug: string;
  created_at: string | null;
};

type CommunityPostRow = {
  slug: string;
  updated_at: string | null;
};

function toDate(
  value: string | null | undefined
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getLatestDate(
  values: Array<string | null | undefined>
): Date {
  const dates = values
    .map(toDate)
    .filter(
      (date): date is Date => date !== null
    );

  if (dates.length === 0) {
    return new Date(0);
  }

  return new Date(
    Math.max(
      ...dates.map((date) => date.getTime())
    )
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getSupabaseAdmin();
  const base = getSiteUrl();

  const [
    topicsResult,
    videosResult,
    postsResult,
  ] = await Promise.all([
    db
      .from('topics')
      .select(
        'id,slug,created_at'
      ),

    db
      .from('videos')
      .select(
        'slug,updated_at,topic_id'
      )
      .eq(
        'published',
        true
      ),

    db
      .from('community_posts')
      .select(
        'slug,updated_at'
      )
      .eq(
        'published',
        true
      ),
  ]);

  if (topicsResult.error) {
    console.error(
      'Sitemap topics query error:',
      topicsResult.error
    );
  }

  if (videosResult.error) {
    console.error(
      'Sitemap videos query error:',
      videosResult.error
    );
  }

  if (postsResult.error) {
    console.error(
      'Sitemap community posts query error:',
      postsResult.error
    );
  }

  const topics =
    (topicsResult.data || []) as TopicRow[];

  const videos =
    (videosResult.data || []) as VideoRow[];

  const posts =
    (postsResult.data || []) as CommunityPostRow[];

  /*
    ------------------------------------------------------------
    Latest community update
    ------------------------------------------------------------
  */
  const latestCommunityDate =
    getLatestDate(
      posts.map(
        (post) => post.updated_at
      )
    );

  /*
    ------------------------------------------------------------
    Latest video update
    ------------------------------------------------------------
  */
  const latestVideoDate =
    getLatestDate(
      videos.map(
        (video) => video.updated_at
      )
    );

  /*
    ------------------------------------------------------------
    Homepage lastmod

    Homepage depends on both:
      - published videos
      - published community posts

    Therefore use the latest relevant update.
    ------------------------------------------------------------
  */
  const homepageLastModified =
    new Date(
      Math.max(
        latestVideoDate.getTime(),
        latestCommunityDate.getTime()
      )
    );

  /*
    ------------------------------------------------------------
    Community listing lastmod

    The /community page changes when its latest published
    community post changes.
    ------------------------------------------------------------
  */
  const communityLastModified =
    latestCommunityDate.getTime() > 0
      ? latestCommunityDate
      : null;

  /*
    ------------------------------------------------------------
    Topic lastmod

    topics table has no updated_at.

    So for each topic:
      latest published related video updated_at
      OR topic.created_at if there is no published video.
    ------------------------------------------------------------
  */
  const topicLastModified =
    new Map<string, Date>();

  for (const topic of topics) {
    const relatedVideoDates =
      videos
        .filter(
          (video) =>
            video.topic_id === topic.id
        )
        .map(
          (video) =>
            video.updated_at
        );

    const latestRelatedVideoDate =
      getLatestDate(
        relatedVideoDates
      );

    const topicCreatedDate =
      toDate(
        topic.created_at
      );

    if (
      latestRelatedVideoDate.getTime() >
      0
    ) {
      topicLastModified.set(
        topic.id,
        latestRelatedVideoDate
      );
    } else if (
      topicCreatedDate
    ) {
      topicLastModified.set(
        topic.id,
        topicCreatedDate
      );
    }
  }

  /*
    ------------------------------------------------------------
    Build sitemap
    ------------------------------------------------------------
  */
  const sitemapEntries: MetadataRoute.Sitemap =
    [];

  /*
    Homepage
  */
  sitemapEntries.push({
    url: base,
    lastModified:
      homepageLastModified.getTime() > 0
        ? homepageLastModified
        : new Date(),
  });

  /*
    Community listing
  */
  sitemapEntries.push({
    url: `${base}/community`,
    ...(communityLastModified
      ? {
          lastModified:
            communityLastModified,
        }
      : {}),
  });

  /*
    Topic pages
  */
  for (const topic of topics) {
    const lastModified =
      topicLastModified.get(
        topic.id
      );

    sitemapEntries.push({
      url: `${base}/topics/${topic.slug}`,
      ...(lastModified
        ? {
            lastModified,
          }
        : {}),
    });
  }

  /*
    Individual video pages
  */
  for (const video of videos) {
    const lastModified =
      toDate(
        video.updated_at
      );

    sitemapEntries.push({
      url: `${base}/videos/${video.slug}`,
      ...(lastModified
        ? {
            lastModified,
          }
        : {}),
    });
  }

  /*
    Individual community posts
  */
  for (const post of posts) {
    const lastModified =
      toDate(
        post.updated_at
      );

    sitemapEntries.push({
      url: `${base}/community/${post.slug}`,
      ...(lastModified
        ? {
            lastModified,
          }
        : {}),
    });
  }

  return sitemapEntries;
}
