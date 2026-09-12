import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { extractPlaylistId, fetchPlaylist, fetchPlaylistItems, fetchVideo } from '@/lib/youtube';
import { makeSlug } from '@/lib/slug';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { playlistUrl } = await req.json();
  const playlistId = extractPlaylistId(playlistUrl || '');
  if (!playlistId) return NextResponse.json({ error: 'Invalid YouTube playlist URL.' }, { status: 400 });

  try {
    const playlist = await fetchPlaylist(playlistId);
    const items = await fetchPlaylistItems(playlistId);
    const db = getSupabaseAdmin();
    const topicSlug = makeSlug(playlist.title, playlist.id);

    const { data: topic, error: topicError } = await db.from('topics').upsert({
      name: playlist.title,
      slug: topicSlug,
      description: playlist.description,
      youtube_playlist_id: playlist.id,
      youtube_playlist_url: `https://www.youtube.com/playlist?list=${playlist.id}`,
    }, { onConflict: 'slug' }).select('*').single();

    if (topicError || !topic) throw new Error(topicError?.message || 'Could not create playlist category.');

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const video = await fetchVideo(item.videoId);
        const { error } = await db.from('videos').upsert({
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
          topic_id: topic.id,
          seo_title: video.title,
          seo_description: video.description?.slice(0, 160),
          published: true,
        }, { onConflict: 'youtube_video_id' });
        if (error) throw new Error(error.message);
        synced++;
      } catch (error) {
        skipped++;
        if (errors.length < 5) errors.push(`${item.videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      playlist: { id: playlist.id, title: playlist.title, description: playlist.description, topicId: topic.id, topicSlug: topic.slug },
      found: items.length,
      synced,
      skipped,
      errors,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Playlist sync failed.' }, { status: 400 });
  }
}
