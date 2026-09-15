import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing YOUTUBE_API_KEY.' },
        { status: 500 }
      );
    }

    if (!channelId) {
      return NextResponse.json(
        { error: 'Missing YOUTUBE_CHANNEL_ID.' },
        { status: 500 }
      );
    }

    const url = new URL(
      'https://www.googleapis.com/youtube/v3/channels'
    );

    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        `YouTube API request failed (${response.status}).`;

      console.error('[Subscriber Sync] YouTube API error', {
        status: response.status,
        message,
      });

      return NextResponse.json(
        { error: message },
        {
          status:
            response.status >= 400 && response.status < 600
              ? response.status
              : 500,
        }
      );
    }

    const channel = data?.items?.[0];

    if (!channel) {
      return NextResponse.json(
        { error: 'YouTube channel not found.' },
        { status: 404 }
      );
    }

    const rawSubscriberCount =
      channel.statistics?.subscriberCount;

    const subscriberCount = Number(rawSubscriberCount);

    if (
      !Number.isSafeInteger(subscriberCount) ||
      subscriberCount < 0
    ) {
      return NextResponse.json(
        {
          error:
            'YouTube did not return a valid subscriber count.',
        },
        { status: 502 }
      );
    }

    const channelTitle =
      channel.snippet?.title || 'The Simplified Charts';

    const db = getSupabaseAdmin();

    const { data: saved, error } = await db
      .from('channel_stats')
      .upsert(
        {
          channel_id: channelId,
          channel_title: channelTitle,
          subscriber_count: subscriberCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'channel_id' }
      )
      .select('subscriber_count,updated_at')
      .single();

    if (error || !saved) {
      console.error('[Subscriber Sync] Supabase error', {
        message:
          error?.message || 'No saved row returned.',
      });

      return NextResponse.json(
        {
          error:
            error?.message ||
            'Could not save subscriber count.',
        },
        { status: 500 }
      );
    }

    console.info('[Subscriber Sync] Updated', {
      channelId,
      subscriberCount: saved.subscriber_count,
      updatedAt: saved.updated_at,
    });

    return NextResponse.json({
      ok: true,
      subscriberCount: saved.subscriber_count,
      updatedAt: saved.updated_at,
    });
  } catch (error) {
    console.error('[Subscriber Sync] Failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Subscriber count sync failed.',
      },
      { status: 500 }
    );
  }
}
