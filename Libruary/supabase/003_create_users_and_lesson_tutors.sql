create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text not null default '',
  role text not null default 'student' check (role in ('tutor', 'student')),
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists users_set_updated_at on public.users;

create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lessons'
      and column_name = 'owner_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lessons'
      and column_name = 'tutor_id'
  ) then
    alter table public.lessons rename column owner_id to tutor_id;
  end if;
end $$;

alter table public.lessons
add column if not exists tutor_id uuid;

alter table public.lessons
drop constraint if exists lessons_tutor_id_fkey;

alter table public.lessons
add constraint lessons_tutor_id_fkey
foreign key (tutor_id)
references public.users(id)
on delete set null;

alter table public.users enable row level security;

grant select, insert, update on public.users to anon;

create policy "Allow anon MVP user reads"
on public.users
for select
to anon
using (true);

create policy "Allow anon MVP user inserts"
on public.users
for insert
to anon
with check (true);

create policy "Allow anon MVP user updates"
on public.users
for update
to anon
using (true)
with check (true);
