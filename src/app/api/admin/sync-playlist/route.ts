import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { extractPlaylistId } from '@/lib/youtube';
import { syncPlaylistById } from '@/lib/playlist-sync';

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { playlistUrl } = await req.json();
  const playlistId = extractPlaylistId(playlistUrl || '');

  if (!playlistId) {
    return NextResponse.json(
      { error: 'Invalid YouTube playlist URL.' },
      { status: 400 }
    );
  }

  try {
    const summary = await syncPlaylistById(playlistId);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Playlist sync failed.',
      },
      { status: 400 }
    );
  }
}
