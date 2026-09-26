import { getSupabaseAdmin } from '@/lib/supabase';
import {
  fetchChannel,
  fetchPlaylist,
  fetchPlaylistItems,
  fetchVideo,
  fetchVideosByIds,
} from '@/lib/youtube';
import { makeSlug } from '@/lib/slug';
import { submitToIndexNow } from '@/lib/indexnow';

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
  indexNow: Awaited<ReturnType<typeof submitToIndexNow>>;
};

const shortThresholdSeconds = 180;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://www.thesimplifiedcharts.in'
).replace(/\/$/, '');

function videoRow(
  video: any,
  topicId: string,
  contentType: 'long' | 'short'
) {
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

/*
  Normalize values before comparing them.

  This prevents harmless undefined/null differences from
  triggering an unnecessary database update.
*/
function normalizeComparable(value: any): any {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeComparable);
  }

  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};

    for (const key of Object.keys(value).sort()) {
      result[key] = normalizeComparable(value[key]);
    }

    return result;
  }

  return value;
}

function valuesEqual(a: any, b: any): boolean {
  return (
    JSON.stringify(normalizeComparable(a)) ===
    JSON.stringify(normalizeComparable(b))
  );
}

/*
  Fields that are actually written to the videos table.

  If none of these changed, we do NOT perform any UPDATE.
  This is the important part that keeps videos.updated_at
  unchanged during a normal sync.
*/
const VIDEO_DB_FIELDS = [
  'youtube_video_id',
  'slug',
  'title',
  'description',
  'youtube_url',
  'thumbnail_url',
  'published_at',
  'duration_iso',
  'duration_seconds',
  'channel_id',
  'channel_title',
  'tags',
  'category_id',
  'topic_id',
  'content_type',
  'seo_title',
  'seo_description',
  'published',
  'original_topic_id',
  'classification_locked',
] as const;

function getVideoDbChanges(existing: any, row: any): string[] {
  const changedFields: string[] = [];

  for (const field of VIDEO_DB_FIELDS) {
    if (!valuesEqual(existing?.[field], row?.[field])) {
      changedFields.push(field);
    }
  }

  return changedFields;
}

/*
  Keep IndexNow behavior aligned with the previous implementation.

  IMPORTANT:
  We intentionally keep the same "important fields" here instead
  of changing which events trigger IndexNow.
*/
function getIndexNowChangedFields(existing: any, row: any): string[] {
  const changedFields: string[] = [];

  if (!existing) {
    changedFields.push('new');
    return changedFields;
  }

  if (existing.slug !== row.slug) {
    changedFields.push('slug');
  }

  if (existing.title !== row.title) {
    changedFields.push('title');
  }

  if (existing.description !== row.description) {
    changedFields.push('description');
  }

  if (existing.thumbnail_url !== row.thumbnail_url) {
    changedFields.push('thumbnail_url');
  }

  if (existing.published_at !== row.published_at) {
    changedFields.push('published_at');
  }

  if (existing.duration_iso !== row.duration_iso) {
    changedFields.push('duration_iso');
  }

  if (existing.duration_seconds !== row.duration_seconds) {
    changedFields.push('duration_seconds');
  }

  if (existing.topic_id !== row.topic_id) {
    changedFields.push('topic_id');
  }

  if (existing.content_type !== row.content_type) {
    changedFields.push('content_type');
  }

  if (existing.published !== row.published) {
    changedFields.push('published');
  }

  return changedFields;
}

async function saveVideoWithoutTouchingUnchangedRows(
  db: ReturnType<typeof getSupabaseAdmin>,
  existing: any,
  row: any
) {
  if (!existing) {
    const { data, error } = await db
      .from('videos')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      action: 'inserted' as const,
      data,
      changedFields: ['new'],
    };
  }

  const changedFields = getVideoDbChanges(existing, row);

  /*
    Nothing changed.

    Do NOT update/upsert.
    This preserves videos.updated_at.
  */
  if (changedFields.length === 0) {
    return {
      action: 'unchanged' as const,
      data: existing,
      changedFields: [] as string[],
    };
  }

  const { data, error } = await db
    .from('videos')
    .update(row)
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    action: 'updated' as const,
    data,
    changedFields,
  };
}

export async function syncPlaylistById(
  playlistId: string
): Promise<PlaylistSyncSummary> {
  const playlist = await fetchPlaylist(playlistId);
  const items = await fetchPlaylistItems(playlistId, 100);
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
      throw new Error(
        error?.message || 'Could not update playlist category.'
      );
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
      throw new Error(
        error?.message || 'Could not create playlist category.'
      );
    }

    topicId = data.id;
    savedTopic = data;
  }

  const currentVideoIds = new Set(items.map((x) => x.videoId));

  let synced = 0;
  let skipped = 0;
  let archived = 0;

  const errors: string[] = [];
  const indexNowUrls = new Set<string>();

  const ids = items.map((x) => x.videoId);

  const fetched = new Map(
    (await fetchVideosByIds(ids)).map((v) => [v.id, v])
  );

  for (const item of items) {
    const video = fetched.get(item.videoId);

    if (!video) {
      skipped++;

      if (errors.length < 10) {
        errors.push(
          `${item.videoId}: Video not returned by YouTube.`
        );
      }

      continue;
    }

    try {
      /*
        Playlist membership is the source of truth for the playlist.
        Auto short classification is only applied when the video
        has not been manually overridden.
      */
      const { data: existing, error: existingError } = await db
        .from('videos')
        .select(
          'id,youtube_video_id,classification_locked,content_type,original_topic_id,slug,title,description,youtube_url,thumbnail_url,published_at,duration_iso,duration_seconds,channel_id,channel_title,tags,category_id,topic_id,seo_title,seo_description,published'
        )
        .eq('youtube_video_id', video.id)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message);
      }

      const autoType: 'short' | 'long' =
        video.durationSeconds <= shortThresholdSeconds
          ? 'short'
          : 'long';

      const contentType = existing?.classification_locked
        ? existing.content_type || autoType
        : autoType;

      const row: any = videoRow(
        video,
        topicId,
        contentType
      );

      row.original_topic_id =
        existing?.original_topic_id || topicId;

      if (existing?.classification_locked) {
        row.content_type = existing.content_type;
        row.classification_locked = true;
      } else {
        row.classification_locked = false;
      }

      /*
        Keep the existing IndexNow decision logic.
      */
      const indexNowChangedFields =
        getIndexNowChangedFields(existing, row);

      const shouldNotifyIndexNow =
        indexNowChangedFields.length > 0;

      /*
        INSERT only if new.
        UPDATE only if something really changed.
        NO WRITE if unchanged.
      */
      const saveResult =
        await saveVideoWithoutTouchingUnchangedRows(
          db,
          existing,
          row
        );

      synced++;

      if (shouldNotifyIndexNow) {
        indexNowUrls.add(
          `${SITE_URL}/videos/${row.slug}`
        );
      }

      /*
        Optional diagnostic logging for actual DB changes.
        This helps us verify the fix in Vercel logs.
      */
      if (saveResult.action === 'updated') {
        console.info('[VideoSync] Video updated', {
          youtubeVideoId: video.id,
          slug: row.slug,
          changedFields: saveResult.changedFields,
        });
      } else if (saveResult.action === 'inserted') {
        console.info('[VideoSync] New video inserted', {
          youtubeVideoId: video.id,
          slug: row.slug,
        });
      }
    } catch (error) {
      skipped++;

      if (errors.length < 10) {
        errors.push(
          `${item.videoId}: ${
            error instanceof Error
              ? error.message
              : 'Unknown error'
          }`
        );
      }
    }
  }

  /*
    Archive videos that are no longer present in the playlist.

    This IS a real content/state change, so the DB update should
    happen and updated_at is expected to change.
  */
  const {
    data: existingVideos,
    error: existingVideosError,
  } = await db
    .from('videos')
    .select('id,youtube_video_id')
    .eq('topic_id', topicId);

  if (existingVideosError) {
    throw new Error(existingVideosError.message);
  }

  for (const video of existingVideos || []) {
    if (!currentVideoIds.has(video.youtube_video_id)) {
      const { error } = await db
        .from('videos')
        .update({ published: false })
        .eq('id', video.id);

      if (!error) {
        archived++;
      } else if (errors.length < 10) {
        errors.push(
          `${video.youtube_video_id}: ${error.message}`
        );
      }
    }
  }

  /*
    IndexNow is best-effort. A notification failure must not
    break the successful YouTube/Supabase sync.
  */
  const indexNow = await submitToIndexNow(
    Array.from(indexNowUrls)
  );

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
    indexNow,
  };
}

export async function syncAllPlaylists() {
  const db = getSupabaseAdmin();

  const { data: topics, error } = await db
    .from('topics')
    .select('id,name,youtube_playlist_id')
    .not('youtube_playlist_id', 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  const results: Array<{
    name: string;
    ok: boolean;
    summary?: PlaylistSyncSummary;
    error?: string;
  }> = [];

  for (const topic of topics || []) {
    if (!topic.youtube_playlist_id) {
      continue;
    }

    try {
      results.push({
        name: topic.name,
        ok: true,
        summary: await syncPlaylistById(
          topic.youtube_playlist_id
        ),
      });
    } catch (error) {
      results.push({
        name: topic.name,
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Playlist sync failed.',
      });
    }
  }

  return results;
}

export async function syncChannelShorts(
  options: { maxPages?: number } = {}
) {
  const db = getSupabaseAdmin();
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!channelId) {
    throw new Error('Missing YOUTUBE_CHANNEL_ID.');
  }

  const channel = await fetchChannel(channelId);

  if (!channel.uploadsPlaylistId) {
    throw new Error(
      'Could not find the channel uploads playlist.'
    );
  }

  const maxPages = options.maxPages ?? 100;

  const items = await fetchPlaylistItems(
    channel.uploadsPlaylistId,
    maxPages
  );

  const videos = await fetchVideosByIds(
    items.map((x) => x.videoId)
  );

  const {
    data: shortsTopic,
    error: topicError,
  } = await db
    .from('topics')
    .upsert(
      {
        name: 'Shorts',
        slug: 'shorts',
        description:
          'Short-form videos from The Simplified Charts.',
      },
      { onConflict: 'slug' }
    )
    .select('*')
    .single();

  if (topicError || !shortsTopic) {
    throw new Error(
      topicError?.message ||
        'Could not create Shorts category.'
    );
  }

  const videoIds = videos.map((v) => v.id);

  const {
    data: existingRows,
    error: existingError,
  } =
    videoIds.length
      ? await db
          .from('videos')
          .select(
            'id,youtube_video_id,topic_id,original_topic_id,content_type,classification_locked,slug,title,description,youtube_url,thumbnail_url,published_at,duration_iso,duration_seconds,channel_id,channel_title,tags,category_id,seo_title,seo_description,published'
          )
          .in('youtube_video_id', videoIds)
      : { data: [], error: null };

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingByYoutubeId = new Map(
    (existingRows || []).map((row: any) => [
      row.youtube_video_id,
      row,
    ])
  );

  const candidates = videos.filter(
    (v) => v.durationSeconds <= shortThresholdSeconds
  );

  let synced = 0;
  let skipped = 0;
  let newlyClassified = 0;

  const errors: string[] = [];
  const indexNowUrls = new Set<string>();

  for (const video of candidates) {
    try {
      const existing =
        existingByYoutubeId.get(video.id);

      /*
        A manually locked long video should not be forced
        into Shorts.
      */
      if (
        existing?.classification_locked &&
        existing.content_type === 'long'
      ) {
        continue;
      }

      const row: any = videoRow(
        video,
        existing?.topic_id || shortsTopic.id,
        'short'
      );

      row.original_topic_id =
        existing?.original_topic_id || null;

      row.classification_locked =
        existing?.classification_locked ?? false;

      if (
        !existing ||
        existing.content_type !== 'short'
      ) {
        newlyClassified++;
      }

      /*
        Keep the existing IndexNow decision logic.
      */
      const indexNowChangedFields =
        getIndexNowChangedFields(existing, row);

      const shouldNotifyIndexNow =
        indexNowChangedFields.length > 0;

      /*
        INSERT / UPDATE / NO WRITE.
      */
      const saveResult =
        await saveVideoWithoutTouchingUnchangedRows(
          db,
          existing,
          row
        );

      synced++;

      if (shouldNotifyIndexNow) {
        indexNowUrls.add(
          `${SITE_URL}/videos/${row.slug}`
        );
      }

      if (saveResult.action === 'updated') {
        console.info('[ShortsSync] Video updated', {
          youtubeVideoId: video.id,
          slug: row.slug,
          changedFields: saveResult.changedFields,
        });
      } else if (saveResult.action === 'inserted') {
        console.info('[ShortsSync] New Short inserted', {
          youtubeVideoId: video.id,
          slug: row.slug,
        });
      }
    } catch (error) {
      skipped++;

      if (errors.length < 20) {
        errors.push(
          `${video.id}: ${
            error instanceof Error
              ? error.message
              : 'Unknown error'
          }`
        );
      }
    }
  }

  /*
    IndexNow is best-effort. A notification failure must not
    break the successful YouTube/Supabase sync.
  */
  const indexNow = await submitToIndexNow(
    Array.from(indexNowUrls)
  );

  return {
    channel: channel.title,
    scanned: videos.length,
    found: candidates.length,
    synced,
    skipped,
    newlyClassified,
    thresholdSeconds: shortThresholdSeconds,
    errors,
    indexNow,
  };
}

export async function syncShortsMetadata() {
  const db = getSupabaseAdmin();

  const {
    data: shortsTopic,
    error: topicError,
  } = await db
    .from('topics')
    .select('id')
    .eq('slug', 'shorts')
    .maybeSingle();

  if (topicError) {
    throw new Error(topicError.message);
  }

  if (!shortsTopic) {
    return {
      found: 0,
      synced: 0,
      skipped: 0,
      errors: [] as string[],
    };
  }

  /*
    Fetch current metadata as well, so an unchanged Short
    is not updated unnecessarily.
  */
  const {
    data: shorts,
    error: shortsError,
  } = await db
    .from('videos')
    .select(
      'id,youtube_video_id,title,description,thumbnail_url,published_at,duration_iso,duration_seconds,channel_id,channel_title,tags,category_id,seo_title,seo_description'
    )
    .eq('content_type', 'short');

  if (shortsError) {
    throw new Error(shortsError.message);
  }

  let synced = 0;
  let skipped = 0;

  const errors: string[] = [];

  for (const row of shorts || []) {
    try {
      const video = await fetchVideo(
        row.youtube_video_id
      );

      const nextValues = {
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
        seo_description:
          video.description?.slice(0, 160),
      };

      /*
        Only update if at least one metadata field actually changed.
      */
      const metadataChanged =
        !valuesEqual(
          row.title,
          nextValues.title
        ) ||
        !valuesEqual(
          row.description,
          nextValues.description
        ) ||
        !valuesEqual(
          row.thumbnail_url,
          nextValues.thumbnail_url
        ) ||
        !valuesEqual(
          row.published_at,
          nextValues.published_at
        ) ||
        !valuesEqual(
          row.duration_iso,
          nextValues.duration_iso
        ) ||
        !valuesEqual(
          row.duration_seconds,
          nextValues.duration_seconds
        ) ||
        !valuesEqual(
          row.channel_id,
          nextValues.channel_id
        ) ||
        !valuesEqual(
          row.channel_title,
          nextValues.channel_title
        ) ||
        !valuesEqual(
          row.tags,
          nextValues.tags
        ) ||
        !valuesEqual(
          row.category_id,
          nextValues.category_id
        ) ||
        !valuesEqual(
          row.seo_title,
          nextValues.seo_title
        ) ||
        !valuesEqual(
          row.seo_description,
          nextValues.seo_description
        );

      if (!metadataChanged) {
        /*
          No DB UPDATE.
          updated_at remains unchanged.
        */
        synced++;
        continue;
      }

      const { error } = await db
        .from('videos')
        .update(nextValues)
        .eq('id', row.id);

      if (error) {
        throw new Error(error.message);
      }

      synced++;

      console.info(
        '[ShortsMetadata] Metadata updated',
        {
          youtubeVideoId:
            row.youtube_video_id,
        }
      );
    } catch (error) {
      skipped++;

      if (errors.length < 10) {
        errors.push(
          `${row.youtube_video_id}: ${
            error instanceof Error
              ? error.message
              : 'Unknown error'
          }`
        );
      }
    }
  }

  return {
    found: (shorts || []).length,
    synced,
    skipped,
    errors,
  };
}
