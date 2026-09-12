import { getSupabaseAdmin } from '@/lib/supabase';
import {
  fetchChannel,
  fetchPlaylist,
  fetchPlaylistItems,
  fetchVideo,
  fetchVideosByIds,
} from '@/lib/youtube';
import { makeSlug } from '@/lib/slug';

export type PlaylistSyncSummary = {
  playlist: { id: string; title: string; description: string; topicId: string; topicSlug: string };
  found: number;
  synced: number;
  skipped: number;
  archived: number;
  errors: string[];
};

const shortThresholdSeconds = 180;

function videoRow(video: any, topicId: string, contentType: 'long' | 'short') {
  return {
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
    content_type: contentType,
    seo_title: video.title,
    seo_description: video.description?.slice(0, 160),
    published: true,
  };
}

export async function syncPlaylistById(playlistId: string): Promise<PlaylistSyncSummary> {
  const playlist = await fetchPlaylist(playlistId);
  const items = await fetchPlaylistItems(playlistId, 100);
  const db = getSupabaseAdmin();

  const { data: existingTopic, error: topicLookupError } = await db
    .from('topics')
    .select('*')
    .eq('youtube_playlist_id', playlist.id)
    .maybeSingle();
  if (topicLookupError) throw new Error(topicLookupError.message);

  const topicSlug = makeSlug(playlist.title, playlist.id);
  let topicId: string;
  let savedTopic: any;

  if (existingTopic) {
    const { data, error } = await db.from('topics').update({
      name: playlist.title,
      slug: topicSlug,
      description: playlist.description,
      youtube_playlist_id: playlist.id,
      youtube_playlist_url: `https://www.youtube.com/playlist?list=${playlist.id}`,
    }).eq('id', existingTopic.id).select('*').single();
    if (error || !data) throw new Error(error?.message || 'Could not update playlist category.');
    topicId = data.id; savedTopic = data;
  } else {
    const { data, error } = await db.from('topics').upsert({
      name: playlist.title,
      slug: topicSlug,
      description: playlist.description,
      youtube_playlist_id: playlist.id,
      youtube_playlist_url: `https://www.youtube.com/playlist?list=${playlist.id}`,
    }, { onConflict: 'slug' }).select('*').single();
    if (error || !data) throw new Error(error?.message || 'Could not create playlist category.');
    topicId = data.id; savedTopic = data;
  }

  const currentVideoIds = new Set(items.map((x) => x.videoId));
  let synced = 0; let skipped = 0; let archived = 0;
  const errors: string[] = [];

  const ids = items.map((x) => x.videoId);
  const fetched = new Map((await fetchVideosByIds(ids)).map((v) => [v.id, v]));

  for (const item of items) {
    const video = fetched.get(item.videoId);
    if (!video) { skipped++; if (errors.length < 10) errors.push(`${item.videoId}: Video not returned by YouTube.`); continue; }
    try {
      // Playlist membership is the source of truth for the playlist. Auto short
      // classification is only applied when the video has not been manually overridden.
      const { data: existing } = await db.from('videos').select('id,classification_locked,content_type,original_topic_id').eq('youtube_video_id', video.id).maybeSingle();
      const autoType: 'short' | 'long' = video.durationSeconds <= shortThresholdSeconds ? 'short' : 'long';
      const contentType = existing?.classification_locked ? (existing.content_type || autoType) : autoType;
      const row: any = videoRow(video, topicId, contentType);
      row.original_topic_id = existing?.original_topic_id || topicId;
      if (existing?.classification_locked) {
        row.content_type = existing.content_type;
        row.classification_locked = true;
      } else {
        row.classification_locked = false;
      }
      const { error } = await db.from('videos').upsert(row, { onConflict: 'youtube_video_id' });
      if (error) throw new Error(error.message);
      synced++;
    } catch (error) {
      skipped++;
      if (errors.length < 10) errors.push(`${item.videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const { data: existingVideos, error: existingVideosError } = await db.from('videos').select('id,youtube_video_id').eq('topic_id', topicId);
  if (existingVideosError) throw new Error(existingVideosError.message);
  for (const video of existingVideos || []) {
    if (!currentVideoIds.has(video.youtube_video_id)) {
      const { error } = await db.from('videos').update({ published: false }).eq('id', video.id);
      if (!error) archived++;
      else if (errors.length < 10) errors.push(`${video.youtube_video_id}: ${error.message}`);
    }
  }

  return {
    playlist: { id: savedTopic.youtube_playlist_id, title: savedTopic.name, description: savedTopic.description || '', topicId: savedTopic.id, topicSlug: savedTopic.slug },
    found: items.length, synced, skipped, archived, errors,
  };
}

export async function syncAllPlaylists() {
  const db = getSupabaseAdmin();
  const { data: topics, error } = await db.from('topics').select('id,name,youtube_playlist_id').not('youtube_playlist_id', 'is', null);
  if (error) throw new Error(error.message);
  const results: Array<{name:string;ok:boolean;summary?:PlaylistSyncSummary;error?:string}> = [];
  for (const topic of topics || []) {
    if (!topic.youtube_playlist_id) continue;
    try { results.push({ name: topic.name, ok: true, summary: await syncPlaylistById(topic.youtube_playlist_id) }); }
    catch (error) { results.push({ name: topic.name, ok: false, error: error instanceof Error ? error.message : 'Playlist sync failed.' }); }
  }
  return results;
}

export async function syncChannelShorts(options: { maxPages?: number } = {}) {
  const db = getSupabaseAdmin();
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!channelId) throw new Error('Missing YOUTUBE_CHANNEL_ID.');

  const channel = await fetchChannel(channelId);
  if (!channel.uploadsPlaylistId) throw new Error('Could not find the channel uploads playlist.');

  const maxPages = options.maxPages ?? 100;
  const items = await fetchPlaylistItems(channel.uploadsPlaylistId, maxPages);
  const videos = await fetchVideosByIds(items.map((x) => x.videoId));

  const { data: shortsTopic, error: topicError } = await db.from('topics').upsert(
    {
      name: 'Shorts',
      slug: 'shorts',
      description: 'Short-form videos from The Simplified Charts.',
    },
    { onConflict: 'slug' }
  ).select('*').single();
  if (topicError || !shortsTopic) throw new Error(topicError?.message || 'Could not create Shorts category.');

  const videoIds = videos.map((v) => v.id);
  const { data: existingRows, error: existingError } = videoIds.length
    ? await db.from('videos').select('id,youtube_video_id,topic_id,original_topic_id,content_type,classification_locked').in('youtube_video_id', videoIds)
    : { data: [], error: null };
  if (existingError) throw new Error(existingError.message);

  const existingByYoutubeId = new Map((existingRows || []).map((row: any) => [row.youtube_video_id, row]));
  const candidates = videos.filter((v) => v.durationSeconds <= shortThresholdSeconds);
  let synced = 0;
  let skipped = 0;
  let newlyClassified = 0;
  const errors: string[] = [];

  for (const video of candidates) {
    try {
      const existing = existingByYoutubeId.get(video.id);
      // A manually locked long video should not be forced into Shorts.
      if (existing?.classification_locked && existing.content_type === 'long') continue;

      const row: any = videoRow(video, existing?.topic_id || shortsTopic.id, 'short');
      row.original_topic_id = existing?.original_topic_id || null;
      row.classification_locked = existing?.classification_locked ?? false;
      if (!existing || existing.content_type !== 'short') newlyClassified++;

      const { error } = await db.from('videos').upsert(row, { onConflict: 'youtube_video_id' });
      if (error) throw new Error(error.message);
      synced++;
    } catch (error) {
      skipped++;
      if (errors.length < 20) errors.push(`${video.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    channel: channel.title,
    scanned: videos.length,
    found: candidates.length,
    synced,
    skipped,
    newlyClassified,
    thresholdSeconds: shortThresholdSeconds,
    errors,
  };
}

export async function syncShortsMetadata() {
  const db = getSupabaseAdmin();
  const { data: shortsTopic, error: topicError } = await db.from('topics').select('id').eq('slug', 'shorts').maybeSingle();
  if (topicError) throw new Error(topicError.message);
  if (!shortsTopic) return { found: 0, synced: 0, skipped: 0, errors: [] as string[] };
  const { data: shorts, error: shortsError } = await db.from('videos').select('id,youtube_video_id').eq('content_type', 'short');
  if (shortsError) throw new Error(shortsError.message);
  let synced = 0; let skipped = 0; const errors: string[] = [];
  for (const row of shorts || []) {
    try {
      const video = await fetchVideo(row.youtube_video_id);
      const { error } = await db.from('videos').update({ title:video.title, description:video.description, thumbnail_url:video.thumbnailUrl, published_at:video.publishedAt, duration_iso:video.durationIso, duration_seconds:video.durationSeconds, channel_id:video.channelId, channel_title:video.channelTitle, tags:video.tags, category_id:video.categoryId, seo_title:video.title, seo_description:video.description?.slice(0,160) }).eq('id', row.id);
      if (error) throw new Error(error.message); synced++;
    } catch (error) { skipped++; if(errors.length<10) errors.push(`${row.youtube_video_id}: ${error instanceof Error ? error.message : 'Unknown error'}`); }
  }
  return { found:(shorts||[]).length, synced, skipped, errors };
}
