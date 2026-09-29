# Video SEO implementation

This change makes video-page SEO content admin-managed per YouTube video ID.

## Admin fields

In Admin > Current Videos > Edit SEO:
- SEO Description: max 160 characters in the UI.
- Full Website Analysis: up to 20,000 characters.

## Sync behavior

YouTube playlist/channel sync updates YouTube-owned fields only.
It does not overwrite:
- seo_description
- seo_description_managed
- analysis_intro
- key_points

The website analysis and SEO description are therefore attached to the same database record identified by `youtube_video_id`.

## Public video pages

- The YouTube description is no longer used as the page meta description.
- The page meta description is emitted only after an admin saves an SEO description.
- VideoObject description uses the saved SEO description; if none is active, it can use the website analysis.
- The old `contentUrl` value pointing to the YouTube watch page was removed because Google's VideoObject guidance expects `contentUrl` to be the actual video file URL.
- The visible page uses the admin `analysis_intro` as the full analysis and keeps hashtags extracted from the YouTube description.

## Database migration

Run:

`supabase/migrations/20260929_make_video_seo_description_admin_managed.sql`

This adds `seo_description_managed` with a default of `false`. Existing YouTube-derived `seo_description` values are retained in the database but are not used publicly until an admin saves them.
