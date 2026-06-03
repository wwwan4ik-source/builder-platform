insert into public.users (
  id,
  email,
  name,
  role,
  must_change_password
) values (
  'ac0c117d-99a9-4bf7-baeb-0c115d9d8a22',
  null,
  'Anna',
  'tutor',
  false
)
on conflict (id) do update
set
  name = excluded.name,
  role = excluded.role,
  must_change_password = excluded.must_change_password;

