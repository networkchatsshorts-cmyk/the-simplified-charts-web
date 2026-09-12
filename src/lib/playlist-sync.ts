import { getSupabaseAdmin } from '@/lib/supabase';
import { fetchPlaylist, fetchPlaylistItems, fetchVideo } from '@/lib/youtube';
import { makeSlug } from '@/lib/slug';

export type PlaylistSyncSummary = {
  playlist: {
    id: string;
    title: string;
    description: string;
    topicId: string;
    topicSlug: string;
  };
  found: number;
  synced: number;
  skipped: number;
  archived: number;
  errors: string[];
};

export async function syncPlaylistById(playlistId: string): Promise<PlaylistSyncSummary> {
  const playlist = await fetchPlaylist(playlistId);
  const items = await fetchPlaylistItems(playlistId);
  const db = getSupabaseAdmin();

  const { data: existingTopic, error: topicLookupError } = await db
    .from('topics')
    .select('*')
    .eq('youtube_playlist_id', playlist.id)
    .maybeSingle();

  if (topicLookupError) {
    throw new Error(topicLookupError.message);
  }

  const topicSlug = makeSlug(playlist.title, playlist.id);
  let topicId: string;
  let savedTopic: any;

  if (existingTopic) {
    const { data, error } = await db
      .from('topics')
      .update({
        name: playlist.title,
        slug: topicSlug,
        description: playlist.description,
        youtube_playlist_id: playlist.id,
        youtube_playlist_url: `https://www.youtube.com/playlist?list=${playlist.id}`,
      })
      .eq('id', existingTopic.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Could not update playlist category.');
    }

    topicId = data.id;
    savedTopic = data;
  } else {
    const { data, error } = await db
      .from('topics')
      .upsert(
        {
          name: playlist.title,
          slug: topicSlug,
          description: playlist.description,
          youtube_playlist_id: playlist.id,
          youtube_playlist_url: `https://www.youtube.com/playlist?list=${playlist.id}`,
        },
        { onConflict: 'slug' }
      )
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Could not create playlist category.');
    }

    topicId = data.id;
    savedTopic = data;
  }

  const currentVideoIds = new Set<string>();
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of items) {
    currentVideoIds.add(item.videoId);

    try {
      const video = await fetchVideo(item.videoId);

      const { error } = await db.from('videos').upsert(
        {
          youtube_video_id: video.id,
          slug: makeSlug(video.title, video.id),
          title: video.title,
          description: video.description,
          youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
          thumbnail_url: video.thumbnailUrl,
          published_at: video.publishedAt,
          duration_iso: video.durationIso,
          duration_seconds: video.durationSeconds,
          channel_id: video.channelId,
          channel_title: video.channelTitle,
          tags: video.tags,
          category_id: video.categoryId,
          topic_id: topicId,
          seo_title: video.title,
          seo_description: video.description?.slice(0, 160),
          published: true,
        },
        { onConflict: 'youtube_video_id' }
      );

      if (error) throw new Error(error.message);
      synced++;
    } catch (error) {
      skipped++;
      if (errors.length < 10) {
        errors.push(
          `${item.videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  // Reconcile removals. Videos removed from the YouTube playlist are archived
  // on the site instead of being hard-deleted, so history remains recoverable.
  const { data: existingVideos, error: existingVideosError } = await db
    .from('videos')
    .select('id, youtube_video_id')
    .eq('topic_id', topicId);

  if (existingVideosError) throw new Error(existingVideosError.message);

  let archived = 0;

  for (const video of existingVideos || []) {
    if (!currentVideoIds.has(video.youtube_video_id)) {
      const { error } = await db
        .from('videos')
        .update({ published: false })
        .eq('id', video.id);

      if (!error) archived++;
      else if (errors.length < 10) errors.push(`${video.youtube_video_id}: ${error.message}`);
    }
  }

  return {
    playlist: {
      id: savedTopic.youtube_playlist_id,
      title: savedTopic.name,
      description: savedTopic.description || '',
      topicId: savedTopic.id,
      topicSlug: savedTopic.slug,
    },
    found: items.length,
    synced,
    skipped,
    archived,
    errors,
  };
}

export async function syncAllPlaylists() {
  const db = getSupabaseAdmin();
  const { data: topics, error } = await db
    .from('topics')
    .select('id, name, youtube_playlist_id')
    .not('youtube_playlist_id', 'is', null);

  if (error) throw new Error(error.message);

  const results: Array<{ name: string; ok: boolean; summary?: PlaylistSyncSummary; error?: string }> = [];

  for (const topic of topics || []) {
    if (!topic.youtube_playlist_id) continue;

    try {
      const summary = await syncPlaylistById(topic.youtube_playlist_id);
      results.push({ name: topic.name, ok: true, summary });
    } catch (error) {
      results.push({
        name: topic.name,
        ok: false,
        error: error instanceof Error ? error.message : 'Playlist sync failed.',
      });
    }
  }

  return results;
}

export async function syncShortsMetadata() {
  const db = getSupabaseAdmin();
  const { data: shortsTopic, error: topicError } = await db
    .from('topics')
    .select('id')
    .eq('slug', 'shorts')
    .maybeSingle();

  if (topicError) throw new Error(topicError.message);
  if (!shortsTopic) return { found: 0, synced: 0, skipped: 0, errors: [] as string[] };

  const { data: shorts, error: shortsError } = await db
    .from('videos')
    .select('id,youtube_video_id')
    .eq('topic_id', shortsTopic.id);

  if (shortsError) throw new Error(shortsError.message);

  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of shorts || []) {
    try {
      const video = await fetchVideo(row.youtube_video_id);
      const { error } = await db
        .from('videos')
        .update({
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnailUrl,
          published_at: video.publishedAt,
          duration_iso: video.durationIso,
          duration_seconds: video.durationSeconds,
          channel_id: video.channelId,
          channel_title: video.channelTitle,
          tags: video.tags,
          category_id: video.categoryId,
          seo_title: video.title,
          seo_description: video.description?.slice(0, 160),
        })
        .eq('id', row.id);
      if (error) throw new Error(error.message);
      synced++;
    } catch (error) {
      skipped++;
      if (errors.length < 10) errors.push(`${row.youtube_video_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { found: (shorts || []).length, synced, skipped, errors };
}
