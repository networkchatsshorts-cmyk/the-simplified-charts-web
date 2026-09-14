import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getSiteUrl } from '@/lib/supabase';
import { submitToIndexNow } from '@/lib/indexnow';

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedUrl =
      typeof body?.url === 'string' ? body.url.trim() : '';

    if (!requestedUrl) {
      return NextResponse.json(
        { error: 'A video URL is required.' },
        { status: 400 }
      );
    }

    const siteUrl = getSiteUrl();
    const siteOrigin = new URL(siteUrl).origin;
    const url = new URL(requestedUrl);

    if (url.origin !== siteOrigin) {
      return NextResponse.json(
        { error: 'URL must belong to the configured site.' },
        { status: 422 }
      );
    }

    console.info('[Admin IndexNow] Manual single-URL submission', {
      url: url.toString(),
    });

    const indexNow = await submitToIndexNow([url.toString()]);

    console.info('[Admin IndexNow] Manual single-URL response', {
      url: url.toString(),
      attempted: indexNow.attempted,
      submitted: indexNow.submitted,
      failed: indexNow.failed,
      statuses: indexNow.statuses,
      errors: indexNow.errors,
    });

    return NextResponse.json({
      ok: indexNow.failed === 0 && indexNow.submitted === 1,
      url: url.toString(),
      indexNow,
    });
  } catch (error) {
    console.error(
      '[Admin IndexNow] Manual single-URL submission failed',
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
