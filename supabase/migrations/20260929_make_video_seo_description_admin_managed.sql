-- Make video SEO descriptions explicitly admin-managed.
--
-- Existing seo_description values may have been created automatically from
-- YouTube descriptions by the old sync logic. Mark them as unmanaged so they
-- are not used as the public page meta description until an admin saves them.
--
-- No seo_description data is deleted.

alter table public.videos
add column if not exists seo_description_managed boolean not null default false;
