import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { syncChannelShorts } from '@/lib/playlist-sync';

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await syncChannelShorts({ maxPages: 100 });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('Manual channel Shorts sync failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Shorts sync failed.' }, { status: 500 });
  }
}
