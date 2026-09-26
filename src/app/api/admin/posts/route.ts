import { NextResponse } from 'next/server';
import sharp from 'sharp';

import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';
import { makeCommunitySlug } from '@/lib/community-slug';

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const form = await req.formData();

  const title = String(
    form.get('title') || ''
  ).trim();

  const body = String(
    form.get('body') || ''
  ).trim();

  const rawCategory = String(
    form.get('category') || 'learning'
  ).trim();

  const category =
    rawCategory ===
    'stocks-to-watch-next-week'
      ? rawCategory
      : rawCategory === 'learning'
        ? rawCategory
        : null;

  const youtubePostUrl =
    String(
      form.get('youtubePostUrl') || ''
    ).trim() || null;

  const published =
    form.get('published') !== 'false';

  if (!title || !body) {
    return NextResponse.json(
      {
        error:
          'Title and post body are required.',
      },
      { status: 400 }
    );
  }

  if (!category) {
    return NextResponse.json(
      {
        error:
          'Invalid community subsection.',
      },
      { status: 400 }
    );
  }

  const slug = makeCommunitySlug(title);

  if (!slug) {
    return NextResponse.json(
      {
        error:
          'The post title cannot generate a valid URL slug.',
      },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  // Community post URLs are title-based and permanent.
  // Reject a duplicate slug instead of changing
  // the URL to include an ID.
  const {
    data: existingPost,
    error: slugCheckError,
  } = await db
    .from('community_posts')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (slugCheckError) {
    return NextResponse.json(
      {
        error: slugCheckError.message,
      },
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

  for (const entry of form.getAll(
    'images'
  )) {
    if (
      !(entry instanceof File) ||
      entry.size === 0
    ) {
      continue;
    }

    if (
      !entry.type.startsWith('image/')
    ) {
      return NextResponse.json(
        {
          error:
            'Only image files are allowed.',
        },
        { status: 400 }
      );
    }

    // Keep the existing safety limit for the
    // ORIGINAL upload.
    if (entry.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        {
          error:
            'Each image must be 8 MB or smaller.',
        },
        { status: 400 }
      );
    }

    try {
      const inputBuffer = Buffer.from(
        await entry.arrayBuffer()
      );

      /*
        Optimize before uploading to Supabase:

        - Auto-rotate according to EXIF
        - Limit huge images to 2400px
        - Convert everything to WebP
        - High quality compression
        - Do NOT enlarge smaller images
        - Original file is NOT stored
      */
      const optimizedBuffer =
        await sharp(inputBuffer)
          .rotate()
          .resize({
            width: 2400,
            height: 2400,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({
            quality: 92,
            effort: 4,
          })
          .toBuffer();

      const path = `posts/${crypto.randomUUID()}.webp`;

      const {
        error: uploadError,
      } = await db.storage
        .from('community-images')
        .upload(
          path,
          optimizedBuffer,
          {
            contentType: 'image/webp',
            upsert: false,
          }
        );

      if (uploadError) {
        return NextResponse.json(
          {
            error:
              uploadError.message,
          },
          { status: 500 }
        );
      }

      const { data } =
        db.storage
          .from('community-images')
          .getPublicUrl(path);

      imageUrls.push(data.publicUrl);
    } catch (error) {
      console.error(
        'Community image optimization failed:',
        error
      );

      return NextResponse.json(
        {
          error:
            'Could not process one of the uploaded images.',
        },
        { status: 500 }
      );
    }
  }

  const {
    data,
    error,
  } = await db
    .from('community_posts')
    .insert({
      title,
      slug,
      body,
      category,
      image_urls: imageUrls,
      youtube_post_url:
        youtubePostUrl,
      published,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    post: data,
  });
}
