create or replace function public.regenerate_student_invite_link(
  p_invite_id uuid
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
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if v_tutor_id is null then
    raise exception 'Sign in to regenerate invite links';
  end if;

  update public.student_invites
  set
    token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
    expires_at = v_expires_at
  where public.student_invites.id = p_invite_id
    and public.student_invites.tutor_id = v_tutor_id
    and public.student_invites.status = 'pending'
  returning
    public.student_invites.id,
    public.student_invites.student_email,
    public.student_invites.expires_at
  into invite_id, student_email, expires_at;

  if invite_id is null then
    raise exception 'Pending invite was not found';
  end if;

  token := v_token;
  return next;
end;
$$;

revoke execute on function public.regenerate_student_invite_link(uuid) from public, anon;
grant execute on function public.regenerate_student_invite_link(uuid) to authenticated;
