import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import {
  getSupabaseAdmin,
  getSiteUrl,
} from '@/lib/supabase';
import { submitToIndexNow } from '@/lib/indexnow';

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const db = getSupabaseAdmin();
    const siteUrl = getSiteUrl();

    const pageSize = 1000;
    const urls: string[] = [];

    for (
      let from = 0;
      ;
      from += pageSize
    ) {
      const { data, error } = await db
        .from('videos')
        .select('slug')
        .eq('published', true)
        .not('slug', 'is', null)
        .order('published_at', {
          ascending: false,
        })
        .range(
          from,
          from + pageSize - 1
        );

      if (error) {
        throw new Error(error.message);
      }

      for (const row of data || []) {
        if (row.slug) {
          urls.push(
            `${siteUrl}/videos/${row.slug}`
          );
        }
      }

      if (!data || data.length < pageSize) {
        break;
      }
    }

    const indexNow =
      await submitToIndexNow(urls);

    console.info(
      '[Admin IndexNow] Manual submission completed',
      {
        totalPublishedVideoUrls: urls.length,
        ...indexNow,
      }
    );

    return NextResponse.json({
      ok: true,
      totalUrls: urls.length,
      indexNow,
    });
  } catch (error) {
    console.error(
      '[Admin IndexNow] Manual submission failed',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'IndexNow submission failed.',
      },
      { status: 500 }
    );
  }
}
