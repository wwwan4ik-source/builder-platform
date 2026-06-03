grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, delete on public.tutor_students to authenticated;
grant select, insert, update, delete on public.student_lessons to authenticated;

drop policy if exists "Allow authenticated profile reads" on public.users;
drop policy if exists "Allow authenticated tutor student profile reads" on public.users;
drop policy if exists "Allow authenticated tutor profile inserts" on public.users;
drop policy if exists "Allow authenticated tutor student profile inserts" on public.users;
drop policy if exists "Allow authenticated tutor profile updates" on public.users;
drop policy if exists "Allow authenticated tutor lesson reads" on public.lessons;
drop policy if exists "Allow authenticated tutor lesson inserts" on public.lessons;
drop policy if exists "Allow authenticated tutor lesson updates" on public.lessons;
drop policy if exists "Allow authenticated tutor lesson deletes" on public.lessons;
drop policy if exists "Allow authenticated tutor student link reads" on public.tutor_students;
drop policy if exists "Allow authenticated tutor student link inserts" on public.tutor_students;
drop policy if exists "Allow authenticated tutor student link deletes" on public.tutor_students;
drop policy if exists "Allow authenticated tutor assignment reads" on public.student_lessons;
drop policy if exists "Allow authenticated tutor assignment inserts" on public.student_lessons;
drop policy if exists "Allow authenticated tutor assignment updates" on public.student_lessons;
drop policy if exists "Allow authenticated tutor assignment deletes" on public.student_lessons;

create policy "Allow authenticated profile reads"
on public.users
for select
to authenticated
using (id = auth.uid());

create policy "Allow authenticated tutor student profile reads"
on public.users
for select
to authenticated
using (
  exists (
    select 1
    from public.tutor_students
    where tutor_students.tutor_id = auth.uid()
      and tutor_students.student_id = users.id
  )
);

create policy "Allow authenticated tutor profile inserts"
on public.users
for insert
to authenticated
with check (id = auth.uid() and role = 'tutor');

create policy "Allow authenticated tutor student profile inserts"
on public.users
for insert
to authenticated
with check (role = 'student');

create policy "Allow authenticated tutor profile updates"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Allow authenticated tutor lesson reads"
on public.lessons
for select
to authenticated
using (tutor_id = auth.uid());

create policy "Allow authenticated tutor lesson inserts"
on public.lessons
for insert
to authenticated
with check (tutor_id = auth.uid());

create policy "Allow authenticated tutor lesson updates"
on public.lessons
for update
to authenticated
using (tutor_id = auth.uid())
with check (tutor_id = auth.uid());

create policy "Allow authenticated tutor lesson deletes"
on public.lessons
for delete
to authenticated
using (tutor_id = auth.uid());

create policy "Allow authenticated tutor student link reads"
on public.tutor_students
for select
to authenticated
using (tutor_id = auth.uid());

create policy "Allow authenticated tutor student link inserts"
on public.tutor_students
for insert
to authenticated
with check (tutor_id = auth.uid());

create policy "Allow authenticated tutor student link deletes"
on public.tutor_students
for delete
to authenticated
using (tutor_id = auth.uid());

create policy "Allow authenticated tutor assignment reads"
on public.student_lessons
for select
to authenticated
using (
  assigned_by_tutor_id = auth.uid()
  and exists (
    select 1
    from public.tutor_students
    where tutor_students.tutor_id = auth.uid()
      and tutor_students.student_id = student_lessons.student_id
  )
);

create policy "Allow authenticated tutor assignment inserts"
on public.student_lessons
for insert
to authenticated
with check (
  assigned_by_tutor_id = auth.uid()
  and exists (
    select 1
    from public.tutor_students
    where tutor_students.tutor_id = auth.uid()
      and tutor_students.student_id = student_lessons.student_id
  )
  and exists (
    select 1
    from public.lessons
    where lessons.id = student_lessons.lesson_id
      and lessons.tutor_id = auth.uid()
  )
);

create policy "Allow authenticated tutor assignment updates"
on public.student_lessons
for update
to authenticated
using (
  assigned_by_tutor_id = auth.uid()
  and exists (
    select 1
    from public.tutor_students
    where tutor_students.tutor_id = auth.uid()
      and tutor_students.student_id = student_lessons.student_id
  )
)
with check (
  assigned_by_tutor_id = auth.uid()
  and exists (
    select 1
    from public.tutor_students
    where tutor_students.tutor_id = auth.uid()
      and tutor_students.student_id = student_lessons.student_id
  )
);

create policy "Allow authenticated tutor assignment deletes"
on public.student_lessons
for delete
to authenticated
using (
  assigned_by_tutor_id = auth.uid()
  and exists (
    select 1
    from public.tutor_students
    where tutor_students.tutor_id = auth.uid()
      and tutor_students.student_id = student_lessons.student_id
  )
);
