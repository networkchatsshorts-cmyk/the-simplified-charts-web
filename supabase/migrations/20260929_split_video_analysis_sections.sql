-- Split the website's long-form video analysis into three admin-managed sections.
-- Existing analysis_intro is intentionally preserved as legacy content.

alter table public.videos
  add column if not exists what_we_cover text,
  add column if not exists key_questions text,
  add column if not exists our_approach text;
