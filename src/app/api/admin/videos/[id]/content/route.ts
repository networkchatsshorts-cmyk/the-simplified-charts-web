import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

const SEO_DESCRIPTION_MAX = 160;
const ANALYSIS_MAX = 20000;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const videoId = decodeURIComponent(id || '').trim();

  if (!videoId) {
    return NextResponse.json(
      { error: 'Missing YouTube video ID.' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));

  if (
    typeof body?.seoDescription !== 'string' ||
    typeof body?.analysisIntro !== 'string'
  ) {
    return NextResponse.json(
      { error: 'SEO description and website analysis are required as text.' },
      { status: 400 }
    );
  }

  const seoDescription = body.seoDescription.trim();
  const analysisIntro = body.analysisIntro.trim();

  if (seoDescription.length > SEO_DESCRIPTION_MAX) {
    return NextResponse.json(
      {
        error: `SEO description must be ${SEO_DESCRIPTION_MAX} characters or fewer.`,
      },
      { status: 400 }
    );
  }

  if (analysisIntro.length > ANALYSIS_MAX) {
    return NextResponse.json(
      {
        error: `Website analysis must be ${ANALYSIS_MAX} characters or fewer.`,
      },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  const { data: existing, error: lookupError } = await db
    .from('videos')
    .select('id,youtube_video_id,seo_description,seo_description_managed,analysis_intro')
    .eq('youtube_video_id', videoId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: lookupError.message },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: 'Video not found.' },
      { status: 404 }
    );
  }

  const { data, error } = await db
    .from('videos')
    .update({
      // Empty values are stored as NULL, so the public page never
      // falls back to the YouTube description.
      seo_description: seoDescription || null,
      seo_description_managed: Boolean(seoDescription),
      analysis_intro: analysisIntro || null,
    })
    .eq('youtube_video_id', videoId)
    .select(
      'id,youtube_video_id,seo_description,seo_description_managed,analysis_intro,slug,title'
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Could not save video SEO content.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ video: data });
}
