import { YoutubeTranscript } from 'youtube-transcript'

async function customFetch(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  let targetUrl = typeof url === 'string' ? url : url.toString()
  if (targetUrl.startsWith('https://www.youtube.com')) {
    targetUrl = targetUrl.replace('https://www.youtube.com', 'https://m.youtube.com')
  }

  const res = await fetch(targetUrl, options)

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    const originalText = await res.text()
    const modifiedText = originalText
      .replace(/"\/api\/timedtext\?/g, '"https://m.youtube.com/api/timedtext?')
      .replace(/"\\\/api\\\/timedtext\?/g, '"https:\\/\\/m.youtube.com\\/api\\/timedtext?')
      .replace(/'\/api\/timedtext\?/g, '\'https://m.youtube.com/api/timedtext?')
      .replace(/"\\u0026/g, '"&')
      .replace(/\\u0026/g, '&')

    return new Response(modifiedText, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    })
  }

  return res
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?(?:[^&]+&)*v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export async function getTranscript(videoId: string): Promise<string> {
  const items = await YoutubeTranscript.fetchTranscript(videoId, { 
    lang: 'ru',
    fetch: customFetch
  }).catch(() => YoutubeTranscript.fetchTranscript(videoId, {
    fetch: customFetch
  }))
  return items.map(i => i.text).join(' ')
}
