import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function summarize(transcript: string, lang: 'ru' | 'en' = 'ru'): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const ruPrompt = `Ты — профессиональный редактор. Проанализируй транскрипт YouTube-видео (в котором указаны таймкоды в формате [минуты:секунды]) и создай структурированное саммари на русском языке в формате Markdown.

Твоя задача — извлечь следующие разделы в строгой последовательности (не меняй заголовки):

## 🔑 Ключевые моменты видео
(Выдели 5-8 основных логических этапов/глав видео. Для каждого этапа укажи точный таймкод его начала из текста в формате [минуты:секунды] в виде кликабельной ссылки, двоеточие и краткое описание сути. Формат: "* [минуты:секунды]: Описание" или "- [минуты:секунды]: Описание")

## 🎯 Ключевая идея
(1-2 предложения — главная суть видео)

## 📌 Главные тезисы
(5-7 буллетов с жирными ключевыми словами, раскрывающими тему)

## 💡 Практические шаги и рекомендации
(3-5 конкретных советов или действий, которые рекомендует спикер)

## ❓ Часто задаваемые вопросы (FAQ)
(Сформируй 3-4 ключевых вопроса по теме видео и дай на них четкие ответы на основе транскрипта в формате:
**В: Вопрос?**
О: Ответ.)

## 🏷 Хэштеги и ключевые слова
(Выведи 5-10 релевантных хэштегов через пробел, например: #react #frontend #javascript)

## 🗣 Лучшая цитата
(самая яркая, запоминающаяся фраза из видео в формате цитаты, т.е. с символом "> " перед ней)

Транскрипт с таймкодами:
${transcript.slice(0, 30000)}`

  const enPrompt = `You are a professional editor. Analyze the YouTube video transcript (which includes timestamps in [minutes:seconds] format) and create a structured summary in English in Markdown format.

Your task is to extract the following sections in strict sequence (do not change the headings):

## 🔑 Key Moments
(Highlight 5-8 main logical phases/chapters of the video. For each chapter, specify the exact timestamp of its start from the text in [minutes:seconds] format as a link, a colon, and a brief description. Format: "* [minutes:seconds]: Description" or "- [minutes:seconds]: Description")

## 🎯 Key Idea
(1-2 sentences — the main core essence of the video)

## 📌 Main Theses
(5-7 bullet points with bold keywords explaining the topic)

## 💡 Action Items & Recommendations
(3-5 specific tips or actions recommended by the speaker)

## ❓ Frequently Asked Questions (FAQ)
(Formulate 3-4 key questions on the topic of the video and provide clear answers to them based on the transcript in the format:
**Q: Question?**
A: Answer.)

## 🏷 Hashtags & Keywords
(Output 5-10 relevant hashtags separated by spaces, e.g.: #react #frontend #javascript)

## 🗣 Best Quote
(the most striking, memorable quote from the video in quote block format, i.e., with a "> " prefix)

Transcript with timestamps:
${transcript.slice(0, 30000)}`

  const prompt = lang === 'en' ? enPrompt : ruPrompt
  const result = await model.generateContent(prompt)
  return result.response.text()
}
