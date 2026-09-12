import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';
import slugify from 'slugify';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  const [{ data: topics, error: te }, { data: videos, error: ve }, { data: posts, error: pe }, { data: comments, error: ce }] = await Promise.all([
    db.from('topics').select('*').order('name'),
    db.from('videos').select('id,title,youtube_video_id,slug,published_at,topic_id').order('published_at', { ascending: false }).limit(100),
    db.from('community_posts').select('id,title,body,published,created_at').order('created_at', { ascending: false }).limit(100),
    db.from('community_comments').select('id,post_id,display_name,body,published,created_at').order('created_at', { ascending: false }).limit(200)
  ]);
  if (te || ve || pe || ce) return NextResponse.json({ error: (te || ve || pe || ce)?.message }, { status: 500 });
  return NextResponse.json({ topics, videos, posts, comments });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, description = null, youtubePlaylistUrl = null } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
  const db = getSupabaseAdmin();
  const slug = slugify(name, { lower: true, strict: true });
  const playlistId = youtubePlaylistUrl ? new URL(youtubePlaylistUrl).searchParams.get('list') : null;
  const { data, error } = await db.from('topics').insert({ name: name.trim(), slug, description, youtube_playlist_id: playlistId, youtube_playlist_url: youtubePlaylistUrl }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
