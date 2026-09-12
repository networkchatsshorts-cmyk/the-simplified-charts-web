export type YouTubeVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  tags: string[];
  categoryId?: string;
  thumbnailUrl: string;
  durationIso: string;
  durationSeconds: number;
};

export type YouTubePlaylistItem = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
};

export type YouTubePlaylist = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
};

function requireKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('Missing YOUTUBE_API_KEY.');
  return key;
}

async function youtubeRequest(
  path: string,
  params: Record<string, string>
) {
  const key = requireKey();

  const url = new URL(
    `https://www.googleapis.com/youtube/v3/${path}`
  );

  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  url.searchParams.set('key', key);

  let res: Response;

  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error('YouTube network request failed:', {
      path,
      message,
    });

    throw new Error(
      `YouTube network request failed: ${message}`
    );
  }

  const text = await res.text();

  let data: any = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    console.error('YouTube returned non-JSON response:', {
      path,
      status: res.status,
      responsePreview: text.slice(0, 300),
    });

    throw new Error(
      `YouTube returned an invalid response (${res.status}).`
    );
  }

  if (!res.ok) {
    const reason = data?.error?.errors?.[0]?.reason;
    const message =
      data?.error?.message ||
      `YouTube API request failed (${res.status}).`;

    console.error('YouTube API error:', {
      path,
      status: res.status,
      reason,
      message,
    });

    throw new Error(
      reason ? `${message} [${reason}]` : message
    );
  }

  return data;
}

export function extractVideoId(input: string) {
  try {
    const url = new URL(input.trim());
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0];
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((x) => x === 'shorts' || x === 'embed' || x === 'live');
    return idx >= 0 ? parts[idx + 1] : null;
  } catch {
    return null;
  }
}

function parseDuration(iso: string) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

export async function fetchVideo(videoId: string): Promise<YouTubeVideo> {
  const data = await youtubeRequest('videos', {
    part: 'snippet,contentDetails',
    id: videoId,
  });
  const item = data.items?.[0];
  if (!item) throw new Error('YouTube video not found or is unavailable.');
  const s = item.snippet;
  const c = item.contentDetails;
  return {
    id: item.id,
    title: s.title,
    description: s.description || '',
    publishedAt: s.publishedAt,
    channelId: s.channelId,
    channelTitle: s.channelTitle,
    tags: s.tags || [],
    categoryId: s.categoryId,
    thumbnailUrl: s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || s.thumbnails?.medium?.url || s.thumbnails?.default?.url || '',
    durationIso: c.duration,
    durationSeconds: parseDuration(c.duration),
  };
}

export async function fetchPlaylist(playlistId: string): Promise<YouTubePlaylist> {
  const data = await youtubeRequest('playlists', {
    part: 'snippet',
    id: playlistId,
  });
  const item = data.items?.[0];
  if (!item) throw new Error('YouTube playlist not found, private, or unavailable.');
  const s = item.snippet;
  return {
    id: item.id,
    title: s.title || 'Untitled Playlist',
    description: s.description || '',
    channelId: s.channelId || '',
    channelTitle: s.channelTitle || '',
    thumbnailUrl: s.thumbnails?.high?.url || s.thumbnails?.medium?.url || s.thumbnails?.default?.url || '',
  };
}

export async function fetchPlaylistItems(playlistId: string, maxPages = 20): Promise<YouTubePlaylistItem[]> {
  const out: YouTubePlaylistItem[] = [];
  let pageToken = '';
  for (let page = 0; page < maxPages; page++) {
    const data = await youtubeRequest('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of data.items || []) {
      const videoId = item.contentDetails?.videoId;
      if (!videoId) continue;
      out.push({
        videoId,
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt,
        thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      });
    }
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }
  return out;
}

export function extractPlaylistId(input: string) {
  try {
    const url = new URL(input.trim());
    return url.searchParams.get('list') || null;
  } catch {
    return input.trim() || null;
  }
}

export function youtubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}`;
}
