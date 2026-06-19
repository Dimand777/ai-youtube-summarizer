import { YoutubeTranscript } from 'youtube-transcript'

export function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export async function getTranscript(videoId: string): Promise<string> {
  const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ru' })
    .catch(() => YoutubeTranscript.fetchTranscript(videoId))
  return items.map(i => i.text).join(' ')
}
