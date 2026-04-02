-- Enable useful extension
create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  role text not null check (role in ('admin', 'publisher')) default 'publisher',
  created_at timestamptz not null default now()
);

-- Stories
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('draft','pending','in_review','scheduled','published','unpublished','rejected')) default 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  unpublished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delete_requests (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.story_logs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  action text not null,
  old_status text,
  new_status text,
  admin_id uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  session_hint text
);

-- auto updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stories_set_updated_at on public.stories;
create trigger stories_set_updated_at
before update on public.stories
for each row execute function public.set_updated_at();

-- auto profile create after auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'publisher')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Current user helper role
create or replace function public.current_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Public view
create or replace view public.stories_public as
select id, title, slug, excerpt, content, published_at
from public.stories
where status = 'published';

-- Admin view
create or replace view public.stories_admin as
select s.*, p.full_name as author_name, p.email as author_email
from public.stories s
left join public.profiles p on p.id = s.author_id;

create or replace view public.delete_requests_admin as
select d.*
from public.delete_requests d;

-- Schedule publish function
create or replace function public.publish_due_stories()
returns integer
language plpgsql
security definer
as $$
declare updated_count integer;
begin
  update public.stories
  set status = 'published',
      published_at = now(),
      unpublished_at = null
  where status = 'scheduled'
    and publish_at is not null
    and publish_at <= now();

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.delete_requests enable row level security;
alter table public.story_logs enable row level security;
alter table public.story_views enable row level security;

-- Profiles policies
create policy "profiles_select_own_or_admin" on public.profiles
for select using (auth.uid() = id or public.current_role() = 'admin');

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

-- Stories policies
create policy "public_can_read_published_stories" on public.stories
for select using (status = 'published' or auth.uid() = author_id or public.current_role() = 'admin');

create policy "publisher_insert_own_story" on public.stories
for insert with check (auth.uid() = author_id and public.current_role() in ('publisher', 'admin'));

create policy "publisher_update_own_story_or_admin" on public.stories
for update using (auth.uid() = author_id or public.current_role() = 'admin')
with check (auth.uid() = author_id or public.current_role() = 'admin');

create policy "admin_delete_story" on public.stories
for delete using (public.current_role() = 'admin');

-- Delete request policies
create policy "publisher_read_own_delete_requests_or_admin" on public.delete_requests
for select using (requested_by = auth.uid() or public.current_role() = 'admin');

create policy "publisher_insert_own_delete_requests" on public.delete_requests
for insert with check (
  requested_by = auth.uid() and exists (
    select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid()
  )
);

create policy "admin_update_delete_requests" on public.delete_requests
for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- Logs policies
create policy "admin_read_logs" on public.story_logs
for select using (public.current_role() = 'admin');

create policy "admin_insert_logs" on public.story_logs
for insert with check (public.current_role() = 'admin');

-- Story views policies
create policy "anyone_insert_story_views" on public.story_views
for insert with check (true);

create policy "admin_read_story_views" on public.story_views
for select using (public.current_role() = 'admin');

-- Helpful indexes
create index if not exists idx_stories_author_id on public.stories(author_id);
create index if not exists idx_stories_status on public.stories(status);
create index if not exists idx_stories_publish_at on public.stories(publish_at);
create index if not exists idx_delete_requests_story_id on public.delete_requests(story_id);
create index if not exists idx_story_views_story_id on public.story_views(story_id);

-- Example cron command to run later in Supabase if pg_cron is enabled:
-- select cron.schedule('publish-due-stories', '*/5 * * * *', $$select public.publish_due_stories();$$);
