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
  topicId: string | null,
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
  ------------------------------------------------------------
  VALUE NORMALIZATION
  ------------------------------------------------------------

  Important:
  Supabase/Postgres and YouTube can represent the same value
  slightly differently.

  Example:
    2026-09-14T18:22:46.181Z
    2026-09-14T18:22:46.181+00:00

  These represent the same instant.

  We normalize date/number/tag values before comparing them,
  so harmless formatting differences do NOT create a DB UPDATE.
*/
function normalizeComparable(
  field: string,
  value: any
): any {
  if (value === undefined || value === null) {
    return null;
  }

  if (field === 'published_at') {
    const time = new Date(
      String(value)
    ).getTime();

    return Number.isNaN(time)
      ? String(value)
      : time;
  }

  if (field === 'duration_seconds') {
    const numeric = Number(value);

    return Number.isNaN(numeric)
      ? value
      : numeric;
  }

  if (field === 'tags') {
    if (!Array.isArray(value)) {
      return value;
    }

    return value
      .map((tag) => String(tag))
      .sort();
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      normalizeComparable('', item)
    );
  }

  if (
    typeof value === 'object' &&
    value !== null
  ) {
    const result: Record<string, any> = {};

    for (const key of Object.keys(value).sort()) {
      result[key] =
        normalizeComparable(
          key,
          value[key]
        );
    }

    return result;
  }

  return value;
}

function valuesEqual(
  field: string,
  a: any,
  b: any
): boolean {
  return (
    JSON.stringify(
      normalizeComparable(field, a)
    ) ===
    JSON.stringify(
      normalizeComparable(field, b)
    )
  );
}

/*
  ------------------------------------------------------------
  VIDEO DB FIELDS
  ------------------------------------------------------------

  These are the fields controlled by YouTube sync.
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

/*
  ------------------------------------------------------------
  INDEXNOW FIELDS
  ------------------------------------------------------------

  Only changes that can affect the actual public video page
  should trigger IndexNow.

  Internal bookkeeping fields such as:
    - original_topic_id
    - classification_locked

  must NOT trigger IndexNow.
*/
const INDEXNOW_FIELDS = [
  'slug',
  'title',
  'description',
  'thumbnail_url',
  'published_at',
  'duration_iso',
  'duration_seconds',
  'topic_id',
  'content_type',
  'published',
  'seo_title',
  'seo_description',
] as const;

/*
  ------------------------------------------------------------
  DATABASE CHANGE DETECTION
  ------------------------------------------------------------
*/
function getVideoDbChanges(
  existing: any,
  row: any
): string[] {
  const changedFields: string[] = [];

  for (
    const field of VIDEO_DB_FIELDS
  ) {
    if (
      !valuesEqual(
        field,
        existing?.[field],
        row?.[field]
      )
    ) {
      changedFields.push(field);
    }
  }

  return changedFields;
}

/*
  ------------------------------------------------------------
  INDEXNOW CHANGE DETECTION
  ------------------------------------------------------------
*/
function getIndexNowChangedFields(
  existing: any,
  row: any
): string[] {
  const changedFields: string[] = [];

  if (!existing) {
    return ['new'];
  }

  for (
    const field of INDEXNOW_FIELDS
  ) {
    if (
      !valuesEqual(
        field,
        existing?.[field],
        row?.[field]
      )
    ) {
      changedFields.push(field);
    }
  }

  return changedFields;
}

/*
  ------------------------------------------------------------
  SAVE VIDEO WITHOUT TOUCHING UNCHANGED ROWS
  ------------------------------------------------------------

  NEW:
    INSERT

  CHANGED:
    UPDATE only changed fields

  UNCHANGED:
    NO DATABASE WRITE
*/
async function saveVideoWithoutTouchingUnchangedRows(
  db: ReturnType<typeof getSupabaseAdmin>,
  existing: any,
  row: any
) {
  if (!existing) {
    const {
      data,
      error,
    } = await db
      .from('videos')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      throw new Error(
        error.message
      );
    }

    return {
      action: 'inserted' as const,
      data,
      changedFields: ['new'],
    };
  }

  const changedFields =
    getVideoDbChanges(
      existing,
      row
    );

  /*
    Absolutely nothing changed.
    Do not touch the row.
  */
  if (
    changedFields.length === 0
  ) {
    return {
      action: 'unchanged' as const,
      data: existing,
      changedFields: [] as string[],
    };
  }

  /*
    Update ONLY fields that actually changed.

    This is safer than sending the whole row back to
    Postgres on every sync.
  */
  const updatePayload: Record<
    string,
    any
  > = {};

  for (
    const field of changedFields
  ) {
    updatePayload[field] =
      row[field];
  }

  const {
    data,
    error,
  } = await db
    .from('videos')
    .update(updatePayload)
    .eq(
      'id',
      existing.id
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return {
    action: 'updated' as const,
    data,
    changedFields,
  };
}

/*
  ============================================================
  SINGLE VIDEO SYNC
  ============================================================
*/
export async function syncVideoById(
  videoId: string,
  requestedTopicId: string | null
) {
  const db =
    getSupabaseAdmin();

  const video =
    await fetchVideo(
      videoId
    );

  const {
    data: existing,
    error: existingError,
  } = await db
    .from('videos')
    .select(
      'id,youtube_video_id,classification_locked,content_type,original_topic_id,slug,title,description,youtube_url,thumbnail_url,published_at,duration_iso,duration_seconds,channel_id,channel_title,tags,category_id,topic_id,seo_title,seo_description,published'
    )
    .eq(
      'youtube_video_id',
      video.id
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  /*
    Existing video keeps its topic.

    New video uses the topic selected in Admin.
  */
  const topicId =
    existing
      ? existing.topic_id
      : requestedTopicId;

  const autoType:
    | 'short'
    | 'long' =
    video.durationSeconds <=
    shortThresholdSeconds
      ? 'short'
      : 'long';

  /*
    Only an explicitly TRUE classification lock
    protects content_type.

    NULL and FALSE both mean:
    let automatic duration classification apply.
  */
  const contentType =
    existing?.classification_locked ===
    true
      ? existing.content_type ||
        autoType
      : autoType;

  const row: any =
    videoRow(
      video,
      topicId,
      contentType
    );

  /*
    IMPORTANT:
    Existing bookkeeping values are preserved exactly.

    We do NOT convert:
      null -> false
      null -> topicId

    because doing that would create fake changes.
  */
  if (existing) {
    row.original_topic_id =
      existing.original_topic_id;

    row.classification_locked =
      existing.classification_locked;

    if (
      existing.classification_locked ===
      true
    ) {
      row.content_type =
        existing.content_type ||
        autoType;
    }
  } else {
    row.original_topic_id =
      topicId;

    row.classification_locked =
      false;
  }

  const dbChangedFields =
    existing
      ? getVideoDbChanges(
          existing,
          row
        )
      : ['new'];

  const indexNowChangedFields =
    getIndexNowChangedFields(
      existing,
      row
    );

  const shouldNotifyIndexNow =
    indexNowChangedFields.length >
      0 &&
    row.published === true;

  const saveResult =
    await saveVideoWithoutTouchingUnchangedRows(
      db,
      existing,
      row
    );

  const savedVideo =
    saveResult.data;

  if (!savedVideo) {
    throw new Error(
      'Video was not saved.'
    );
  }

  /*
    ----------------------------------------------------------
    SLUG HISTORY
    ----------------------------------------------------------
  */
  const slugChanged =
    !!existing?.slug &&
    existing.slug !==
      row.slug;

  if (slugChanged) {
    const {
      error: historyError,
    } = await db
      .from('video_slug_history')
      .upsert(
        {
          video_id:
            savedVideo.id,
          old_slug:
            existing.slug,
          new_slug:
            row.slug,
        },
        {
          onConflict:
            'old_slug',
        }
      );

    if (historyError) {
      throw new Error(
        `Video updated but slug history could not be saved: ${historyError.message}`
      );
    }

    console.info(
      '[VideoSync] Slug changed',
      {
        videoId:
          video.id,
        oldSlug:
          existing.slug,
        newSlug:
          row.slug,
      }
    );
  }

  /*
    ----------------------------------------------------------
    INDEXNOW
    ----------------------------------------------------------

    Only submit the current public URL when an actual
    public-page change happened.

    Unchanged:
      []
      -> no IndexNow request

    Description change:
      current URL
      -> submit

    Title/slug change:
      new current URL
      -> submit
  */
  const indexNow =
    await submitToIndexNow(
      shouldNotifyIndexNow
        ? [
            `${SITE_URL}/videos/${row.slug}`,
          ]
        : []
    );

  /*
    ----------------------------------------------------------
    LOGGING
    ----------------------------------------------------------
  */
  if (
    saveResult.action ===
    'inserted'
  ) {
    console.info(
      '[VideoSync] New video inserted',
      {
        videoId:
          video.id,
        slug:
          row.slug,
        indexNowChangedFields,
      }
    );
  } else if (
    saveResult.action ===
    'updated'
  ) {
    console.info(
      '[VideoSync] Video updated',
      {
        videoId:
          video.id,
        slug:
          row.slug,
        changedFields:
          dbChangedFields,
        indexNowChangedFields,
      }
    );
  } else {
    console.info(
      '[VideoSync] Video unchanged',
      {
        videoId:
          video.id,
        slug:
          row.slug,
      }
    );
  }

  return {
    video:
      savedVideo,
    slugChanged,
    oldSlug:
      existing?.slug || null,
    newSlug:
      row.slug,
    changedFields:
      dbChangedFields,
    indexNow,
  };
}

/*
  ============================================================
  PLAYLIST SYNC
  ============================================================
*/
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

  const topicSlug =
    makeSlug(
      playlist.title,
      playlist.id
    );

  let topicId: string;
  let savedTopic: any;

  /*
    Update playlist metadata only when it actually changed.
    topics currently has no updated_at problem, but this keeps
    writes clean.
  */
  if (existingTopic) {
    const topicChanged =
      !valuesEqual(
        'name',
        existingTopic.name,
        playlist.title
      ) ||
      !valuesEqual(
        'slug',
        existingTopic.slug,
        topicSlug
      ) ||
      !valuesEqual(
        'description',
        existingTopic.description,
        playlist.description
      ) ||
      !valuesEqual(
        'youtube_playlist_id',
        existingTopic.youtube_playlist_id,
        playlist.id
      ) ||
      !valuesEqual(
        'youtube_playlist_url',
        existingTopic.youtube_playlist_url,
        `https://www.youtube.com/playlist?list=${playlist.id}`
      );

    if (topicChanged) {
      const {
        data,
        error,
      } = await db
        .from('topics')
        .update({
          name:
            playlist.title,
          slug:
            topicSlug,
          description:
            playlist.description,
          youtube_playlist_id:
            playlist.id,
          youtube_playlist_url:
            `https://www.youtube.com/playlist?list=${playlist.id}`,
        })
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

      savedTopic =
        data;
    } else {
      savedTopic =
        existingTopic;
    }

    topicId =
      savedTopic.id;
  } else {
    const {
      data,
      error,
    } = await db
      .from('topics')
      .insert({
        name:
          playlist.title,
        slug:
          topicSlug,
        description:
          playlist.description,
        youtube_playlist_id:
          playlist.id,
        youtube_playlist_url:
          `https://www.youtube.com/playlist?list=${playlist.id}`,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ||
          'Could not create playlist category.'
      );
    }

    topicId =
      data.id;

    savedTopic =
      data;
  }

  const currentVideoIds =
    new Set(
      items.map(
        (item) =>
          item.videoId
      )
    );

  let synced = 0;
  let skipped = 0;
  let archived = 0;

  const errors: string[] =
    [];

  const indexNowUrls =
    new Set<string>();

  const ids =
    items.map(
      (item) =>
        item.videoId
    );

  const fetched =
    new Map(
      (
        await fetchVideosByIds(
          ids
        )
      ).map(
        (video) => [
          video.id,
          video,
        ]
      )
    );

  /*
    ----------------------------------------------------------
    PROCESS PLAYLIST VIDEOS
    ----------------------------------------------------------
  */
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
      const {
        data: existing,
        error: existingError,
      } = await db
        .from('videos')
        .select(
          'id,youtube_video_id,classification_locked,content_type,original_topic_id,slug,title,description,youtube_url,thumbnail_url,published_at,duration_iso,duration_seconds,channel_id,channel_title,tags,category_id,topic_id,seo_title,seo_description,published'
        )
        .eq(
          'youtube_video_id',
          video.id
        )
        .maybeSingle();

      if (existingError) {
        throw new Error(
          existingError.message
        );
      }

      const autoType:
        | 'short'
        | 'long' =
        video.durationSeconds <=
        shortThresholdSeconds
          ? 'short'
          : 'long';

      const contentType =
        existing?.classification_locked ===
        true
          ? existing.content_type ||
            autoType
          : autoType;

      /*
        Playlist membership is source of truth for topic_id.
      */
      const row: any =
        videoRow(
          video,
          topicId,
          contentType
        );

      /*
        Preserve existing bookkeeping values EXACTLY.
      */
      if (existing) {
        row.original_topic_id =
          existing.original_topic_id;

        row.classification_locked =
          existing.classification_locked;

        if (
          existing.classification_locked ===
          true
        ) {
          row.content_type =
            existing.content_type ||
            autoType;
        }
      } else {
        row.original_topic_id =
          topicId;

        row.classification_locked =
          false;
      }

      const dbChangedFields =
        existing
          ? getVideoDbChanges(
              existing,
              row
            )
          : ['new'];

      const indexNowChangedFields =
        getIndexNowChangedFields(
          existing,
          row
        );

      /*
        Save only for real changes.
      */
      const saveResult =
        await saveVideoWithoutTouchingUnchangedRows(
          db,
          existing,
          row
        );

      synced++;

      /*
        IndexNow only for public page changes.
      */
      if (
        indexNowChangedFields.length >
          0 &&
        row.published === true
      ) {
        indexNowUrls.add(
          `${SITE_URL}/videos/${row.slug}`
        );
      }

      if (
        saveResult.action ===
        'inserted'
      ) {
        console.info(
          '[VideoSync] New video inserted',
          {
            youtubeVideoId:
              video.id,
            slug:
              row.slug,
            changedFields:
              dbChangedFields,
            indexNowChangedFields,
          }
        );
      } else if (
        saveResult.action ===
        'updated'
      ) {
        console.info(
          '[VideoSync] Video updated',
          {
            youtubeVideoId:
              video.id,
            slug:
              row.slug,
            changedFields:
              dbChangedFields,
            indexNowChangedFields,
          }
        );
      } else {
        console.info(
          '[VideoSync] Video unchanged',
          {
            youtubeVideoId:
              video.id,
            slug:
              row.slug,
          }
        );
      }
    } catch (error) {
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

  /*
    ----------------------------------------------------------
    ARCHIVE VIDEOS NO LONGER IN PLAYLIST
    ----------------------------------------------------------

    Do not repeatedly UPDATE already archived rows.
    ----------------------------------------------------------
  */
  const {
    data: existingVideos,
    error:
      existingVideosError,
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
    const video of
      existingVideos || []
  ) {
    if (
      !currentVideoIds.has(
        video.youtube_video_id
      ) &&
      video.published !== false
    ) {
      const {
        error,
      } = await db
        .from('videos')
        .update({
          published:
            false,
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

  /*
    ----------------------------------------------------------
    INDEXNOW
    ----------------------------------------------------------
  */
  const indexNow =
    await submitToIndexNow(
      Array.from(
        indexNowUrls
      )
    );

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
    skipped,
    archived,
    errors,
    indexNow,
  };
}

/*
  ============================================================
  SYNC ALL PLAYLISTS
  ============================================================
*/
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

  const results:
    Array<{
      name: string;
      ok: boolean;
      summary?: PlaylistSyncSummary;
      error?: string;
    }> = [];

  for (
    const topic of
      topics || []
  ) {
    if (
      !topic.youtube_playlist_id
    ) {
      continue;
    }

    try {
      results.push({
        name:
          topic.name,
        ok: true,
        summary:
          await syncPlaylistById(
            topic.youtube_playlist_id
          ),
      });
    } catch (error) {
      results.push({
        name:
          topic.name,
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

/*
  ============================================================
  CHANNEL SHORTS SYNC
  ============================================================
*/
export async function syncChannelShorts(
  options: {
    maxPages?: number;
  } = {}
) {
  const db =
    getSupabaseAdmin();

  const channelId =
    process.env.YOUTUBE_CHANNEL_ID;

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
    options.maxPages ?? 100;

  const items =
    await fetchPlaylistItems(
      channel.uploadsPlaylistId,
      maxPages
    );

  const videos =
    await fetchVideosByIds(
      items.map(
        (item) =>
          item.videoId
      )
    );

  const {
    data: existingShortsTopic,
    error: topicLookupError,
  } = await db
    .from('topics')
    .select('*')
    .eq(
      'slug',
      'shorts'
    )
    .maybeSingle();

  if (topicLookupError) {
    throw new Error(
      topicLookupError.message
    );
  }

  let shortsTopic =
    existingShortsTopic;

  if (!shortsTopic) {
    const {
      data,
      error,
    } = await db
      .from('topics')
      .insert({
        name:
          'Shorts',
        slug:
          'shorts',
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

    shortsTopic =
      data;
  }

  const videoIds =
    videos.map(
      (video) =>
        video.id
    );

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
      (
        existingRows ||
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
      (video) =>
        video.durationSeconds <=
        shortThresholdSeconds
    );

  let synced = 0;
  let skipped = 0;
  let newlyClassified =
    0;

  const errors: string[] =
    [];

  const indexNowUrls =
    new Set<string>();

  for (
    const video of
      candidates
  ) {
    try {
      const existing =
        existingByYoutubeId.get(
          video.id
        );

      /*
        A manually locked long video stays long.
      */
      if (
        existing?.classification_locked ===
          true &&
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

      /*
        Preserve bookkeeping values exactly.
      */
      if (existing) {
        row.original_topic_id =
          existing.original_topic_id;

        row.classification_locked =
          existing.classification_locked;

        if (
          existing.classification_locked ===
          true
        ) {
          row.content_type =
            existing.content_type ||
            'short';
        }
      } else {
        row.original_topic_id =
          null;

        row.classification_locked =
          false;

        newlyClassified++;
      }

      const indexNowChangedFields =
        getIndexNowChangedFields(
          existing,
          row
        );

      const saveResult =
        await saveVideoWithoutTouchingUnchangedRows(
          db,
          existing,
          row
        );

      synced++;

      if (
        indexNowChangedFields.length >
          0 &&
        row.published === true
      ) {
        indexNowUrls.add(
          `${SITE_URL}/videos/${row.slug}`
        );
      }

      if (
        saveResult.action ===
        'inserted'
      ) {
        console.info(
          '[ShortsSync] New Short inserted',
          {
            youtubeVideoId:
              video.id,
            slug:
              row.slug,
            indexNowChangedFields,
          }
        );
      } else if (
        saveResult.action ===
        'updated'
      ) {
        console.info(
          '[ShortsSync] Video updated',
          {
            youtubeVideoId:
              video.id,
            slug:
              row.slug,
            changedFields:
              saveResult.changedFields,
            indexNowChangedFields,
          }
        );
      } else {
        console.info(
          '[ShortsSync] Video unchanged',
          {
            youtubeVideoId:
              video.id,
            slug:
              row.slug,
          }
        );
      }
    } catch (error) {
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

  const indexNow =
    await submitToIndexNow(
      Array.from(
        indexNowUrls
      )
    );

  return {
    channel:
      channel.title,
    scanned:
      videos.length,
    found:
      candidates.length,
    synced,
    skipped,
    newlyClassified,
    thresholdSeconds:
      shortThresholdSeconds,
    errors,
    indexNow,
  };
}

/*
  ============================================================
  SHORTS METADATA REFRESH
  ============================================================

  This function used to UPDATE every Short every time.

  That was another possible source of updated_at changes.

  Now:
    unchanged metadata -> NO UPDATE
    changed metadata   -> UPDATE
*/
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
      'id,youtube_video_id,title,description,thumbnail_url,published_at,duration_iso,duration_seconds,channel_id,channel_title,tags,category_id,seo_title,seo_description'
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

  const METADATA_FIELDS = [
    'title',
    'description',
    'thumbnail_url',
    'published_at',
    'duration_iso',
    'duration_seconds',
    'channel_id',
    'channel_title',
    'tags',
    'category_id',
    'seo_title',
    'seo_description',
  ] as const;

  let synced = 0;
  let skipped = 0;

  const errors: string[] =
    [];

  for (
    const row of
      shorts || []
  ) {
    try {
      const video =
        await fetchVideo(
          row.youtube_video_id
        );

      const nextValues: Record<
        string,
        any
      > = {
        title:
          video.title,
        description:
          video.description,
        thumbnail_url:
          video.thumbnailUrl,
        published_at:
          video.publishedAt,
        duration_iso:
          video.durationIso,
        duration_seconds:
          video.durationSeconds,
        channel_id:
          video.channelId,
        channel_title:
          video.channelTitle,
        tags:
          video.tags,
        category_id:
          video.categoryId,
        seo_title:
          video.title,
        seo_description:
          video.description?.slice(
            0,
            160
          ),
      };

      const changedFields:
        string[] = [];

      for (
        const field of
          METADATA_FIELDS
      ) {
        if (
          !valuesEqual(
            field,
            row[field],
            nextValues[field]
          )
        ) {
          changedFields.push(
            field
          );
        }
      }

      /*
        No metadata changed.
        Do not touch updated_at.
      */
      if (
        changedFields.length ===
        0
      ) {
        synced++;

        console.info(
          '[ShortsMetadata] Metadata unchanged',
          {
            youtubeVideoId:
              row.youtube_video_id,
          }
        );

        continue;
      }

      const updatePayload:
        Record<string, any> =
        {};

      for (
        const field of
          changedFields
      ) {
        updatePayload[field] =
          nextValues[field];
      }

      const {
        error,
      } = await db
        .from('videos')
        .update(
          updatePayload
        )
        .eq(
          'id',
          row.id
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      synced++;

      console.info(
        '[ShortsMetadata] Metadata updated',
        {
          youtubeVideoId:
            row.youtube_video_id,
          changedFields,
        }
      );
    } catch (error) {
      skipped++;

      if (
        errors.length < 10
      ) {
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
    found:
      (shorts || [])
        .length,
    synced,
    skipped,
    errors,
  };
}
