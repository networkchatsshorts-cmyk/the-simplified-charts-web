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
  updated_at timestamptz not null default now(),
  content_type text not null default 'long' check (content_type in ('long','short')),
  classification_locked boolean not null default false,
  original_topic_id uuid references public.topics(id) on delete set null
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_urls text[] not null default '{}',
  published boolean not null default true,
  youtube_post_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  display_name text not null,
  body text not null,
  published boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists videos_topic_id_idx on public.videos(topic_id);
create index if not exists videos_published_idx on public.videos(published, published_at desc);
create index if not exists videos_content_type_idx on public.videos(content_type, published, published_at desc);
create index if not exists community_posts_published_idx on public.community_posts(published, created_at desc);
create index if not exists community_comments_post_id_idx on public.community_comments(post_id, created_at desc);

alter table public.topics enable row level security;
alter table public.videos enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

create policy "public can read topics" on public.topics for select using (true);
create policy "public can read published videos" on public.videos for select using (published = true);
create policy "public can read published posts" on public.community_posts for select using (published = true);
create policy "public can read published comments" on public.community_comments for select using (published = true);
create policy "public can add comments" on public.community_comments for insert with check (is_admin = false and length(trim(display_name)) between 1 and 60 and length(trim(body)) between 1 and 2000);

insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', true)
on conflict (id) do nothing;

create policy "public can view community images" on storage.objects for select using (bucket_id = 'community-images');

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists videos_updated_at on public.videos;
create trigger videos_updated_at before update on public.videos
for each row execute function public.set_updated_at();

drop trigger if exists community_posts_updated_at on public.community_posts;
create trigger community_posts_updated_at before update on public.community_posts
for each row execute function public.set_updated_at();
