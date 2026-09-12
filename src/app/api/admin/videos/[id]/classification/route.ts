import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { contentType } = await req.json();
  if (contentType !== 'long' && contentType !== 'short') {
    return NextResponse.json({ error: 'contentType must be long or short.' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: current, error: currentError } = await db
    .from('videos')
    .select('id,topic_id,original_topic_id')
    .eq('id', id)
    .single();
  if (currentError || !current) return NextResponse.json({ error: currentError?.message || 'Video not found.' }, { status: 404 });

  let topicId = current.topic_id;
  if (contentType === 'long' && current.original_topic_id) {
    topicId = current.original_topic_id;
  }

  const { data, error } = await db
    .from('videos')
    .update({ content_type: contentType, classification_locked: true, topic_id: topicId })
    .eq('id', id)
    .select('id,content_type,classification_locked,topic_id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ video: data });
}
