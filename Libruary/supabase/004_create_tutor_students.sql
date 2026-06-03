create table if not exists public.tutor_students (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tutor_id, student_id)
);

alter table public.tutor_students enable row level security;

grant select, insert, delete on public.tutor_students to anon;

create policy "Allow anon MVP tutor student reads"
on public.tutor_students
for select
to anon
using (true);

create policy "Allow anon MVP tutor student inserts"
on public.tutor_students
for insert
to anon
with check (true);

create policy "Allow anon MVP tutor student deletes"
on public.tutor_students
for delete
to anon
using (true);
