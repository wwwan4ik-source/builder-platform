# Project Architecture

Дата: 2026-05-31

## Продуктова рамка

`Libruary` - це простий no-code builder для створення інтерактивних уроків.

MVP не будує повну LMS. Перший продукт має допомогти автору:

```text
відкрити dashboard
↓
створити урок
↓
зібрати урок із блоків
↓
зберегти урок
↓
побачити його в Saved lessons
```

## Основна структура застосунку

Перший екран після входу - `Dashboard`.

Застосунок має стабільну app shell структуру:

```text
App shell
├─ Left navigation
│  ├─ Dashboard
│  └─ Saved lessons
└─ Main content
   ├─ Dashboard page
   ├─ Saved lessons page
   └─ Lesson builder full-page modal
```

Ліва навігація завжди показує два основні розділи:

1. `Dashboard`
2. `Saved lessons`

## App Routes

Tutor-side pages мають окремі shareable URLs через hash routing:

```text
#/sign-in
#/create-account
#/dashboard
#/lessons
#/students
```

Hash routing обрано як мінімальний MVP крок без додавання router dependency і без потреби налаштовувати server-side SPA fallback. Refresh має відновлювати активну сторінку.

Builder modal поки не має deep link. Окремі lesson/student attempt routes треба додати перед повним Student flow.

Правило для всіх нових сторінок: якщо з'являється новий page-level screen, він має отримати окремий route одразу. Не додавати нові сторінки тільки як internal React state без URL.

## Dashboard

Dashboard - це стартова робоча сторінка автора.

На dashboard має бути:

- заголовок сторінки
- основна кнопка `Create lesson`
- короткий стан по уроках: скільки збережено, скільки draft, скільки published
- порожній стан, якщо ще немає жодного уроку

`Create lesson` відкриває `Lesson builder` як full-page modal.

Ціль dashboard: дати автору одну очевидну дію - створити новий урок.

## Lesson Builder As Full-Page Modal

Lesson builder - це не окрема навігаційна сторінка MVP, а full-page modal поверх app shell.

Причина: створення уроку є фокусним режимом. Автор має бачити весь простір builder-а, але повинен мати можливість вийти назад у dashboard або saved lessons.

Builder відкривається у двох сценаріях:

- з dashboard після натискання `Create lesson`
- зі сторінки `Saved lessons` після натискання `Open` на конкретному уроці

Builder має:

- поле або header для назви уроку
- canvas зі списком блоків
- праву панель або бібліотеку блоків
- кнопку `Save`
- кнопку `Close`

Кнопка `Close` закриває full-page modal і повертає користувача на попередній екран.

Кнопка `Save` зберігає урок у базу і після успішного збереження переводить користувача на `Saved lessons`.

## Saved Lessons

`Saved lessons` - сторінка зі збереженими уроками.

Уроки живуть у таблиці.

Таблиця має показувати:

- назву уроку
- статус: `draft` або `published`
- кількість блоків
- дату останнього оновлення
- дію `Open`

Після збереження нового уроку він має з'явитися в цій таблиці.

Базовий flow:

```text
Dashboard
↓
Create lesson
↓
Lesson builder full-page modal
↓
Save
↓
Saved lessons
↓
Lesson appears in table
```

## UI State Model

На рівні React MVP може мати такі основні стани:

```ts
type AppPage = "dashboard" | "saved-lessons"

type BuilderMode = {
  isOpen: boolean
  lessonId: string | null
  returnTo: AppPage
}
```

Рекомендована логіка:

- `currentPage = "dashboard"` за замовчуванням
- `builder.isOpen = true` відкриває full-page modal
- `builder.lessonId = null` означає новий урок
- `builder.lessonId = string` означає редагування збереженого уроку
- `builder.returnTo` потрібен для коректного `Close`

## Lesson Data Model

Поточна таблиця Supabase:

```text
lessons
├─ id uuid
├─ tutor_id uuid | null
├─ title text
├─ status draft | published
├─ blocks jsonb
├─ share_slug text | null
├─ created_at timestamptz
├─ updated_at timestamptz
└─ published_at timestamptz | null
```

Для цього flow достатньо:

- `id` - ідентифікатор уроку
- `tutor_id` - власник уроку в MVP tutor flow
- `title` - назва уроку
- `status` - стан уроку
- `blocks` - масив блоків builder-а
- `updated_at` - сортування і відображення в таблиці

Нові уроки після auth foundation зберігаються з authenticated tutor:

```text
lessons.tutor_id = auth.users.id
```

`MVP_TUTOR_ID` залишився тільки як legacy seed для старих prototype/demo даних:

```text
MVP_TUTOR_ID = ac0c117d-99a9-4bf7-baeb-0c115d9d8a22
```

## Tutor And Student Data Model

Поточний MVP має базову структуру двох ролей:

```text
users
├─ id uuid
├─ email text | null
├─ name text
├─ role tutor | student
├─ must_change_password boolean
├─ created_at timestamptz
└─ updated_at timestamptz
```

`users` зараз використовується як profile/role table. Паролі не зберігаються в `public.users`; tutor login заведений через Supabase Auth.

Поточна auth-зв'язка для tutor:

```text
auth.users.id
↓
public.users.id
↓
lessons.tutor_id
```

У header tutor profile не показується окремим текстовим блоком. Видимим control є круглий avatar з ініціалами; після кліку відкривається popover з:

- tutor name
- tutor email
- `Log out`

Auth screen має бути мінімальним:

- без декоративної icon tile над заголовком
- title: `Sign in` або `Create account`
- перемикач між sign in/create account - secondary gray button

Modal/popup buttons:

- action buttons inside modals/popups are text-only, without leading icons
- close actions inside full-page modals use text label `Close`, not an icon-only button

Зв'язок tutor → student:

```text
tutor_students
├─ id uuid
├─ tutor_id uuid
├─ student_id uuid
└─ created_at timestamptz
```

Призначення уроків студентам:

```text
student_lessons
├─ id uuid
├─ student_id uuid
├─ lesson_id uuid
├─ assigned_by_tutor_id uuid
├─ status assigned | in_progress | completed
├─ progress integer
├─ started_at timestamptz | null
├─ completed_at timestamptz | null
├─ created_at timestamptz
└─ updated_at timestamptz
```

У `student_lessons` є унікальна пара:

```text
student_id + lesson_id
```

Це не дозволяє призначити один і той самий урок одному студенту двічі.

## Students Flow

У sidebar є пункт `Students`.

Сторінка `Students` показує таблицю:

- student name
- email
- assigned lessons count
- added date
- actions menu

Поведінка:

```text
Tutor opens Students
↓
load tutor_students by current tutor id
↓
load matching users
↓
load student_lessons count
↓
render students table
```

Пошук працює локально по:

- student name
- email

Фільтрів на сторінці Students поки немає.

## Add Student Flow

Кнопка `Add student` відкриває modal.

Поточна MVP-форма:

```text
Name
Cancel
Create
```

Submit flow:

```text
insert into users
  name = entered name
  role = student
  must_change_password = false
↓
insert into tutor_students
  tutor_id = current tutor id
  student_id = created user id
↓
reload Students table
```

Email, password і temporary password поки не додані в UI. Це наступний auth-related step.

## Assign Lesson Flow

У таблиці Students actions відкриваються через кнопку з трьома крапками.

Поточний пункт меню:

```text
Assign lesson
```

Поведінка:

```text
Tutor clicks three dots on student row
↓
clicks Assign lesson
↓
modal opens
↓
tutor chooses one of own lessons
↓
insert into student_lessons
  student_id
  lesson_id
  assigned_by_tutor_id = current tutor id
  status = assigned
  progress = 0
↓
reload Students table
```

Якщо lesson уже призначений цьому student, UI показує:

```text
This lesson is already assigned to this student
```

## Roles, Statuses, And Modes

У платформі є дві базові ролі:

- `Tutor` - створює, редагує, переглядає, публікує і призначає уроки.
- `Student` - проходить призначені або опубліковані уроки.

Статуси уроку мають залишатися простими:

```ts
type LessonStatus = "draft" | "published"
```

Режим відкриття уроку - це окрема річ:

```ts
type LessonMode = "edit" | "student"
```

Правила:

- `draft` відкривається для автора в `edit` mode.
- `published` відкривається як student/view mode.
- студент не має проходити `draft`.

Базовий flow:

```text
Author creates lesson
↓
status = draft, mode = edit
↓
Author clicks Publish
↓
status = published
↓
Student opens lesson
↓
mode = student
```

## Save Flow

Для нового уроку:

```text
Create lesson
↓
lessonId = null
↓
author edits blocks
↓
Save
↓
insert into lessons
↓
receive lesson id
↓
refresh lessons list
↓
close builder
↓
go to Saved lessons
```

Для існуючого уроку:

```text
Open saved lesson
↓
lessonId = existing id
↓
author edits blocks
↓
Save
↓
update lessons by id
↓
refresh lessons list
↓
close builder
↓
go to Saved lessons
```

## Lesson Blocks

Поточні блоки в прототипі:

- `title`
- `radio-field`
- `checkbox-field`
- `text-field`
- `image-upload`
- `fill-blanks`

У MVP вони зберігаються в `lessons.blocks` як JSON.

UI-only поля не мають зберігатися як поведінковий стан уроку. Перед збереженням їх треба нормалізувати, наприклад:

- закрити відкриті меню
- скинути transient placement state
- прибрати активні editor-only прапорці

## Component Direction

Поточний `App.tsx` усе ще містить lesson builder workflow, але базовий refactor уже почався.

Станом на 2026-06-03 винесено:

```text
src/
├─ constants/
│  └─ mvp.ts
├─ components/
│  └─ app-shell.tsx
├─ lib/
│  ├─ format.ts
│  ├─ lesson-api.ts
│  ├─ lesson-elements.ts
│  ├─ student-api.ts
│  └─ supabase.ts
└─ types/
   ├─ lesson.ts
   └─ student.ts
```

Що вже не живе в `App.tsx`:

- shared lesson/student types
- auth bootstrap and tutor profile
- lesson block factory/hydration helpers
- formatting helpers
- Supabase queries for lessons
- Supabase queries for students and assignments
- app shell layout/navigation

Наступний архітектурний крок - розділити lesson builder на зрозумілі компоненти:

```text
src/
├─ App.tsx
├─ components/
│  ├─ dashboard-page.tsx
│  ├─ saved-lessons-page.tsx
│  ├─ students-page.tsx
│  ├─ lesson-builder-modal.tsx
│  └─ lesson-blocks/
│     ├─ title-block.tsx
│     ├─ radio-field-block.tsx
│     ├─ checkbox-field-block.tsx
│     ├─ text-field-block.tsx
│     ├─ image-upload-block.tsx
│     └─ fill-blanks-block.tsx
```

Мета цього розділення:

- `App.tsx` керує сторінками і modal state
- `dashboard-page` відповідає за стартовий екран
- `saved-lessons-page` відповідає за таблицю
- `students-page` відповідає за students table
- `lesson-builder-modal` відповідає за full-page builder
- `lib/lesson-api.ts` інкапсулює Supabase запити уроків
- `lib/student-api.ts` інкапсулює Supabase запити students/assignments
- `types/lesson.ts` і `types/student.ts` зберігають shared types

## Current Prototype Status

Станом на 2026-06-03 прототип уже має:

- dashboard зі статистикою уроків і recent lessons
- sidebar navigation: `Dashboard`, `Lessons`, `Students`
- full-page lesson builder modal
- створення, редагування, збереження, публікацію і видалення уроків
- локальний пошук і фільтр статусу на сторінці `Lessons`
- student/view mode для published lessons
- базову сторінку `Students`
- створення student profile за ім'ям
- призначення уроку student через `student_lessons`
- перегляд призначених уроків конкретного student

Поточний прототип проходить production build:

```text
npm run build
```

## Known Gaps And Risks

### Schema alignment

Код працює з `lessons.tutor_id`. `001_create_lessons.sql` тепер одразу створює `tutor_id`.

`003_create_users_and_lesson_tutors.sql` залишає backward-compatible rename з `owner_id` в `tutor_id`, щоб старі локальні бази можна було оновити без ручної правки.

Міграції треба застосовувати в numeric order.

### Hardcoded MVP tutor

У legacy seed є тимчасовий tutor:

```text
MVP_TUTOR_ID = ac0c117d-99a9-4bf7-baeb-0c115d9d8a22
```

Новий frontend flow більше не використовує hardcoded tutor для створення уроків або assignment. Він бере tutor id з Supabase Auth session.

Це покриває seed:

```text
supabase/006_seed_mvp_tutor.sql
```

Старі prototype дані, створені під legacy tutor, можна перенести на real authenticated tutor через maintenance script:

```text
supabase/008_move_legacy_mvp_data_to_auth_tutor.sql
```

Цей script не треба запускати як regular migration для кожного середовища. Його запускають вручну після заміни `your@email.com` на email потрібного tutor і preview counts.

### Auth policies

`supabase/007_add_authenticated_tutor_policies.sql` додає authenticated grants/policies для:

- tutor profile
- tutor-owned lessons
- tutor student links
- tutor-created assignments

Старі anon MVP policies поки залишені для compatibility. Їх треба прибрати окремим RLS-hardening кроком після перевірки tutor і student flows.

Якщо tutor sign in проходить на рівні Supabase Auth, але frontend лишається на auth screen, перша перевірка - чи застосовано `007_add_authenticated_tutor_policies.sql`. Без authenticated profile policies app не зможе створити або прочитати `public.users` row для tutor.

### Student flow is assignment-only

Поточний `student` шар - це tutor-side management. Student login, проходження уроку, збереження відповідей і results ще не реалізовані.

### Published lessons are locked for edit

У `Lessons` action menu published lessons відкриваються як view/student mode, а edit disabled. Якщо продуктово треба редагувати published lessons, потрібно додати окреме правило: unpublish, duplicate draft або edit published.

## Documentation Rule

Кожна зміна в коді, схемі даних або продуктовому flow має супроводжуватися оновленням документації.

Мінімум:

- зміни в React flow - оновити `docs/project-architecture.md`
- зміни в MVP scope або продуктових рішеннях - оновити `../Experements/mvp-product-context.md`
- зміни в Supabase schema - оновити `docs/project-architecture.md` і відповідну SQL migration

## Recommended Next Steps

1. Винести lesson builder modal і lesson block rendering з `App.tsx`.
2. Додати student account creation credentials або invite flow.
3. Додати справжній student attempt flow: student відкриває призначений урок, відповідає, завершує урок, `student_lessons.progress/status` оновлюються.
4. Додати results layer для tutor: completion, answers, basic quiz score.
5. Додати share link/public lesson route після того, як published/student flow стабільний.

## MVP Boundaries

У цьому етапі робимо:

- dashboard як першу сторінку
- ліву навігацію
- full-page builder modal
- створення нового уроку
- збереження уроку
- таблицю saved lessons
- відкриття збереженого уроку на редагування

Цей список був початковим acceptance baseline. Частина функціональності вже вийшла за нього: `Students`, `Publish`, `student/view mode`, assignment і delete lesson уже додані в прототип.

Не робимо в цьому етапі:

- авторизацію
- ролі
- courses/modules hierarchy
- student preview
- public share link
- results/attempts
- publish flow
- складну аналітику

## Acceptance Criteria

Функціональність вважається готовою, коли:

- застосунок відкривається на dashboard
- зліва видно navigation з `Dashboard` і `Saved lessons`
- `Create lesson` відкриває full-page builder modal
- builder можна закрити без збереження
- `Save` створює або оновлює lesson у Supabase
- після `Save` користувач переходить на `Saved lessons`
- новий урок видно в таблиці
- `Open` у таблиці відкриває цей урок у builder modal
