create or replace function public.create_student_invite(
  p_student_email text,
  p_student_name text default ''
)
returns table (
  invite_id uuid,
  student_email text,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_tutor_id uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_student_email, '')));
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if v_tutor_id is null then
    raise exception 'Sign in to invite students';
  end if;

  if v_email = '' or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Enter a valid student email';
  end if;

  if not exists (
    select 1
    from public.users
    where id = v_tutor_id
      and role = 'tutor'
  ) then
    raise exception 'Only tutors can invite students';
  end if;

  if exists (
    select 1
    from public.student_invites
    where tutor_id = v_tutor_id
      and lower(public.student_invites.student_email) = v_email
      and status = 'pending'
      and expires_at > now()
  ) then
    raise exception 'An active invite already exists for this email';
  end if;

  if exists (
    select 1
    from public.tutor_students
    join public.users
      on users.id = tutor_students.student_id
    where tutor_students.tutor_id = v_tutor_id
      and lower(users.email) = v_email
  ) then
    raise exception 'This student is already added';
  end if;

  if exists (
    select 1
    from public.users
    where lower(email) = v_email
      and role = 'tutor'
  ) then
    raise exception 'This email belongs to a tutor account';
  end if;

  update public.student_invites
  set status = 'expired'
  where tutor_id = v_tutor_id
    and lower(public.student_invites.student_email) = v_email
    and status = 'pending'
    and expires_at <= now();

  insert into public.student_invites (
    tutor_id,
    student_email,
    student_name,
    token_hash,
    expires_at
  )
  values (
    v_tutor_id,
    v_email,
    coalesce(trim(p_student_name), ''),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_expires_at
  )
  returning id, public.student_invites.student_email, public.student_invites.expires_at
  into invite_id, student_email, expires_at;

  token := v_token;
  return next;
end;
$$;

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

  select lower(email)
  into v_student_email
  from auth.users
  where id = v_student_id;

  if v_student_email is null then
    raise exception 'student_email_not_found';
  end if;

  select *
  into v_invite
  from public.student_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
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
    where id = v_invite.id;

    raise exception 'invite_expired';
  end if;

  if lower(v_invite.student_email) <> v_student_email then
    raise exception 'invite_email_mismatch';
  end if;

  if exists (
    select 1
    from public.users
    where id = v_student_id
      and role <> 'student'
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
  on conflict (tutor_id, student_id) do nothing;

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
  on conflict (student_id, lesson_id) do nothing;

  update public.student_invites
  set
    status = 'accepted',
    accepted_by_student_id = v_student_id,
    accepted_at = now()
  where id = v_invite.id;

  tutor_id := v_invite.tutor_id;
  student_id := v_student_id;
  return next;
end;
$$;
