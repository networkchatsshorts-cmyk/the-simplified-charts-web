import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';
import { makeSlug } from '@/lib/slug';
import {
  saveVideoWithoutTouchingUnchangedRows,
} from '@/lib/playlist-sync';
import { recordVideoSlugHistory } from '@/lib/video-slug-history';

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const {
    video,
    topicId,
    keyPoints,
    seoDescription,
  } = await req.json();

  if (!video?.id || !video?.title) {
    return NextResponse.json(
      { error: 'Missing video data.' },
      { status: 400 }
    );
  }

  try {
    const db = getSupabaseAdmin();

    const { data: existing, error: existingError } =
      await db
        .from('videos')
        .select(
          'id,youtube_video_id,slug,title,description,youtube_url,thumbnail_url,published_at,duration_iso,duration_seconds,channel_id,channel_title,tags,category_id,topic_id,content_type,seo_title,seo_description,key_points,published,original_topic_id,classification_locked'
        )
        .eq('youtube_video_id', video.id)
        .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    const slug = makeSlug(video.title, video.id);
    const autoType =
      (video.durationSeconds ?? 0) <= 180
        ? 'short'
        : 'long';

    const row: any = {
      youtube_video_id: video.id,
      slug,
      title: video.title,
      description: video.description ?? null,
      youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnail_url: video.thumbnailUrl ?? null,
      published_at: video.publishedAt ?? null,
      duration_iso: video.durationIso ?? null,
      duration_seconds: video.durationSeconds ?? null,
      channel_id: video.channelId ?? null,
      channel_title: video.channelTitle ?? null,
      tags: video.tags ?? [],
      category_id: video.categoryId ?? null,
      topic_id: topicId ?? existing?.topic_id ?? null,
      content_type: existing?.classification_locked
        ? existing.content_type || autoType
        : autoType,
      // SEO/editorial fields are admin-managed. Do not populate them
      // from YouTube data during a Short sync.
      published: true,
      original_topic_id:
        existing?.original_topic_id ??
        topicId ??
        null,
      classification_locked:
        existing?.classification_locked ?? false,
    };

    if (!existing && !row.topic_id) {
      row.topic_id = null;
    }

    if (existing && existing.slug !== slug) {
      await recordVideoSlugHistory(
        db,
        existing.id,
        existing.slug,
        slug
      );
    }

    const saved =
      await saveVideoWithoutTouchingUnchangedRows(
        db,
        row,
        existing
      );

    return NextResponse.json({
      video: saved.data,
      changed: saved.changedFields.length > 0,
      changedFields: saved.changedFields,
      url: `${getSiteUrl()}/videos/${saved.data.slug}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not save video.',
      },
      { status: 400 }
    );
  }
}
