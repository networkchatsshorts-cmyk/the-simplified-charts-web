# The Simplified Charts SEO Video Hub

SEO-first companion site for The Simplified Charts YouTube channel.

## Why this stack

- Next.js App Router: server-rendered pages and strong metadata/SEO control.
- Supabase: videos, stock/topic categories, and website content.
- YouTube Data API v3: fetch video metadata and sync YouTube playlists.
- GitHub: source control and deployment workflow.

Google's current guidance says `VideoObject` structured data on watch pages can make videos easier to find and can help them appear in Search, Video mode, Images and Discover. Google also recommends sitemap submission and validation/inspection after publishing. See the official docs linked below.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Create a Google Cloud project, enable **YouTube Data API v3**, and create an API key.
4. Copy `.env.example` to `.env.local` and fill in values.
5. Install dependencies and run locally:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/admin/login` and use `ADMIN_PASSWORD`.

## First workflow

1. Create categories such as `BSE`, `Vodafone Idea`, etc.
2. Paste a YouTube playlist URL to sync its videos into a category.
3. Open a video from the admin list.
4. For important videos, add original `Analysis intro`, `Key points`, and a strong `SEO description` instead of only copying the YouTube description.

## Production

Deploy to Vercel or another Next.js host, add all environment variables, connect the GitHub repo, and set `NEXT_PUBLIC_SITE_URL` to your real custom domain.

Then add the site's sitemap to Google Search Console:

`https://YOUR-DOMAIN.com/sitemap.xml`

## Official references

- YouTube Data API videos.list: https://developers.google.com/youtube/v3/docs/videos/list
- YouTube Data API playlistItems.list: https://developers.google.com/youtube/v3/docs/playlistItems/list
- Google VideoObject structured data: https://developers.google.com/search/docs/appearance/structured-data/video
- YouTube external traffic analytics: https://support.google.com/youtube/answer/9314355
