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

function requireKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('Missing YOUTUBE_API_KEY.');
  return key;
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
  const key = requireKey();
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('id', videoId);
  url.searchParams.set('key', key);
  const res = await fetch(url, { next: { revalidate: 300 } });
  const data = await res.json();
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
    thumbnailUrl: s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || s.thumbnails?.medium?.url,
    durationIso: c.duration,
    durationSeconds: parseDuration(c.duration)
  };
}

export async function fetchPlaylistItems(playlistId: string, maxPages = 10): Promise<YouTubePlaylistItem[]> {
  const key = requireKey();
  const out: YouTubePlaylistItem[] = [];
  let pageToken = '';
  for (let page = 0; page < maxPages; page++) {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', key);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch playlist.');
    for (const item of data.items || []) {
      const videoId = item.contentDetails?.videoId;
      if (!videoId) continue;
      out.push({
        videoId,
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt,
        thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url
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
