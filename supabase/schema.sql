create extension if not exists pgcrypto;

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  youtube_playlist_id text,
  youtube_playlist_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique,
  slug text not null unique,
  title text not null,
  description text,
  youtube_url text not null,
  thumbnail_url text,
  published_at timestamptz,
  duration_iso text,
  duration_seconds integer,
  channel_id text,
  channel_title text,
  tags text[] default '{}',
  category_id text,
  topic_id uuid references public.topics(id) on delete set null,
  seo_title text,
  seo_description text,
  analysis_intro text,
  key_points text[] default '{}',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists videos_topic_id_idx on public.videos(topic_id);
create index if not exists videos_published_idx on public.videos(published, published_at desc);

alter table public.topics enable row level security;
alter table public.videos enable row level security;

create policy "public can read topics" on public.topics for select using (true);
create policy "public can read published videos" on public.videos for select using (published = true);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists videos_updated_at on public.videos;
create trigger videos_updated_at before update on public.videos
for each row execute function public.set_updated_at();
