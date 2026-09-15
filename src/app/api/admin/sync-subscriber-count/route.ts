nnels');
    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || `YouTube API request failed (${response.status}).`;
      console.error('[Subscriber Sync] YouTube API error', { status: response.status, message });
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const channel = data?.items?.[0];
    if (!channel) {
      return NextResponse.json({ error: 'YouTube channel not found.' }, { status: 404 });
    }

    const subscriberCount = Number(channel.statistics?.subscriberCount);
    if (!Number.isFinite(subscriberCount)) {
      return NextResponse.json({ error: 'YouTube did not return a valid subscriber count.' }, { status: 502 });
    }

    const channelTitle = channel.snippet?.title || 'The Simplified Charts';
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
        message: error?.message || 'No saved row returned.',
      });
      return NextResponse.json(
        { error: error?.message || 'Could not save subscriber count.' },
        { status: 500 }
      );
    }

    console.info('[Subscriber Sync] Updated', {
      channelId,
      subscriberCount,
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
      { error: error instanceof Error ? error.message : 'Subscriber count sync failed.' },
      { status: 500 }
    );
  }
}
