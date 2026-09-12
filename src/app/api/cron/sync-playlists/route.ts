import { NextResponse } from 'next/server';
import { syncAllPlaylists, syncChannelShorts, syncShortsMetadata } from '@/lib/playlist-sync';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await syncAllPlaylists();
    const shortsAuto = await syncChannelShorts({ maxPages: 20 });
    const shorts = await syncShortsMetadata();
    return NextResponse.json({ ok: true, results, shortsAuto, shorts });
  } catch (error) {
    console.error('Scheduled playlist sync failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scheduled sync failed.' },
      { status: 500 }
    );
  }
}
