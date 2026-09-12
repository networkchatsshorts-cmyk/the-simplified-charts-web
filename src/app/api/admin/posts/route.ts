import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const form = await req.formData();
  const title = String(form.get('title') || '').trim();
  const body = String(form.get('body') || '').trim();
  const youtubePostUrl = String(form.get('youtubePostUrl') || '').trim() || null;
  const published = form.get('published') !== 'false';
  if (!title || !body) return NextResponse.json({ error:'Title and post body are required.' }, { status:400 });
  const db = getSupabaseAdmin();
  const imageUrls: string[] = [];
  for (const entry of form.getAll('images')) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    if (!entry.type.startsWith('image/')) return NextResponse.json({ error:'Only image files are allowed.' }, { status:400 });
    if (entry.size > 8 * 1024 * 1024) return NextResponse.json({ error:'Each image must be 8 MB or smaller.' }, { status:400 });
    const ext = (entry.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
    const path = `posts/${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await entry.arrayBuffer());
    const { error: uploadError } = await db.storage.from('community-images').upload(path, bytes, { contentType:entry.type, upsert:false });
    if (uploadError) return NextResponse.json({ error:uploadError.message }, { status:500 });
    const { data } = db.storage.from('community-images').getPublicUrl(path);
    imageUrls.push(data.publicUrl);
  }
  const { data, error } = await db.from('community_posts').insert({ title, body, image_urls:imageUrls, youtube_post_url:youtubePostUrl, published }).select('*').single();
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ post:data });
}
