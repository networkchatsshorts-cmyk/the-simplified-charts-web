import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id:string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { id } = await params;
  const body = await req.json();
  const updates:any = {};
  if (typeof body.title === 'string') updates.title = body.title.trim();
  if (typeof body.body === 'string') updates.body = body.body.trim();
  if (Array.isArray(body.image_urls)) updates.image_urls = body.image_urls;
  if ('youtube_post_url' in body) updates.youtube_post_url = body.youtube_post_url || null;
  if (typeof body.published === 'boolean') updates.published = body.published;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('community_posts').update(updates).eq('id',id).select('*').single();
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ post:data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id:string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data: post, error: readError } = await db.from('community_posts').select('id,image_urls').eq('id', id).single();
  if (readError || !post) return NextResponse.json({ error: readError?.message || 'Post not found.' }, { status:404 });
  const { error: deleteError } = await db.from('community_posts').delete().eq('id', id);
  if (deleteError) return NextResponse.json({ error:deleteError.message }, { status:500 });
  for (const publicUrl of post.image_urls || []) {
    try {
      const marker = '/community-images/';
      const index = publicUrl.indexOf(marker);
      if (index >= 0) await db.storage.from('community-images').remove([publicUrl.slice(index + marker.length)]);
    } catch {}
  }
  return NextResponse.json({ ok:true });
}
