# SEO/admin content update

## Intended behavior
- YouTube title remains the website page title.
- Admin-managed SEO Description is capped at 160 characters in the editor and is used for page metadata and video cards when explicitly saved.
- Admin-managed Full Website Analysis is the primary visible written content on the video detail page.
- If Full Analysis is missing, the saved SEO Description is shown on the detail page.
- If both admin fields are missing, the stored YouTube description is shown only as a secondary visible fallback on the detail page. It is not used as the page meta description.
- VideoObject structured data uses the saved SEO Description first, then Full Analysis, then a generic site-owned description. It does not fall back to the YouTube description.
- YouTube description remains in the database as secondary sync data and is used for hashtags.
- Playlist/channel/Short sync does not overwrite SEO Description or Full Website Analysis.
- Admin editor is bound to youtube_video_id.
- Home, long-video listing, Shorts listing, videos listing, and topic cards only show an explicitly saved SEO Description.
- Community category hash handling remains fixed so direct hash navigation selects the requested section on initial mount.
