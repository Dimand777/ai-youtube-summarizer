import { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Вход в личный кабинет — AI YouTube Summarizer',
  description: 'Войдите в личный кабинет, чтобы хранить все свои прошлые саммари YouTube видео в одном месте.',
  alternates: {
    canonical: 'https://ai-youtube-summarizer-zdia.vercel.app/login',
    languages: {
      'ru-RU': 'https://ai-youtube-summarizer-zdia.vercel.app/login',
      'en-US': 'https://ai-youtube-summarizer-zdia.vercel.app/en/login',
    },
  },
}

export default function Login() {
  return <LoginClient locale="ru" />
}
