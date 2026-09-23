import type { MetadataRoute } from 'next';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getSupabaseAdmin();

  const [{ data: topics }, { data: videos }, { data: posts }] =
    await Promise.all([
      db.from('topics').select('slug'),
      db.from('videos').select('slug,updated_at').eq('published', true),
      db
        .from('community_posts')
        .select('slug,updated_at')
        .eq('published', true),
    ]);

  const base = getSiteUrl();

  return [
    { url: base, lastModified: new Date() },

    { url: `${base}/community`, lastModified: new Date() },

    ...(topics || []).map(t => ({
      url: `${base}/topics/${t.slug}`,
      lastModified: new Date(),
    })),

    ...(videos || []).map(v => ({
      url: `${base}/videos/${v.slug}`,
      lastModified: new Date(v.updated_at),
    })),

    ...(posts || []).map(p => ({
      url: `${base}/community/${p.slug}`,
      lastModified: new Date(p.updated_at),
    })),
  ];
}
