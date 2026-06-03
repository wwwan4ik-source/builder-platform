create table if not exists public.student_lessons (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  assigned_by_tutor_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

drop trigger if exists student_lessons_set_updated_at on public.student_lessons;

create trigger student_lessons_set_updated_at
before update on public.student_lessons
for each row
execute function public.set_updated_at();

alter table public.student_lessons enable row level security;

grant select, insert, update, delete on public.student_lessons to anon;

create policy "Allow anon MVP student lesson reads"
on public.student_lessons
for select
to anon
using (true);

create policy "Allow anon MVP student lesson inserts"
on public.student_lessons
for insert
to anon
with check (true);

create policy "Allow anon MVP student lesson updates"
on public.student_lessons
for update
to anon
using (true)
with check (true);

create policy "Allow anon MVP student lesson deletes"
on public.student_lessons
for delete
to anon
using (true);
