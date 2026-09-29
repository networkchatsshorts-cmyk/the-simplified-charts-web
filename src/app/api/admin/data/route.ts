import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

const BASE_VIDEO_FIELDS =
  'id,title,youtube_video_id,slug,published_at,topic_id,content_type,classification_locked';

const VIDEO_SEO_FIELDS =
  `${BASE_VIDEO_FIELDS},seo_description,seo_description_managed,analysis_intro`;

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseAdmin();

  const [topicsRes, videosRes, postsRes, commentsRes] = await Promise.all([
    db.from('topics').select('*').order('name'),
    db
      .from('videos')
      .select(VIDEO_SEO_FIELDS)
      .order('published_at', { ascending: false })
      .limit(2000),
    db
      .from('community_posts')
      .select('id,title,body,published,created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    db
      .from('community_comments')
      .select('id,post_id,display_name,body,published,created_at,is_admin')
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  // Keep the entire admin dashboard functional even if an older production
  // database has not received the optional SEO migration yet. In that case,
  // videos still load with the original fields and the SEO editor can report
  // the database issue separately instead of making posts/comments disappear.
  let finalVideosRes = videosRes;
  let videoSeoFieldsAvailable = true;

  if (videosRes.error) {
    finalVideosRes = await db
      .from('videos')
      .select(BASE_VIDEO_FIELDS)
      .order('published_at', { ascending: false })
      .limit(2000);
    videoSeoFieldsAvailable = false;
  }

  const error =
    topicsRes.error ||
    finalVideosRes.error ||
    postsRes.error ||
    commentsRes.error;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const videos = (finalVideosRes.data || []).map(video => ({
    ...video,
    seo_description: 'seo_description' in video ? video.seo_description : null,
    seo_description_managed:
      'seo_description_managed' in video
        ? video.seo_description_managed
        : false,
    analysis_intro: 'analysis_intro' in video ? video.analysis_intro : null,
  }));

  return NextResponse.json({
    topics: topicsRes.data || [],
    videos,
    posts: postsRes.data || [],
    comments: commentsRes.data || [],
    videoSeoFieldsAvailable,
  });
}
