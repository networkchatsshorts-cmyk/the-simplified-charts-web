\import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const urls: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: new Date(),
    },
  ];

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Keep the build alive even if Supabase server env vars
  // are temporarily unavailable.
  if (!supabaseUrl || !serviceKey) {
    return urls;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/videos?select=slug,updated_at&published=eq.true`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        next: {
          revalidate: 300,
        },
      }
    );

    if (!response.ok) {
      return urls;
    }

    const videos = await response.json();

    for (const video of videos || []) {
      urls.push({
        url: `${base}/videos/${video.slug}`,
        lastModified: new Date(video.updated_at),
      });
    }

    const topicResponse = await fetch(
      `${supabaseUrl}/rest/v1/topics?select=slug`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        next: {
          revalidate: 300,
        },
      }
    );

    if (topicResponse.ok) {
      const topics = await topicResponse.json();

      for (const topic of topics || []) {
        urls.push({
          url: `${base}/topics/${topic.slug}`,
          lastModified: new Date(),
        });
      }
    }
  } catch {
    // Return at least the homepage if Supabase is unavailable.
    return urls;
  }

  return urls;
}
