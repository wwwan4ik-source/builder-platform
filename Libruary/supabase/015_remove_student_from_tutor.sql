create or replace function public.remove_student_from_tutor(
  p_student_id uuid default null,
  p_invite_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_tutor_id uuid := auth.uid();
begin
  if v_tutor_id is null then
    raise exception 'Sign in to delete students';
  end if;

  if not exists (
    select 1
    from public.users
    where users.id = v_tutor_id
      and users.role = 'tutor'
  ) then
    raise exception 'Only tutors can delete students';
  end if;

  if p_invite_id is not null then
    delete from public.student_invites
    where student_invites.id = p_invite_id
      and student_invites.tutor_id = v_tutor_id
      and student_invites.status = 'pending';

    if not found then
      raise exception 'Student invite not found';
    end if;

    return;
  end if;

  if p_student_id is null then
    raise exception 'Student not found';
  end if;

  delete from public.student_lessons
  where student_lessons.student_id = p_student_id
    and student_lessons.assigned_by_tutor_id = v_tutor_id;

  delete from public.tutor_students
  where tutor_students.student_id = p_student_id
    and tutor_students.tutor_id = v_tutor_id;

  if not found then
    raise exception 'Student not found';
  end if;
end;
$$;

revoke execute on function public.remove_student_from_tutor(uuid, uuid) from public, anon;
grant execute on function public.remove_student_from_tutor(uuid, uuid) to authenticated;
