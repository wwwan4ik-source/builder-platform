# MVP Product Context

Дата: 2026-05-30

## Назва робочої ідеї

```text
Interactive Lesson Builder
```

Альтернативні формулювання:

```text
No-code Interactive Lesson Builder
No-code Learning Content Builder
Simple Lesson Builder for Small Education Businesses
```

## Перший ICP

```text
Small education businesses that need interactive lessons without LMS complexity.
```

Українською:

```text
Невеликі освітні бізнеси, яким потрібні інтерактивні уроки без складності LMS.
```

## Хто входить у цей сегмент

- маленькі мовні школи
- онлайн-школи з 2-10 викладачами
- репетиторські студії
- автори мінікурсів
- школи soft skills
- невеликі bootcamp-проєкти
- тренери, які ведуть групові програми
- методисти, які готують матеріали для викладачів

## Їхній головний біль

Вони мають навчальні матеріали, але ці матеріали розкидані по різних інструментах:

```text
Google Docs
Google Slides
PDF
YouTube
Canva
Wordwall
Quizlet
Google Forms
Telegram
Notion
```

Через це створення одного нормального інтерактивного уроку часто виглядає як збирання пазла з багатьох сервісів.

## Core Pain

```text
They use too many disconnected tools and do not want a full LMS.
```

Українською:

```text
Вони використовують забагато розрізнених інструментів і не хочуть налаштовувати складну LMS.
```

## Product Promise

```text
Build, share, and track interactive lessons in minutes.
```

Українською:

```text
Створюйте, поширюйте й відстежуйте інтерактивні уроки за кілька хвилин.
```

Альтернативна більш людська версія:

```text
Create interactive lessons your students can complete, without setting up a full LMS.
```

Українською:

```text
Створюйте інтерактивні уроки, які студенти реально проходять, без налаштування складної LMS.
```

## Основна гіпотеза MVP

```text
Small education businesses want a simple way to create interactive lessons and share them with students without adopting a complex LMS.
```

Українською:

```text
Невеликі освітні бізнеси хочуть простий спосіб створювати інтерактивні уроки й ділитися ними зі студентами без впровадження складної LMS.
```

## Що саме перевіряємо

1. Чи готові користувачі створювати урок у builder-форматі.
2. Чи достатньо їм простих блоків для першої користі.
3. Чи цінний student preview.
4. Чи важливо ділитися уроком через лінк.
5. Чи потрібні базові результати проходження без повної LMS-аналітики.
6. Чи можуть вони замінити частину свого поточного набору інструментів одним простішим продуктом.

## MVP Scope

Перша версія продукту має бути максимально простою.

```text
Create lesson
Add blocks
Edit content
Preview as student
Share link
See basic results
```

## Основний user flow

```text
Користувач створює урок
↓
Додає інтерактивні блоки
↓
Заповнює контент
↓
Перевіряє урок у student preview
↓
Публікує або ділиться лінком
↓
Студент проходить урок
↓
Користувач бачить базові результати
```

## Основні екрани MVP

### 1. Dashboard

Мінімальний список уроків:

- назва уроку
- статус: draft / published
- дата оновлення
- кнопка створення нового уроку

### 2. Lesson Builder

Головний екран продукту.

Потрібно мати:

- назву уроку
- список блоків
- додавання нового блоку
- редагування блоку
- reorder блоків
- save
- preview
- publish/share

### 3. Student Preview

Режим перегляду уроку очима студента.

Потрібно мати:

- послідовний перегляд блоків
- можливість відповідати на інтерактивні питання
- завершення уроку
- простий completion state

### 4. Results

Базові результати без складної аналітики.

Потрібно мати:

- хто пройшов
- коли пройшов
- completion
- відповіді на quiz / open question
- базовий score для тестових блоків

## Блоки MVP

### Must-have

```text
Text
Image
Video
Quiz
Fill in blanks
Matching
Open Question
```

## Поточна бібліотека елементів у прототипі

Станом на 2026-05-31 у прототипі `Libruary` є такі елементи для Lesson Builder:

```text
Title
Single-answer question
Multiple-select question
Write text
Image upload
Fill in blanks
```

### Image upload

Елемент для додавання картинки в урок.

Поведінка:

- користувач додає блок з бібліотеки
- може клікнути на upload area і вибрати файл
- може перетягнути картинку в drag-and-drop area
- після завантаження бачить preview картинки

Цей елемент закриває MVP-блок `Image` і потрібен для прикладів, схем, screenshots та інших візуальних навчальних матеріалів.

### Nice-to-have після першої версії

```text
Flashcards
Checklist
PDF
Audio
Single Choice
Multiple Choice
Reflection
Assignment
```

## Чому саме ці блоки

### Text

Пояснення, інструкція, теорія, вступ до теми.

### Image

Візуальні приклади, схеми, screenshots, навчальні матеріали.

### Video

Пояснення, recorded lessons, YouTube, короткі інструкції.

### Quiz

Перевірка розуміння.

### Fill in blanks

Корисно для мов, термінів, визначень, процесів, формулювань.

### Matching

Корисно для vocabulary, concepts, definitions, process steps.

### Open Question

Корисно для рефлексії, домашніх завдань, коротких відповідей, практичних задач.

## Що не робимо на старті

- AI generation
- повну LMS
- складні ролі та permissions
- groups/cohorts
- payment system
- marketplace
- certificates
- advanced analytics
- SCORM export
- складний course builder з багатьма рівнями
- мобільний застосунок
- grading center
- calendar/scheduling

## Чому не робимо LMS

LMS часто починається зі складної структури:

```text
users
roles
groups
courses
grades
permissions
settings
integrations
```

MVP має починатися з простішої дії:

```text
Create lesson
Add blocks
Preview as student
Share link
See responses
```

## Позиціонування

```text
Not an LMS.
Not a presentation tool.
Not just a quiz generator.

A simple builder for interactive lessons students can actually complete.
```

Українською:

```text
Не LMS.
Не презентаційний інструмент.
Не просто генератор тестів.

Простий білдер інтерактивних уроків, які студенти реально проходять.
```

## Чим продукт може бути кращим за альтернативи

### Простіший за LMS

Не потрібно налаштовувати складну систему, ролі, групи й permissions.

### Структурніший за Google Docs / Notion

Урок не просто читають. Його проходять, виконують завдання й залишають відповіді.

### Легший за H5P / Articulate / iSpring

Фокус не на професійному e-learning production, а на швидкому створенні практичного уроку.

### Менш classroom-oriented за Nearpod / Pear Deck

Підходить не тільки для live classroom, а й для self-paced уроків, маленьких шкіл, студій і авторів курсів.

### Практичніший за AI quiz generators

Не просто генерує питання, а дає місце, де можна зібрати повний навчальний досвід.

## Головна відмінність

```text
The product does not just help create content.
It helps create a learning experience.
```

Українською:

```text
Продукт не просто допомагає створити контент.
Він допомагає зібрати навчальний досвід.
```

Навчальний досвід може виглядати так:

```text
пояснення
↓
приклад
↓
практика
↓
перевірка
↓
рефлексія
↓
результат
```

## Приклад уроку для мовної школи

```text
Lesson: Past Simple

[Text] Rule explanation
[Video] Short teacher explanation
[Fill in blanks] Complete the sentences
[Matching] Verb 1 + Verb 2
[Quiz] Check understanding
[Open Question] Write 5 sentences about yesterday
```

## Приклад уроку для soft skills школи

```text
Lesson: Giving Feedback

[Text] Feedback framework
[Video] Example conversation
[Matching] Match phrases with feedback type
[Quiz] Choose the best response
[Open Question] Rewrite bad feedback into good feedback
```

## Приклад уроку для mini-course creator

```text
Lesson: First Client Call

[Text] Call structure
[Image] Script template
[Video] Demo call
[Quiz] Key principles
[Open Question] Write your opening script
```

## Early Success Metric

Для MVP важливо не просто мати реєстрації.

Ключові метрики:

- користувач створив перший урок
- користувач додав 3+ блоки
- користувач відкрив student preview
- користувач поділився уроком через лінк
- студент завершив урок
- користувач повернувся створити другий урок

## Найважливіший MVP outcome

```text
A user can create and share a useful interactive lesson in under 10 minutes.
```

Українською:

```text
Користувач може створити й поширити корисний інтерактивний урок менш ніж за 10 хвилин.
```

## Поточний стан прототипу

Станом на 2026-06-03 у `Libruary` вже є робочий tutor-side прототип:

- dashboard
- lesson list з пошуком і фільтром
- lesson builder
- draft/published status
- student/view mode для уроку
- students table
- add student
- assign lesson to student
- перегляд assigned lessons для student

Це означає, що продукт уже перейшов від першого clickable builder prototype до раннього tutor/student MVP.

## Наступний продуктовий крок

Стабілізувати tutor/student MVP flow:

```text
Dashboard
↓
Create Lesson
↓
Lesson Builder
↓
Add Blocks
↓
Publish
↓
Add Student
↓
Assign Lesson
↓
Student completes assigned lesson
↓
Tutor sees Results
```

Перший практичний фокус - не розширювати кількість блоків, а довести assignment → completion → results до зрозумілого end-to-end сценарію.

## Documentation Rule

Усі продуктові або технічні зміни треба фіксувати в документації, а не тільки в коді.

Правило:

- зміни у flow, scope, ICP або пріоритетах - оновити цей документ
- зміни в архітектурі, schema або React structure - оновити `Libruary/docs/project-architecture.md`
- нові SQL-міграції мають бути відображені в архітектурній документації

## План розвитку ролей: Tutor і Student

Після поточного tutor-side прототипу наступний великий шар продукту — проста логіка двох ролей:

```text
Tutor створює урок
↓
Tutor додає student-акаунт
↓
Tutor призначає студенту урок
↓
Student логіниться
↓
Student проходить призначений урок
↓
Tutor бачить базовий прогрес і результати
```

Важливо не перетворювати це одразу на повну LMS. Для MVP достатньо зробити просту систему ownership, assignment і progress.

### Рекомендована структура даних для MVP

Одна таблиця користувачів для логіну:

```text
users
- id
- email або login
- password_hash
- role: tutor | student
- name
- must_change_password
- created_at
```

Уроки мають належати конкретному tutor:

```text
lessons
- id
- tutor_id
- title
- content / blocks
- status: draft | published
- created_at
- updated_at
```

Зв'язок між tutor і student краще винести в окрему таблицю:

```text
tutor_students
- id
- tutor_id
- student_id
- created_at
```

Призначені уроки й прогрес студента теж краще тримати окремо:

```text
student_lessons
- id
- student_id
- lesson_id
- assigned_by_tutor_id
- status: assigned | in_progress | completed
- progress
- started_at
- completed_at
```

Не варто зберігати список уроків або студентів прямо в таблиці tutor. Окремі таблиці зв'язків залишають модель простою, але не ламаються, якщо пізніше з'явиться кілька викладачів, групи або інші типи призначень.

### Логін і створення студентів

Для MVP можна зробити один login flow для обох ролей. Після входу користувач бачить інтерфейс залежно від `role`.

Tutor може створювати student-акаунт:

```text
name
email або login
temporary password
```

Найбезпечніший простий варіант:

```text
Tutor створює студента
↓
Система або tutor задає тимчасовий пароль
↓
Student входить
↓
Student обов'язково змінює пароль при першому вході
```

Для цього в `users` потрібне поле:

```text
must_change_password: true | false
```

## З чого почати зараз

### Крок 1. Зафіксувати модель користувачів і ролей

Мета:

```text
У системі є users з ролями tutor і student.
```

Що потрібно визначити:

- чи логін буде через email або простий username
- чи потрібен student email на MVP
- чи tutor сам задає пароль, чи система генерує тимчасовий
- що бачить користувач після login залежно від ролі

Рекомендація для MVP:

```text
email/login + password
role-based redirect
tutor-created student accounts
temporary password
must_change_password on first login
```

### Крок 2. Додати ownership для уроків

Мета:

```text
Кожен lesson належить конкретному tutor.
```

Зміна в логіці:

- у `lessons` з'являється `tutor_id`
- tutor бачить тільки свої уроки
- новий урок автоматично створюється з `tutor_id` поточного користувача

Це найкращий перший технічний крок, бо вся student-логіка далі буде будуватися навколо того, кому належить урок.

### Крок 3. Додати список студентів для tutor

Мета:

```text
Tutor може створити student-акаунт і бачити список своїх студентів.
```

Мінімальний flow:

```text
Tutor Dashboard
↓
Students
↓
Add Student
↓
Student з'являється в списку
```

На цьому етапі студент ще може нічого не проходити. Важливо спочатку зробити чисту прив'язку tutor → student.

### Крок 4. Додати assignment уроків

Мета:

```text
Tutor може призначити свій lesson конкретному student.
```

Мінімальний flow:

```text
Tutor відкриває lesson
↓
Натискає Assign
↓
Обирає student
↓
У `student_lessons` створюється запис
```

Після цього з'являється основа для student dashboard.

### Крок 5. Зробити Student Dashboard

Мета:

```text
Student після login бачить тільки свої призначені уроки.
```

Мінімальний екран:

- список assigned lessons
- статус уроку
- кнопка start / continue
- completed state

Student не повинен бачити builder, dashboard tutor або чужі уроки.

### Крок 6. Зберігати прогрес і completion

Мета:

```text
Student може пройти урок, а tutor бачить базовий результат.
```

Мінімально потрібно:

- status: assigned / in_progress / completed
- completed_at
- відповіді на quiz / open question, якщо вони вже є в продукті
- базовий score, якщо блок це підтримує

### Крок 7. Показати результати tutor

Мета:

```text
Tutor бачить, хто проходить його уроки.
```

Мінімальний екран results:

- student name
- lesson title
- status
- completed_at
- score / answers, якщо доступно

## Рекомендована послідовність implementation

```text
1. users + roles
2. lessons.tutor_id
3. tutor-only lesson access
4. create student from tutor account
5. tutor_students relation
6. assign lesson to student
7. student dashboard
8. lesson completion/progress
9. tutor results view
```

Перший практичний фокус:

```text
Зробити так, щоб уроки належали tutor, а student-акаунти можна було створювати й прив'язувати до tutor.
```

Це дасть платформі базову структуру двох ролей без зайвої LMS-складності.

## Поточний стан реалізації ролей

Станом на 2026-06-02 у прототипі вже реалізовано перший tutor-side foundation.

### База даних

Створені або оновлені таблиці:

```text
users
lessons.tutor_id
tutor_students
student_lessons
```

Поточна рольова логіка:

```text
users.role = tutor | student
```

У `public.users` зберігається профіль і роль. Паролі не зберігаються в цій таблиці; tutor login підключено через Supabase Auth.

Legacy MVP tutor для старих prototype/demo даних:

```text
name: Anna
role: tutor
id: ac0c117d-99a9-4bf7-baeb-0c115d9d8a22
```

Уроки:

```text
lessons.tutor_id → users.id
```

Старі prototype уроки можуть бути прив'язані до tutor Anna. Нові уроки у frontend зберігаються з authenticated tutor id:

```text
lessons.tutor_id = auth.users.id
```

Зв'язок tutor → student:

```text
tutor_students
- tutor_id
- student_id
```

Призначення уроків:

```text
student_lessons
- student_id
- lesson_id
- assigned_by_tutor_id
- status: assigned | in_progress | completed
- progress
```

### UI

У sidebar додано пункт:

```text
Students
```

Сторінка `Students` має:

- таблицю студентів
- search по name/email
- кнопку `Add student`
- actions menu через три крапки
- дію `Assign lesson`

Поточний `Add student` flow:

```text
Tutor натискає Add student
↓
вводить name
↓
створюється users.role = student
↓
створюється tutor_students зв'язок
↓
student з'являється в таблиці
```

Поточний `Assign lesson` flow:

```text
Tutor відкриває actions menu студента
↓
натискає Assign lesson
↓
обирає lesson зі своїх уроків
↓
створюється student_lessons
↓
assigned lessons count оновлюється
```

Actions menu має бути однорядковим: пункти меню не повинні переноситися на два рядки.

Modal/popup buttons:

- action buttons inside modals/popups are text-only, without leading icons
- close actions inside full-page modals use text label `Close`, not an icon-only button

### Наступні кроки після цього стану

Найближчі логічні кроки:

```text
1. Винести lesson builder modal і lesson block components з App.tsx.
2. Додати Student Dashboard.
3. Додати student attempt/completion flow.
4. Додати tutor Results.
5. Додати student login через Supabase Auth.
6. Замінити MVP_TUTOR_ID на current authenticated tutor id.
7. Посилити RLS policies під реальних authenticated users.
```

## Технічне вирівнювання перед Student Flow

Станом на 2026-06-03 перед роботою над Student flow зроблено технічне вирівнювання:

- `001_create_lessons.sql` одразу створює `lessons.tutor_id`, а не старий `owner_id`
- додано `006_seed_mvp_tutor.sql` для hardcoded `MVP_TUTOR_ID`
- `README.md` замінено з Vite-template на product/dev setup інструкцію
- з `App.tsx` винесено shared types, constants, formatting helpers, lesson block helpers, Supabase API layer і app shell component

Це не змінює UI-поведінку продукту. Мета - зробити базу і frontend structure стабільнішими перед додаванням student-side сценаріїв.

## Tutor Auth Foundation

Станом на 2026-06-03 додано перший контрольований auth layer для tutor:

- tutor може sign up / sign in через Supabase Auth
- після входу frontend створює або оновлює profile row у `public.users`
- `public.users.id = auth.users.id`
- `public.users.role = tutor`
- lessons, tutor_students і student_lessons frontend-запити використовують authenticated tutor id
- hardcoded `MVP_TUTOR_ID` більше не є активним frontend ownership source
- tutor name, email і `Log out` живуть у profile popover по кліку на avatar з ініціалами
- auth screen мінімальний: без верхньої іконки, `Sign in` / `Create account`, secondary gray switch button
- auth і tutor-side pages мають окремі hash links: `#/sign-in`, `#/create-account`, `#/dashboard`, `#/lessons`, `#/students`
- нові page-level screens мають отримувати окремий route одразу

`MVP_TUTOR_ID` залишається тільки як legacy seed для старих prototype/demo даних.

Якщо старі prototype lessons/students треба бачити під новим authenticated tutor, їх треба перенести maintenance script-ом:

```text
Libruary/supabase/008_move_legacy_mvp_data_to_auth_tutor.sql
```

Перед запуском потрібно замінити `your@email.com` на email поточного tutor і перевірити preview counts.

Наступний контрольований auth-крок:

```text
Tutor creates student
↓
Student receives login/password або invite
↓
Student signs in
↓
Student sees assigned lessons
```

Перед цим бажано завершити refactor lesson builder blocks, щоб student view і tutor edit view могли переиспользовувати одну структуру блоків.
