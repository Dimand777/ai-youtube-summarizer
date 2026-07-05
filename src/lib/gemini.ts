import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function summarize(transcript: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `Ты — профессиональный редактор. Проанализируй транскрипт YouTube-видео и создай структурированное саммари на русском языке в формате Markdown.

Структура обязательна:
## 🎯 Ключевая идея
(1-2 предложения — суть видео)

## 📌 Главные тезисы
(5-7 буллетов с жирными ключевыми словами)

## 💡 Практические выводы
(3-5 конкретных инсайта или действия)

## 🗣 Лучшая цитата
(самая яркая фраза из видео, в blockquote)

Транскрипт:
${transcript.slice(0, 30000)}`

  const result = await model.generateContent(prompt)
  return result.response.text()
}
