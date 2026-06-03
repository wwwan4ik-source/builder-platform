# Libruary

`Libruary` is an MVP no-code builder for interactive lessons. The current prototype focuses on a tutor-side workflow: create lessons, save drafts, publish, manage students, and assign lessons.

## Current Flows

- Dashboard with lesson stats and recent lessons
- Lessons list with search and status filter
- Full-page lesson builder modal
- Draft and published lesson states
- Student/view mode for published lessons
- Students list
- Add student
- Assign lesson to student
- View assigned lessons for a student
- Tutor sign up/sign in through Supabase Auth

## Tech Stack

- React
- TypeScript
- Vite
- Supabase
- Tailwind CSS
- lucide-react icons

## Product Documentation

- [Project architecture](./docs/project-architecture.md)
- [MVP product context](../Experements/mvp-product-context.md)

## Environment

Create `.env.local` from `.env.example` and set:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The app can render without Supabase config, but saving lessons, loading students, and assignments require these variables.

## Supabase Setup

Run migrations in numeric order:

```text
supabase/001_create_lessons.sql
supabase/002_allow_lesson_deletes.sql
supabase/003_create_users_and_lesson_tutors.sql
supabase/004_create_tutor_students.sql
supabase/005_create_student_lessons.sql
supabase/006_seed_mvp_tutor.sql
supabase/007_add_authenticated_tutor_policies.sql
supabase/008_move_legacy_mvp_data_to_auth_tutor.sql
```

`006_seed_mvp_tutor.sql` creates the temporary MVP tutor used by older prototype data:

```text
MVP_TUTOR_ID = ac0c117d-99a9-4bf7-baeb-0c115d9d8a22
```

`007_add_authenticated_tutor_policies.sql` prepares authenticated tutor ownership policies. The previous anon MVP policies are still present for compatibility during the prototype phase; tighten/remove them only when RLS is tested end to end.

If tutor sign in succeeds in Supabase Auth but the app stays on the sign-in screen, check that `007_add_authenticated_tutor_policies.sql` has been applied. Without it, the app may not be allowed to create/read the matching `public.users` tutor profile.

`008_move_legacy_mvp_data_to_auth_tutor.sql` is a maintenance script, not a normal migration. Use it only when old prototype lessons/students were created under `MVP_TUTOR_ID` and need to be moved to a real authenticated tutor. Replace `your@email.com`, run the preview queries first, then run the transaction.

## Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

## Architecture Notes

`App.tsx` owns the top-level app state and the lesson builder workflow. Shared types, formatting helpers, MVP constants, lesson block helpers, and Supabase request logic live outside `App.tsx`:

```text
src/constants/mvp.ts
src/types/lesson.ts
src/types/student.ts
src/lib/format.ts
src/lib/lesson-elements.ts
src/lib/lesson-api.ts
src/lib/student-api.ts
src/lib/auth-api.ts
src/components/app-shell.tsx
src/components/auth-screen.tsx
```

The next refactor target is the builder itself: split lesson block rendering into focused components before adding the full Student flow.

## Auth Notes

Tutor auth uses Supabase Auth. On sign up or sign in, the app ensures a matching `public.users` profile:

```text
public.users.id = auth.users.id
public.users.role = tutor
```

Lesson, student link, and assignment requests now use the authenticated tutor id instead of the previous hardcoded MVP tutor id.
