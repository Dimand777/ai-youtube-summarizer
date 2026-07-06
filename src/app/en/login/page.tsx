import { Metadata } from 'next'
import LoginClient from '../../login/LoginClient'

export const metadata: Metadata = {
  title: 'Sign In — AI YouTube Summarizer',
  description: 'Sign in to your account to securely store all your past YouTube video summaries in one place.',
  alternates: {
    canonical: 'https://ai-youtube-summarizer-zdia.vercel.app/en/login',
    languages: {
      'ru-RU': 'https://ai-youtube-summarizer-zdia.vercel.app/login',
      'en-US': 'https://ai-youtube-summarizer-zdia.vercel.app/en/login',
    },
  },
}

export default function LoginEn() {
  return <LoginClient locale="en" />
}
