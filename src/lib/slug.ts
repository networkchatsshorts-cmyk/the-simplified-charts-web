import slugify from 'slugify';

export function makeSlug(title: string, videoId?: string) {
  const base = slugify(title, { lower: true, strict: true, trim: true });
  return `${base || 'video'}-${(videoId || '').slice(-6).toLowerCase()}`;
}
