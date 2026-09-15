import type { SupabaseClient } from '@supabase/supabase-js';

export async function recordVideoSlugHistory(
  db: SupabaseClient,
  videoId: string,
  oldSlug: string,
  newSlug: string
) {
  if (!oldSlug || !newSlug || oldSlug === newSlug) {
    return;
  }

  const { error } = await db
    .from('video_slug_history')
    .upsert(
      {
        video_id: videoId,
        old_slug: oldSlug,
        new_slug: newSlug,
      },
      { onConflict: 'old_slug' }
    );

  if (error) {
    throw new Error(
      `Could not save old video URL redirect: ${error.message}`
    );
  }
}
