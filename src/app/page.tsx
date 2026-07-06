import { Metadata } from 'next'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
  title: 'AI YouTube Summarizer — Саммаризация YouTube видео с помощью ИИ',
  description: 'Мгновенно получайте краткую выжимку, ключевые тезисы, таймкоды глав и FAQ из любого YouTube видео с помощью искусственного интеллекта.',
  alternates: {
    canonical: 'https://ai-youtube-summarizer-zdia.vercel.app/',
    languages: {
      'ru-RU': 'https://ai-youtube-summarizer-zdia.vercel.app/',
      'en-US': 'https://ai-youtube-summarizer-zdia.vercel.app/en',
    },
  },
}

export default function Home() {
  return <HomeClient locale="ru" />
}
