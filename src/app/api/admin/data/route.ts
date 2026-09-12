import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  const [topicsRes, videosRes, postsRes, commentsRes] = await Promise.all([
    db.from('topics').select('*').order('name'),
    db.from('videos').select('id,title,youtube_video_id,slug,published_at,topic_id,content_type,classification_locked').order('published_at', { ascending: false }).limit(2000),
    db.from('community_posts').select('id,title,body,published,created_at').order('created_at', { ascending: false }).limit(200),
    db.from('community_comments').select('id,post_id,display_name,body,published,created_at,is_admin').order('created_at', { ascending: false }).limit(1000),
  ]);
  const error = topicsRes.error || videosRes.error || postsRes.error || commentsRes.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ topics: topicsRes.data || [], videos: videosRes.data || [], posts: postsRes.data || [], comments: commentsRes.data || [] });
}
