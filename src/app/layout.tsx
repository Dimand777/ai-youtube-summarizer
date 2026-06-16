import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI YouTube Summarizer',
  description: 'Get AI-powered summaries of any YouTube video',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
