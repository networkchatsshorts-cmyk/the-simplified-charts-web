import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const postId = new URL(req.url).searchParams.get('postId');
  if (!postId) return NextResponse.json({ error:'postId is required.' }, { status:400 });
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('community_comments').select('id,display_name,body,created_at,is_admin').eq('post_id', postId).eq('published', true).order('created_at', { ascending:false });
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ comments:data || [] });
}

export async function POST(req: Request) {
  const { postId, displayName, body } = await req.json();
  const name = String(displayName || '').trim();
  const text = String(body || '').trim();
  if (!postId || !name || !text) return NextResponse.json({ error:'Name, comment and post are required.' }, { status:400 });
  if (name.length > 60 || text.length > 2000) return NextResponse.json({ error:'Comment is too long.' }, { status:400 });
  const db = getSupabaseAdmin();
  const { data: post } = await db.from('community_posts').select('id').eq('id',postId).eq('published',true).single();
  if (!post) return NextResponse.json({ error:'Post not found.' }, { status:404 });
  const { data, error } = await db.from('community_comments').insert({ post_id:postId, display_name:name, body:text, published:true, is_admin:false }).select('id,display_name,body,created_at,is_admin').single();
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ comment:data });
}
