import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id:string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { id } = await params;
  const { published } = await req.json();
  if (typeof published !== 'boolean') return NextResponse.json({ error:'published must be boolean.' }, { status:400 });
  const db = getSupabaseAdmin();
  const { error } = await db.from('community_comments').update({ published }).eq('id',id);
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id:string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { error } = await db.from('community_comments').delete().eq('id', id);
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
