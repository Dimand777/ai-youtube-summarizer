import { YoutubeTranscript } from 'youtube-transcript'
import { ProxyAgent } from 'undici'

const proxyUrl = process.env.YOUTUBE_PROXY
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined

async function customFetch(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  let targetUrl = typeof url === 'string' ? url : url.toString()
  if (targetUrl.startsWith('https://www.youtube.com')) {
    targetUrl = targetUrl.replace('https://www.youtube.com', 'https://m.youtube.com')
  }

  const headers = {
    ...options?.headers,
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cookie': 'SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg',
  }

  const res = await fetch(targetUrl, {
    ...options,
    headers,
    ...(proxyAgent && { dispatcher: proxyAgent } as any),
  })

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
