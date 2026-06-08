alter table public.student_invites
add column if not exists invited_auth_user_id uuid;

create or replace function public.get_student_invite(
  p_token text
)
returns table (
  invite_id uuid,
  student_name text,
  student_email text,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invite public.student_invites%rowtype;
begin
  select invite.*
  into v_invite
  from public.student_invites invite
  where invite.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if v_invite.id is null then
    raise exception 'invite_not_found';
  end if;

  if v_invite.status = 'pending' and v_invite.expires_at <= now() then
    update public.student_invites
    set status = 'expired'
    where public.student_invites.id = v_invite.id;

    v_invite.status := 'expired';
  end if;

  invite_id := v_invite.id;
  student_name := v_invite.student_name;
  student_email := v_invite.student_email;
  status := v_invite.status;
  expires_at := v_invite.expires_at;
  return next;
end;
$$;

create or replace function public.activate_student_invite(
  p_token text,
  p_student_id uuid
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
  v_invite public.student_invites%rowtype;
begin
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

  if v_invite.invited_auth_user_id is not null
    and v_invite.invited_auth_user_id <> p_student_id
  then
    raise exception 'invite_student_mismatch';
  end if;

  insert into public.users (
    id,
    email,
    name,
    role,
    must_change_password
  )
  values (
    p_student_id,
    lower(v_invite.student_email),
    coalesce(nullif(trim(v_invite.student_name), ''), split_part(v_invite.student_email, '@', 1)),
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
    p_student_id
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
    p_student_id,
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
    accepted_by_student_id = p_student_id,
    accepted_at = now()
  where public.student_invites.id = v_invite.id;

  activate_student_invite.tutor_id := v_invite.tutor_id;
  activate_student_invite.student_id := p_student_id;
  return next;
end;
$$;

revoke execute on function public.get_student_invite(text) from public;
revoke execute on function public.activate_student_invite(text, uuid) from public;

grant execute on function public.get_student_invite(text) to anon, authenticated;
grant execute on function public.activate_student_invite(text, uuid) to service_role;
