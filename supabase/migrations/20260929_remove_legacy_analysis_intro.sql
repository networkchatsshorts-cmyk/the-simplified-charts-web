-- Retire the old single analysis field.
-- The website now uses three admin-managed sections instead.

alter table public.videos
  add column if not exists what_we_cover text,
  add column if not exists key_questions text,
  add column if not exists our_approach text;

alter table public.videos
  drop column if exists analysis_intro;
