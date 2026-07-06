import { Metadata } from 'next'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = {
  title: 'Панель управления — AI YouTube Summarizer',
  description: 'История ваших сохраненных саммари и файлов.',
}

export default function Dashboard() {
  return <DashboardClient locale="ru" />
}
