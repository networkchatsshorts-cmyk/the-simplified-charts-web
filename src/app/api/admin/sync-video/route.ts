import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { extractVideoId } from '@/lib/youtube';
import { syncVideoById } from '@/lib/playlist-sync';

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const videoUrl =
      typeof body?.url === 'string' ? body.url.trim() : '';
    const topicId =
      typeof body?.topicId === 'string' && body.topicId.trim()
        ? body.topicId.trim()
        : null;

    const videoId = extractVideoId(videoUrl);

    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube video URL.' },
        { status: 400 }
      );
    }

    const result = await syncVideoById(videoId, topicId);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Video sync failed.',
      },
      { status: 400 }
    );
  }
}
