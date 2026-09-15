import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getSupabaseAdmin, getSiteUrl } from '@/lib/supabase';
import { makeSlug } from '@/lib/slug';
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
    analysisIntro,
    keyPoints,
    seoDescription,
  } = await req.json();

  if (!video?.id || !video?.title) {
    return NextResponse.json(
      { error: 'Missing video data.' },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  const { data: existing, error: existingError } = await db
    .from('videos')
    .select('id,slug')
    .eq('youtube_video_id', video.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 400 }
    );
  }

  const slug = makeSlug(video.title, video.id);

  if (existing && existing.slug !== slug) {
    await recordVideoSlugHistory(
      db,
      existing.id,
      existing.slug,
      slug
    );
  }

  const row = {
    youtube_video_id: video.id,
    slug,
    title: video.title,
    description: video.description,
    youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
    thumbnail_url: video.thumbnailUrl,
    published_at: video.publishedAt,
    duration_iso: video.durationIso,
    duration_seconds: video.durationSeconds,
    channel_id: video.channelId,
    channel_title: video.channelTitle,
    tags: video.tags || [],
    category_id: video.categoryId,
    topic_id: topicId || null,
    seo_title: video.title,
    seo_description:
      seoDescription || video.description?.slice(0, 160),
    analysis_intro: analysisIntro || null,
    key_points: keyPoints || [],
    published: true,
    content_type:
      (video.durationSeconds ?? 0) <= 180 ? 'short' : 'long',
    classification_locked: false,
    original_topic_id: topicId || null,
  };

  const { data, error } = await db
    .from('videos')
    .upsert(row, { onConflict: 'youtube_video_id' })
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Could not save video.' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    video: data,
    url: `${getSiteUrl()}/videos/${data.slug}`,
  });
}
