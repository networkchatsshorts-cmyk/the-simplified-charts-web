import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { postId, body } = await req.json();
  const text = String(body || '').trim();
  if (!postId || !text) return NextResponse.json({ error:'Post and reply are required.' }, { status:400 });
  if (text.length > 2000) return NextResponse.json({ error:'Reply is too long.' }, { status:400 });
  const db = getSupabaseAdmin();
  const { data: post } = await db.from('community_posts').select('id').eq('id', postId).eq('published', true).single();
  if (!post) return NextResponse.json({ error:'Post not found.' }, { status:404 });
  const { data, error } = await db.from('community_comments').insert({ post_id:postId, display_name:'The Simplified Charts', body:text, published:true, is_admin:true }).select('id,post_id,display_name,body,published,created_at,is_admin').single();
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ comment:data });
}
