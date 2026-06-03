-- Maintenance script for moving old prototype data from MVP_TUTOR_ID
-- to a real Supabase Auth tutor profile.
--
-- Replace this email before running:
--   your@email.com
--
-- Run the PREVIEW queries first. Run the TRANSACTION only after the target
-- tutor id and counts look correct.

-- 1) Find the target authenticated tutor profile.
select id, email, name, role, created_at
from public.users
where email = 'your@email.com'
  and role = 'tutor';

-- 2) Preview legacy data that will be moved.
select 'lessons' as table_name, count(*) as rows_to_move
from public.lessons
where tutor_id = 'ac0c117d-99a9-4bf7-baeb-0c115d9d8a22'
union all
select 'tutor_students' as table_name, count(*) as rows_to_move
from public.tutor_students
where tutor_id = 'ac0c117d-99a9-4bf7-baeb-0c115d9d8a22'
union all
select 'student_lessons' as table_name, count(*) as rows_to_move
from public.student_lessons
where assigned_by_tutor_id = 'ac0c117d-99a9-4bf7-baeb-0c115d9d8a22';

-- 3) Move legacy data to the target tutor.
begin;

do $$
declare
  legacy_tutor_id uuid := 'ac0c117d-99a9-4bf7-baeb-0c115d9d8a22';
  target_tutor_email text := 'your@email.com';
  target_tutor_id uuid;
begin
  select id
  into target_tutor_id
  from public.users
  where email = target_tutor_email
    and role = 'tutor';

  if target_tutor_id is null then
    raise exception 'No tutor profile found for email %', target_tutor_email;
  end if;

  update public.lessons
  set tutor_id = target_tutor_id
  where tutor_id = legacy_tutor_id;

  update public.tutor_students as tutor_student_link
  set tutor_id = target_tutor_id
  where tutor_student_link.tutor_id = legacy_tutor_id
    and not exists (
      select 1
      from public.tutor_students existing_link
      where existing_link.tutor_id = target_tutor_id
        and existing_link.student_id = tutor_student_link.student_id
    );

  delete from public.tutor_students
  where tutor_id = legacy_tutor_id;

  update public.student_lessons
  set assigned_by_tutor_id = target_tutor_id
  where assigned_by_tutor_id = legacy_tutor_id;
end $$;

commit;

-- 4) Verify target data after the move.
select 'lessons' as table_name, count(*) as current_tutor_rows
from public.lessons
where tutor_id = (
  select id from public.users where email = 'your@email.com' and role = 'tutor'
)
union all
select 'tutor_students' as table_name, count(*) as current_tutor_rows
from public.tutor_students
where tutor_id = (
  select id from public.users where email = 'your@email.com' and role = 'tutor'
)
union all
select 'student_lessons' as table_name, count(*) as current_tutor_rows
from public.student_lessons
where assigned_by_tutor_id = (
  select id from public.users where email = 'your@email.com' and role = 'tutor'
);
