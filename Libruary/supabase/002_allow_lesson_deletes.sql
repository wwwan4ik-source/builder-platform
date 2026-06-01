grant delete on public.lessons to anon;

drop policy if exists "Allow anon MVP lesson deletes" on public.lessons;

create policy "Allow anon MVP lesson deletes"
on public.lessons
for delete
to anon
using (true);
