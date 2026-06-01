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
├─ owner_id uuid | null
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
- `title` - назва уроку
- `status` - стан уроку
- `blocks` - масив блоків builder-а
- `updated_at` - сортування і відображення в таблиці

## Roles, Statuses, And Modes

У платформі є дві базові ролі:

- `Author` - створює, редагує, переглядає і публікує уроки.
- `Student` - проходить опубліковані уроки.

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

Поточний `App.tsx` уже містить більшість логіки. Наступний архітектурний крок - розділити його на зрозумілі компоненти:

```text
src/
├─ App.tsx
├─ components/
│  ├─ app-shell.tsx
│  ├─ dashboard-page.tsx
│  ├─ saved-lessons-page.tsx
│  ├─ lesson-builder-modal.tsx
│  └─ lesson-blocks/
│     ├─ title-block.tsx
│     ├─ radio-field-block.tsx
│     ├─ checkbox-field-block.tsx
│     ├─ text-field-block.tsx
│     ├─ image-upload-block.tsx
│     └─ fill-blanks-block.tsx
├─ lib/
│  ├─ supabase.ts
│  └─ lessons.ts
└─ types/
   └─ lesson.ts
```

Мета цього розділення:

- `App.tsx` керує сторінками і modal state
- `app-shell` відповідає за ліву навігацію
- `dashboard-page` відповідає за стартовий екран
- `saved-lessons-page` відповідає за таблицю
- `lesson-builder-modal` відповідає за full-page builder
- `lib/lessons.ts` інкапсулює Supabase запити
- `types/lesson.ts` зберігає типи блоків і уроку

## MVP Boundaries

У цьому етапі робимо:

- dashboard як першу сторінку
- ліву навігацію
- full-page builder modal
- створення нового уроку
- збереження уроку
- таблицю saved lessons
- відкриття збереженого уроку на редагування

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
