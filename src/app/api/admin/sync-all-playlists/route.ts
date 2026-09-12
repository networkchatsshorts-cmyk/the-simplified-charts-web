import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { syncAllPlaylists } from '@/lib/playlist-sync';

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await syncAllPlaylists();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('Manual sync-all-playlists failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync all playlists failed.' },
      { status: 500 }
    );
  }
}
