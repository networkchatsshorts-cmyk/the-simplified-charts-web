import { getSupabaseAdmin } from '@/lib/supabase';
import {
  fetchChannel,
  fetchPlaylist,
  fetchPlaylistItems,
  fetchVideo,
  fetchVideosByIds,
} from '@/lib/youtube';
import { makeSlug } from '@/lib/slug';
import { recordVideoSlugHistory } from '@/lib/video-slug-history';

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
  updated: number;
  unchanged: number;
  skipped: number;
  archived: number;
  errors: string[];
};

const shortThresholdSeconds = 180;

const VIDEO_COMPARE_FIELDS = [
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
  'published',
] as const;

function normalizeComparable(
  field: string,
  value: any
): any {
  if (value === undefined) return null;
  if (value === null) return null;

  if (
    field === 'published_at' ||
    field === 'created_at' ||
    field === 'updated_at'
  ) {
    const timestamp = new Date(value).getTime();

    return Number.isNaN(timestamp)
      ? String(value)
      : timestamp;
  }

  if (
    field === 'duration_seconds' ||
    field === 'published'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const normalized = value.map((item) =>
      normalizeComparable('array_item', item)
    );

    return [...normalized].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [
        key,
        normalizeComparable(key, item),
      ]);

    return Object.fromEntries(entries);
  }

  return value;
}

function valuesEqual(
  field: string,
  a: any,
  b: any
) {
  return (
    JSON.stringify(
      normalizeComparable(field, a)
    ) ===
    JSON.stringify(
      normalizeComparable(field, b)
    )
  );
}

function getChangedFields(
  existing: any,
  nextRow: any
): string[] {
  if (!existing) {
    return ['new'];
  }

  return VIDEO_COMPARE_FIELDS.filter(
    (field) =>
      Object.prototype.hasOwnProperty.call(nextRow, field) &&
      !valuesEqual(
        field,
        existing[field],
        nextRow[field]
      )
  );
}

/**
 * The video's permanent baseline timestamp.
 *
 * For a new video we use the actual YouTube published time.
 * This becomes created_at and the initial updated_at value.
 */
function originalVideoTimestamp(
  publishedAt: any
) {
  if (publishedAt) {
    const parsed = new Date(publishedAt);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

/**
 * Insert a new video or update only fields that actually changed.
 *
 * Important:
 * - Unchanged video => NO UPDATE query.
 * - New video => created_at = YouTube published_at.
 * - Real update => do NOT send created_at or updated_at.
 *   The database updated_at trigger should set updated_at.
 */
export async function saveVideoWithoutTouchingUnchangedRows(
  db: any,
  nextRow: any,
  existing: any | null
) {
  const changedFields = getChangedFields(
    existing,
    nextRow
  );

  if (!existing) {
    const createdTimestamp =
      originalVideoTimestamp(
        nextRow.published_at
      );

    const insertRow = {
      ...nextRow,
      created_at: createdTimestamp,
      updated_at: createdTimestamp,
    };

    const { data, error } = await db
      .from('videos')
      .insert(insertRow)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ||
          'Could not insert video.'
      );
    }

    return {
      data,
      changedFields,
      isNew: true,
    };
  }

  if (changedFields.length === 0) {
    return {
      data: existing,
      changedFields: [],
      isNew: false,
    };
  }

  const updatePayload: Record<
    string,
    any
  > = {};

  for (const field of changedFields) {
    updatePayload[field] =
      nextRow[field];
  }

  // IMPORTANT:
  // Do not send created_at or updated_at here.
  // Only a real UPDATE should move updated_at.
  const { data, error } = await db
    .from('videos')
    .update(updatePayload)
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ||
        'Could not update video.'
    );
  }

  return {
    data,
    changedFields,
    isNew: false,
  };
}

function videoRow(
  video: any,
  topicId: string | null,
  contentType: 'long' | 'short'
) {
  return {
    youtube_video_id: video.id,
    slug: makeSlug(
      video.title,
      video.id
    ),
    title: video.title,
    description:
      video.description ?? null,
    youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
    thumbnail_url:
      video.thumbnailUrl ?? null,
    published_at:
      video.publishedAt ?? null,
    duration_iso:
      video.durationIso ?? null,
    duration_seconds:
      video.durationSeconds ?? null,
    channel_id:
      video.channelId ?? null,
    channel_title:
      video.channelTitle ?? null,
    tags: video.tags ?? [],
    category_id:
      video.categoryId ?? null,
    topic_id: topicId,
    content_type: contentType,
    published: true,

    // SEO/editorial fields are intentionally omitted here.
    // They are managed by the admin and must never be overwritten
    // by YouTube playlist/channel syncs.
  };
}

async function getExistingVideo(
  db: any,
  videoId: string
) {
  const {
    data,
    error,
  } = await db
    .from('videos')
    .select(
      'id,youtube_video_id,slug,title,description,youtube_url,thumbnail_url,published_at,duration_iso,duration_seconds,channel_id,channel_title,tags,category_id,topic_id,content_type,seo_title,seo_description,key_points,published,original_topic_id,classification_locked'
    )
    .eq(
      'youtube_video_id',
      videoId
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function syncVideoById(
  videoId: string,
  topicId?: string | null
) {
  const video = await fetchVideo(
    videoId
  );

  const db = getSupabaseAdmin();

  const existing =
    await getExistingVideo(
      db,
      video.id
    );

  const resolvedTopicId =
    existing?.topic_id ||
    topicId ||
    null;

  if (
    !existing &&
    !resolvedTopicId
  ) {
    throw new Error(
      'This video is not in the database yet. Select a playlist/category before syncing it.'
    );
  }

  const autoType: 'short' | 'long' =
    video.durationSeconds <=
    shortThresholdSeconds
      ? 'short'
      : 'long';

  const contentType =
    existing?.classification_locked
      ? existing.content_type ||
        autoType
      : autoType;

  const row: any =
    videoRow(
      video,
      resolvedTopicId,
      contentType
    );

  row.original_topic_id =
    existing?.original_topic_id ||
    resolvedTopicId;

  row.classification_locked =
    existing?.classification_locked ??
    false;

  row.key_points =
    existing?.key_points ?? [];

  if (
    existing?.classification_locked
  ) {
    row.content_type =
      existing.content_type ||
      autoType;
  }

  const changedFields =
    getChangedFields(
      existing,
      row
    );

  const slugChanged =
    !!existing &&
    existing.slug !== row.slug;

  if (slugChanged) {
    await recordVideoSlugHistory(
      db,
      existing.id,
      existing.slug,
      row.slug
    );
  }

  const saved =
    await saveVideoWithoutTouchingUnchangedRows(
      db,
      row,
      existing
    );

  console.info(
    changedFields.length
      ? '[Video Sync] Video updated/inserted'
      : '[Video Sync] Video unchanged',
    {
      youtubeVideoId: video.id,
      title: row.title,
      changedFields,
    }
  );

  return {
    ok: true,
    video: saved.data,
    changed:
      changedFields.length > 0,
    changedFields,
    slugChanged,
    previousSlug:
      slugChanged
        ? existing.slug
        : null,
  };
}

async function getOrCreateTopic(
  db: any,
  playlist: any
) {
  const topicSlug = makeSlug(
    playlist.title,
    playlist.id
  );

  const {
    data: existingTopic,
    error: topicLookupError,
  } = await db
    .from('topics')
    .select('*')
    .eq(
      'youtube_playlist_id',
      playlist.id
    )
    .maybeSingle();

  if (topicLookupError) {
    throw new Error(
      topicLookupError.message
    );
  }

  // Explicit Record type prevents the TS7053
  // dynamic string indexing error.
  const topicRow: Record<
    string,
    any
  > = {
    name: playlist.title,
    slug: topicSlug,
    description:
      playlist.description ?? null,
    youtube_playlist_id:
      playlist.id,
    youtube_playlist_url: `https://www.youtube.com/playlist?list=${playlist.id}`,
  };

  if (!existingTopic) {
    const {
      data,
      error,
    } = await db
      .from('topics')
      .upsert(
        topicRow,
        {
          onConflict: 'slug',
        }
      )
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ||
          'Could not create playlist category.'
      );
    }

    return data;
  }

  const changedTopicFields =
    [
      'name',
      'slug',
      'description',
      'youtube_playlist_id',
      'youtube_playlist_url',
    ].filter(
      (field) =>
        !valuesEqual(
          field,
          existingTopic[field],
          topicRow[field]
        )
    );

  if (
    changedTopicFields.length === 0
  ) {
    return existingTopic;
  }

  const updatePayload: Record<
    string,
    any
  > = {};

  for (
    const field of changedTopicFields
  ) {
    updatePayload[field] =
      topicRow[field];
  }

  const {
    data,
    error,
  } = await db
    .from('topics')
    .update(updatePayload)
    .eq(
      'id',
      existingTopic.id
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ||
        'Could not update playlist category.'
    );
  }

  return data;
}

export async function syncPlaylistById(
  playlistId: string
): Promise<PlaylistSyncSummary> {
  const playlist =
    await fetchPlaylist(
      playlistId
    );

  const items =
    await fetchPlaylistItems(
      playlistId,
      100
    );

  const db =
    getSupabaseAdmin();

  const savedTopic =
    await getOrCreateTopic(
      db,
      playlist
    );

  const topicId =
    savedTopic.id;

  const currentVideoIds =
    new Set(
      items.map(
        (x) => x.videoId
      )
    );

  let synced = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let archived = 0;

  const errors: string[] = [];

  const ids = items.map(
    (x) => x.videoId
  );

  const fetched =
    new Map(
      (
        await fetchVideosByIds(
          ids
        )
      ).map(
        (v) => [v.id, v]
      )
    );

  for (
    const item of items
  ) {
    const video =
      fetched.get(
        item.videoId
      );

    if (!video) {
      skipped++;

      if (
        errors.length < 10
      ) {
        errors.push(
          `${item.videoId}: Video not returned by YouTube.`
        );
      }

      continue;
    }

    try {
      const existing =
        await getExistingVideo(
          db,
          video.id
        );

      const autoType: 'short' | 'long' =
        video.durationSeconds <=
        shortThresholdSeconds
          ? 'short'
          : 'long';

      const contentType =
        existing?.classification_locked
          ? existing.content_type ||
            autoType
          : autoType;

      const row: any =
        videoRow(
          video,
          topicId,
          contentType
        );

      // Preserve site-managed classification/bookkeeping.
      row.original_topic_id =
        existing?.original_topic_id ||
        topicId;

      row.classification_locked =
        existing?.classification_locked ??
        false;

      row.key_points =
        existing?.key_points ?? [];

      if (
        existing?.classification_locked
      ) {
        row.content_type =
          existing.content_type ||
          autoType;
      }

      const changedFields =
        getChangedFields(
          existing,
          row
        );

      // Absolutely no UPDATE for an unchanged video.
      if (
        existing &&
        changedFields.length === 0
      ) {
        unchanged++;
        synced++;

        console.info(
          '[Playlist Sync] Video unchanged',
          {
            youtubeVideoId:
              video.id,
            title:
              video.title,
          }
        );

        continue;
      }

      // Preserve old URL -> new URL redirect history.
      if (
        existing &&
        existing.slug !==
          row.slug
      ) {
        await recordVideoSlugHistory(
          db,
          existing.id,
          existing.slug,
          row.slug
        );
      }

      await saveVideoWithoutTouchingUnchangedRows(
        db,
        row,
        existing
      );

      synced++;
      updated++;

      console.info(
        '[Playlist Sync] Video updated/inserted',
        {
          youtubeVideoId:
            video.id,
          title:
            video.title,
          changedFields,
        }
      );
    } catch (
      error
    ) {
      skipped++;

      if (
        errors.length < 10
      ) {
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

  // Archive videos that are no longer present
  // in the current playlist.
  const {
    data: existingVideos,
    error: existingVideosError,
  } = await db
    .from('videos')
    .select(
      'id,youtube_video_id,published'
    )
    .eq(
      'topic_id',
      topicId
    );

  if (existingVideosError) {
    throw new Error(
      existingVideosError.message
    );
  }

  for (
    const video of existingVideos ||
    []
  ) {
    if (
      !currentVideoIds.has(
        video.youtube_video_id
      ) &&
      video.published
    ) {
      const {
        error,
      } = await db
        .from('videos')
        .update({
          published: false,
        })
        .eq(
          'id',
          video.id
        );

      if (!error) {
        archived++;
      } else if (
        errors.length < 10
      ) {
        errors.push(
          `${video.youtube_video_id}: ${error.message}`
        );
      }
    }
  }

  return {
    playlist: {
      id:
        savedTopic.youtube_playlist_id,
      title:
        savedTopic.name,
      description:
        savedTopic.description ||
        '',
      topicId:
        savedTopic.id,
      topicSlug:
        savedTopic.slug,
    },
    found:
      items.length,
    synced,
    updated,
    unchanged,
    skipped,
    archived,
    errors,
  };
}

export async function syncAllPlaylists() {
  const db =
    getSupabaseAdmin();

  const {
    data: topics,
    error,
  } = await db
    .from('topics')
    .select(
      'id,name,youtube_playlist_id'
    )
    .not(
      'youtube_playlist_id',
      'is',
      null
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const results: Array<{
    name: string;
    ok: boolean;
    summary?: PlaylistSyncSummary;
    error?: string;
  }> = [];

  for (
    const topic of topics || []
  ) {
    if (
      !topic.youtube_playlist_id
    ) {
      continue;
    }

    try {
      results.push({
        name: topic.name,
        ok: true,
        summary:
          await syncPlaylistById(
            topic.youtube_playlist_id
          ),
      });
    } catch (
      error
    ) {
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

async function getShortsTopic(
  db: any
) {
  const {
    data: existing,
    error: lookupError,
  } = await db
    .from('topics')
    .select('*')
    .eq(
      'slug',
      'shorts'
    )
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      lookupError.message
    );
  }

  if (existing) {
    return existing;
  }

  const {
    data,
    error,
  } = await db
    .from('topics')
    .insert({
      name: 'Shorts',
      slug: 'shorts',
      description:
        'Short-form videos from The Simplified Charts.',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ||
        'Could not create Shorts category.'
    );
  }

  return data;
}

export async function syncChannelShorts(
  options: {
    maxPages?: number;
  } = {}
) {
  const db =
    getSupabaseAdmin();

  const channelId =
    process.env
      .YOUTUBE_CHANNEL_ID;

  if (!channelId) {
    throw new Error(
      'Missing YOUTUBE_CHANNEL_ID.'
    );
  }

  const channel =
    await fetchChannel(
      channelId
    );

  if (
    !channel.uploadsPlaylistId
  ) {
    throw new Error(
      'Could not find the channel uploads playlist.'
    );
  }

  const maxPages =
    options.maxPages ??
    100;

  const items =
    await fetchPlaylistItems(
      channel.uploadsPlaylistId,
      maxPages
    );

  const videos =
    await fetchVideosByIds(
      items.map(
        (x) => x.videoId
      )
    );

  const shortsTopic =
    await getShortsTopic(
      db
    );

  const videoIds =
    videos.map(
      (v) => v.id
    );

  const {
    data: existingRows,
    error: existingError,
  } = videoIds.length
    ? await db
        .from('videos')
        .select(
          'id,youtube_video_id,slug,title,description,youtube_url,thumbnail_url,published_at,duration_iso,duration_seconds,channel_id,channel_title,tags,category_id,topic_id,content_type,seo_title,seo_description,key_points,published,original_topic_id,classification_locked'
        )
        .in(
          'youtube_video_id',
          videoIds
        )
    : {
        data: [],
        error: null,
      };

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  const existingByYoutubeId =
    new Map(
      (existingRows ||
        []
      ).map(
        (row: any) => [
          row.youtube_video_id,
          row,
        ]
      )
    );

  const candidates =
    videos.filter(
      (v) =>
        v.durationSeconds <=
        shortThresholdSeconds
    );

  let synced = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let newlyClassified = 0;

  const errors: string[] = [];

  for (
    const video of candidates
  ) {
    try {
      const existing =
        existingByYoutubeId.get(
          video.id
        );

      // A manually locked long video
      // should not be forced into Shorts.
      if (
        existing?.classification_locked &&
        existing.content_type ===
          'long'
      ) {
        continue;
      }

      const row: any =
        videoRow(
          video,
          existing?.topic_id ||
            shortsTopic.id,
          'short'
        );

      row.original_topic_id =
        existing?.original_topic_id ||
        null;

      row.classification_locked =
        existing?.classification_locked ??
        false;

      row.key_points =
        existing?.key_points ?? [];

      if (
        !existing ||
        existing.content_type !==
          'short'
      ) {
        newlyClassified++;
      }

      const changedFields =
        getChangedFields(
          existing,
          row
        );

      // No database write for unchanged Shorts.
      if (
        existing &&
        changedFields.length === 0
      ) {
        unchanged++;
        synced++;
        continue;
      }

      if (
        existing &&
        existing.slug !==
          row.slug
      ) {
        await recordVideoSlugHistory(
          db,
          existing.id,
          existing.slug,
          row.slug
        );
      }

      await saveVideoWithoutTouchingUnchangedRows(
        db,
        row,
        existing
      );

      synced++;
      updated++;
    } catch (
      error
    ) {
      skipped++;

      if (
        errors.length < 20
      ) {
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

  return {
    channel:
      channel.title,
    scanned:
      videos.length,
    found:
      candidates.length,
    synced,
    updated,
    unchanged,
    skipped,
    newlyClassified,
    thresholdSeconds:
      shortThresholdSeconds,
    errors,
  };
}

export async function syncShortsMetadata() {
  const db =
    getSupabaseAdmin();

  const {
    data: shortsTopic,
    error: topicError,
  } = await db
    .from('topics')
    .select('id')
    .eq(
      'slug',
      'shorts'
    )
    .maybeSingle();

  if (topicError) {
    throw new Error(
      topicError.message
    );
  }

  if (!shortsTopic) {
    return {
      found: 0,
      synced: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      errors:
        [] as string[],
    };
  }

  const {
    data: shorts,
    error: shortsError,
  } = await db
    .from('videos')
    .select(
      'id,youtube_video_id,slug,title,description,youtube_url,thumbnail_url,published_at,duration_iso,duration_seconds,channel_id,channel_title,tags,category_id,topic_id,content_type,seo_title,seo_description,key_points,published,original_topic_id,classification_locked'
    )
    .eq(
      'content_type',
      'short'
    );

  if (shortsError) {
    throw new Error(
      shortsError.message
    );
  }

  let synced = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  const errors: string[] = [];

  for (
    const existing of shorts ||
    []
  ) {
    try {
      const video =
        await fetchVideo(
          existing.youtube_video_id
        );

      const row: any =
        videoRow(
          video,
          existing.topic_id,
          existing.content_type
        );

      row.original_topic_id =
        existing.original_topic_id ??
        existing.topic_id;

      row.classification_locked =
        existing.classification_locked ??
        false;

      row.key_points =
        existing.key_points ?? [];

      const changedFields =
        getChangedFields(
          existing,
          row
        );

      if (
        changedFields.length === 0
      ) {
        unchanged++;
        synced++;
        continue;
      }

      if (
        existing.slug !==
        row.slug
      ) {
        await recordVideoSlugHistory(
          db,
          existing.id,
          existing.slug,
          row.slug
        );
      }

      await saveVideoWithoutTouchingUnchangedRows(
        db,
        row,
        existing
      );

      synced++;
      updated++;
    } catch (
      error
    ) {
      skipped++;

      if (
        errors.length < 10
      ) {
        errors.push(
          `${existing.youtube_video_id}: ${
            error instanceof Error
              ? error.message
              : 'Unknown error'
          }`
        );
      }
    }
  }

  return {
    found:
      (shorts || []).length,
    synced,
    updated,
    unchanged,
    skipped,
    errors,
  };
}
