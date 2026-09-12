alter table public.videos
  add column if not exists content_type text not null default 'long'
    check (content_type in ('long','short'));

alter table public.videos
  add column if not exists classification_locked boolean not null default false;

alter table public.community_comments
  add column if not exists is_admin boolean not null default false;

update public.videos v
set content_type = 'short', classification_locked = true
where exists (
  select 1 from public.topics t
  where t.id = v.topic_id and t.slug = 'shorts'
);

create index if not exists videos_content_type_idx
on public.videos(content_type, published, published_at desc);

drop policy if exists "public can add comments" on public.community_comments;
create policy "public can add comments"
on public.community_comments
for insert
with check (
  is_admin = false
  and length(trim(display_name)) between 1 and 60
  and length(trim(body)) between 1 and 2000
);


alter table public.videos
  add column if not exists original_topic_id uuid references public.topics(id) on delete set null;

update public.videos v
set original_topic_id = v.topic_id
where v.original_topic_id is null
  and v.topic_id is not null
  and exists (select 1 from public.topics t where t.id = v.topic_id and t.slug <> 'shorts');
