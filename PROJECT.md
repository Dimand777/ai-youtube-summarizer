# AI YouTube Summarizer — Контекст проекта

Проект представляет собой веб-приложение для мгновенного извлечения субтитров из YouTube-видео и их саммаризации с помощью искусственного интеллекта (Google Gemini 1.5 Flash). Вся история запросов и саммари кэшируются в базе данных Supabase PostgreSQL, а доступ к системе разграничивается с помощью Supabase Auth.

## 🛠 Технологический стек
*   **Frontend & API:** Next.js 14.2.5 (App Router, Serverless Route Handlers) + TypeScript + Tailwind CSS
*   **Database & Auth:** Supabase (PostgreSQL, Supabase Auth SDK)
*   **AI Service:** Google Gemini API (`gemini-1.5-flash` через `@google/generative-ai` SDK)
*   **Subtitles Extractor:** `youtube-transcript` (мгновенное извлечение субтитров без ffmpeg)

---

## 📂 Структура проекта
```
ai-youtube-summarizer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── files/           # API для проводника файлов проекта
│   │   │   ├── summarize/       # API для генерации/кэширования саммари
│   │   │   └── route.ts
│   │   ├── dashboard/           # Панель управления (Dashboard)
│   │   ├── login/               # Страница входа / регистрации (Supabase Auth)
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Главная страница (Landing)
│   │   └── globals.css
│   └── lib/
│       ├── gemini.ts            # Клиент Gemini AI
│       ├── supabase.ts          # Клиент Supabase Client SDK
│       └── youtube.ts           # Извлечение субтитров YouTube
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── PROJECT.md                   # Контекст проекта и планирование
```

---

## 💾 Схема базы данных (Supabase PostgreSQL)

Для корректной работы приложения в Supabase SQL Editor необходимо выполнить следующий скрипт:

```sql
-- Таблица кэшированных саммари видео
create table public.summaries (
    video_id text primary key,
    url text not null,
    summary text not null,
    transcript text not null,
    thumbnail text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица истории запросов пользователей
create table public.user_history (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null, -- Связь с auth.users.id
    video_id text not null references public.summaries(video_id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    unique(user_id, video_id)
);

-- Индексы для быстрой выборки
create index user_history_user_id_idx on public.user_history(user_id);
create index user_history_created_at_idx on public.user_history(created_at desc);
```

---

## ⚡ [ТЕКУЩИЙ СТАТУС]
*   **Статус:** Шаги 1, 2 и 3 успешно выполнены.
*   **Готово:**
    *   Создана и верифицирована структура Next.js проекта, переписан интерфейс на Tailwind CSS.
    *   Добавлен встроенный проводник по файлам проекта на Dashboard для облегчения навигации разработчика.
    *   Установлен SDK `@supabase/supabase-js`.
    *   Подключен Supabase Auth на фронтенд-странице `/login`.
    *   Реализовано кэширование и проверка сессии в `POST /api/summarize`.
    *   Добавлены атрибуты `data-testid` на все элементы Auth и Dashboard.
    *   Созданы скрипты для очистки базы данных и добавления тестовых пользователей.
    *   Внедрена плавающая система красивых UI-уведомлений (Toast) и оптимизирована панель ошибок.
    *   Добавлено детальное серверное логирование ошибок (400, 401, 502).
    *   Проект успешно собирается (`npm run build`).

---

## 📋 План на следующие 3 шага

### Шаг 1: Интеграция Supabase (Auth, DB Cache) и разметка под Playwright
*   [x] Подключить Supabase Auth на фронтенд-странице `/login`.
*   [x] Реализовать кэширование и проверку сессии в `POST /api/summarize`.
*   [x] Добавить атрибуты `data-testid` на все элементы Auth и Dashboard.
*   [x] Убедиться в успешной сборке проекта (`npm run build`).

### Шаг 2: Создание тестовых учетных записей и наполнение мок-данных
*   [x] Подготовка тестовых учетных записей в Supabase (скрипт `db:create-test-user`).
*   [x] Написание скриптов для быстрой очистки тестовой БД перед автотестами (скрипт `db:clear`).

### Шаг 3: Оптимизация обработки ошибок и логов
*   [x] Добавление красивых уведомлений об ошибках на клиенте (Toast и анимированный баннер).
*   [x] Логирование невалидных URL (400), ошибок токенов (401) и сбоев Gemini API (502).
