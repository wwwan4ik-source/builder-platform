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

## Наступний продуктовий крок

Спроєктувати перший prototype flow:

```text
Dashboard
↓
Create Lesson
↓
Lesson Builder
↓
Add Blocks
↓
Student Preview
↓
Share Link
↓
Results
```

Після цього можна переходити до wireframes або першого клікабельного прототипу.
