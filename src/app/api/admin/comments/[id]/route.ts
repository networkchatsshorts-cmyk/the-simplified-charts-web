import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id:string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { error } = await db.from('community_comments').delete().eq('id', id);
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
