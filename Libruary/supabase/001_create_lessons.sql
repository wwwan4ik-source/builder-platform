create extension if not exists pgcrypto;

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null,
  title text not null default 'Draft',
  status text not null default 'draft' check (status in ('draft', 'published')),
  blocks jsonb not null default '[]'::jsonb,
  share_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lessons_set_updated_at on public.lessons;

create trigger lessons_set_updated_at
before update on public.lessons
for each row
execute function public.set_updated_at();

alter table public.lessons enable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.lessons to anon;

create policy "Allow anon MVP lesson reads"
on public.lessons
for select
to anon
using (true);

create policy "Allow anon MVP lesson inserts"
on public.lessons
for insert
to anon
with check (true);

create policy "Allow anon MVP lesson updates"
on public.lessons
for update
to anon
using (true)
with check (true);

create policy "Allow anon MVP lesson deletes"
on public.lessons
for delete
to anon
using (true);
