# AI YouTube Summarizer

Вставьте ссылку на YouTube-видео — получите структурированное саммари от Gemini AI.

## Стек
- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Google Gemini 1.5 Flash** — генерация саммари (бесплатный тариф)
- **youtube-transcript** — извлечение субтитров без ffmpeg

## Быстрый старт

```bash
# 1. Клонировать
git clone https://github.com/Dimand777/ai-youtube-summarizer.git
cd ai-youtube-summarizer

# 2. Установить зависимости
npm install

# 3. Создать .env.local
cp .env.example .env.local
# Вставь GEMINI_API_KEY из https://aistudio.google.com

# 4. Запустить
npm run dev
```

Открой http://localhost:3000/dashboard

## API

### POST /api/summarize
```json
{ "url": "https://youtube.com/watch?v=VIDEO_ID" }
```

Ответ `201`:
```json
{
  "videoId": "...",
  "summary": "## 🎯 Ключевая идея\n...",
  "transcript": "полный текст субтитров",
  "thumbnail": "https://img.youtube.com/vi/.../hqdefault.jpg"
}
```

Ошибки: `400` невалидный URL, `502` нет субтитров или ошибка Gemini.
