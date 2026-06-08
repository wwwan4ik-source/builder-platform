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
    where public.student_invites.tutor_id = v_tutor_id
      and lower(public.student_invites.student_email) = v_email
      and public.student_invites.status = 'pending'
      and public.student_invites.expires_at > now()
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
  where public.student_invites.tutor_id = v_tutor_id
    and lower(public.student_invites.student_email) = v_email
    and public.student_invites.status = 'pending'
    and public.student_invites.expires_at <= now();

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
