create or replace function public.accept_student_invite(
  p_token text,
  p_student_name text default ''
)
returns table (
  tutor_id uuid,
  student_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_student_id uuid := auth.uid();
  v_student_email text;
  v_invite public.student_invites%rowtype;
begin
  if v_student_id is null then
    raise exception 'not_authenticated';
  end if;

  select lower(auth_user.email)
  into v_student_email
  from auth.users auth_user
  where auth_user.id = v_student_id;

  if v_student_email is null then
    raise exception 'student_email_not_found';
  end if;

  select invite.*
  into v_invite
  from public.student_invites invite
  where invite.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if v_invite.id is null then
    raise exception 'invite_not_found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'invite_not_pending';
  end if;

  if v_invite.expires_at <= now() then
    update public.student_invites
    set status = 'expired'
    where public.student_invites.id = v_invite.id;

    raise exception 'invite_expired';
  end if;

  if lower(v_invite.student_email) <> v_student_email then
    raise exception 'invite_email_mismatch';
  end if;

  if exists (
    select 1
    from public.users app_user
    where app_user.id = v_student_id
      and app_user.role <> 'student'
  ) then
    raise exception 'account_is_not_student';
  end if;

  insert into public.users (
    id,
    email,
    name,
    role,
    must_change_password
  )
  values (
    v_student_id,
    v_student_email,
    coalesce(nullif(trim(p_student_name), ''), v_invite.student_name, ''),
    'student',
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = case
      when public.users.name = '' then excluded.name
      else public.users.name
    end,
    role = 'student',
    must_change_password = false;

  insert into public.tutor_students (
    tutor_id,
    student_id
  )
  values (
    v_invite.tutor_id,
    v_student_id
  )
  on conflict on constraint tutor_students_tutor_id_student_id_key do nothing;

  insert into public.student_lessons (
    student_id,
    lesson_id,
    assigned_by_tutor_id,
    status,
    progress
  )
  select
    v_student_id,
    invite_lesson.lesson_id,
    invite_lesson.assigned_by_tutor_id,
    'assigned',
    0
  from public.student_invite_lessons invite_lesson
  where invite_lesson.invite_id = v_invite.id
  on conflict on constraint student_lessons_student_id_lesson_id_key do nothing;

  update public.student_invites
  set
    status = 'accepted',
    accepted_by_student_id = v_student_id,
    accepted_at = now()
  where public.student_invites.id = v_invite.id;

  accept_student_invite.tutor_id := v_invite.tutor_id;
  accept_student_invite.student_id := v_student_id;
  return next;
end;
$$;
