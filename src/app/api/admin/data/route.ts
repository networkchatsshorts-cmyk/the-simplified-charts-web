import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

const VIDEO_FIELDS =
  'id,title,youtube_video_id,slug,published_at,topic_id,content_type,classification_locked,seo_description,seo_description_managed,what_this_analysis_covers,key_levels_to_watch,how_to_read_the_setup';

const VIDEO_BASIC_FIELDS =
  'id,title,youtube_video_id,slug,published_at,topic_id,content_type,classification_locked';

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const section = new URL(req.url).searchParams.get('section');

  if (!section) {
    return NextResponse.json(
      { error: 'Missing admin data section.' },
      { status: 400 }
    );
  }

  if (section === 'sync' || section === 'playlists') {
    const { data, error } = await db
      .from('topics')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (section === 'sync') {
      return NextResponse.json({ topics: data ?? [] });
    }

    const { data: counts, error: countsError } = await db
      .from('videos')
      .select('topic_id');

    if (countsError) {
      return NextResponse.json({ error: countsError.message }, { status: 500 });
    }

    const videoCounts: Record<string, number> = {};
    for (const row of counts ?? []) {
      const topicId = row.topic_id as string | null;
      if (topicId) videoCounts[topicId] = (videoCounts[topicId] || 0) + 1;
    }

    return NextResponse.json({ topics: data ?? [], videoCounts });
  }

  if (section === 'classification') {
    const { data, error } = await db
      .from('videos')
      .select(VIDEO_BASIC_FIELDS)
      .order('published_at', { ascending: false })
      .limit(2000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ videos: data ?? [] });
  }

  if (section === 'videos') {
    const { data, error } = await db
      .from('videos')
      .select(VIDEO_FIELDS)
      .order('published_at', { ascending: false })
      .limit(2000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ videos: data ?? [] });
  }

  if (section === 'posts' || section === 'reply') {
    const { data, error } = await db
      .from('community_posts')
      .select('id,title,body,published,created_at,category')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (section === 'reply') {
      const { data: comments, error: commentsError } = await db
        .from('community_comments')
        .select('id,post_id,parent_comment_id,display_name,body,published,created_at,is_admin')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (commentsError) {
        return NextResponse.json({ error: commentsError.message }, { status: 500 });
      }

      return NextResponse.json({ posts: data ?? [], comments: comments ?? [] });
    }

    return NextResponse.json({ posts: data ?? [] });
  }

  if (section === 'comments') {
    const { data, error } = await db
      .from('community_comments')
      .select('id,post_id,parent_comment_id,display_name,body,published,created_at,is_admin')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: data ?? [] });
  }

  if (section === 'create-post') {
    return NextResponse.json({});
  }

  return NextResponse.json(
    { error: `Unknown admin data section: ${section}` },
    { status: 400 }
  );
}
