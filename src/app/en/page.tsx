import { Metadata } from 'next'
import HomeClient from '../HomeClient'

export const metadata: Metadata = {
  title: 'AI YouTube Summarizer — Summarize YouTube Videos with AI',
  description: 'Instantly get summaries, key takeaways, chapter timestamps, and FAQs from any YouTube video using artificial intelligence.',
  alternates: {
    canonical: 'https://ai-youtube-summarizer-zdia.vercel.app/en',
    languages: {
      'ru-RU': 'https://ai-youtube-summarizer-zdia.vercel.app/',
      'en-US': 'https://ai-youtube-summarizer-zdia.vercel.app/en',
    },
  },
}

export default function HomeEn() {
  return <HomeClient locale="en" />
}
