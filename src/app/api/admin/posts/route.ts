import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';
import { makeCommunitySlug } from '@/lib/community-slug';

const ALLOWED_CATEGORIES = [
  'learning',
  'stocks-to-watch-next-week',
] as const;

type CommunityPostCategory = (typeof ALLOWED_CATEGORIES)[number];

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const form = await req.formData();

  const title = String(form.get('title') || '').trim();
  const body = String(form.get('body') || '').trim();
  const youtubePostUrl =
    String(form.get('youtubePostUrl') || '').trim() || null;
  const published = form.get('published') !== 'false';
  const rawCategory = String(form.get('category') || 'learning').trim();

  const category = ALLOWED_CATEGORIES.includes(
    rawCategory as CommunityPostCategory
  )
    ? (rawCategory as CommunityPostCategory)
    : null;

  if (!title || !body) {
    return NextResponse.json(
      { error: 'Title and post body are required.' },
      { status: 400 }
    );
  }

  if (!category) {
    return NextResponse.json(
      { error: 'Invalid community post subsection.' },
      { status: 400 }
    );
  }

  const slug = makeCommunitySlug(title);

  if (!slug) {
    return NextResponse.json(
      { error: 'The post title cannot generate a valid URL slug.' },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  const { data: existingPost, error: slugCheckError } = await db
    .from('community_posts')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (slugCheckError) {
    return NextResponse.json(
      { error: slugCheckError.message },
      { status: 500 }
    );
  }

  if (existingPost) {
    return NextResponse.json(
      {
        error:
          'A community post with this title/URL already exists. Please use a different title.',
      },
      { status: 409 }
    );
  }

  const imageUrls: string[] = [];

  for (const entry of form.getAll('images')) {
    if (!(entry instanceof File) || entry.size === 0) continue;

    if (!entry.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed.' },
        { status: 400 }
      );
    }

    if (entry.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Each image must be 8 MB or smaller.' },
        { status: 400 }
      );
    }

    const ext = (entry.name.split('.').pop() || 'jpg')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

    const path = `posts/${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await entry.arrayBuffer());

    const { error: uploadError } = await db.storage
      .from('community-images')
      .upload(path, bytes, {
        contentType: entry.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = db.storage
      .from('community-images')
      .getPublicUrl(path);

    imageUrls.push(data.publicUrl);
  }

  const { data, error } = await db
    .from('community_posts')
    .insert({
      title,
      slug,
      body,
      category,
      image_urls: imageUrls,
      youtube_post_url: youtubePostUrl,
      published,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ post: data });
}
