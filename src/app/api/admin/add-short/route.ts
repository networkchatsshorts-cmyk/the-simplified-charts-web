import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { extractVideoId, fetchVideo } from '@/lib/youtube';
import { makeSlug } from '@/lib/slug';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { url } = await req.json();
  const videoId = extractVideoId(url || '');
  if (!videoId) return NextResponse.json({ error: 'Invalid YouTube Short URL.' }, { status: 400 });

  try {
    const video = await fetchVideo(videoId);
    const db = getSupabaseAdmin();
    const shorts = await db.from('topics').upsert({
      name: 'Shorts',
      slug: 'shorts',
      description: 'Short-form videos from The Simplified Charts.'
    }, { onConflict: 'slug' }).select('*').single();

    if (shorts.error || !shorts.data) throw new Error(shorts.error?.message || 'Could not create Shorts category.');

    const { data, error } = await db.from('videos').upsert({
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
      topic_id: shorts.data.id,
      seo_title: video.title,
      seo_description: video.description?.slice(0, 160),
      published: true,
    }, { onConflict: 'youtube_video_id' }).select('*').single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ video: data, message: 'Short added successfully.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Short import failed.' }, { status: 400 });
  }
}
