import { Metadata } from 'next'
import DashboardClient from '../../dashboard/DashboardClient'

export const metadata: Metadata = {
  title: 'Dashboard — AI YouTube Summarizer',
  description: 'History of your saved summaries and files.',
}

export default function DashboardEn() {
  return <DashboardClient locale="en" />
}
