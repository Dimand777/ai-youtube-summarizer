import { YoutubeTranscript } from 'youtube-transcript'
import { ProxyAgent } from 'undici'

const proxyUrl = process.env.YOUTUBE_PROXY
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined

async function customFetch(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  let targetUrl = typeof url === 'string' ? url : url.toString()
  
  // Only rewrite timedtext URL to mobile domain to avoid the 0-byte response bug
  if (targetUrl.startsWith('https://www.youtube.com/api/timedtext')) {
    targetUrl = targetUrl.replace('https://www.youtube.com', 'https://m.youtube.com')
  }

  const isWatchPage = targetUrl.includes('/watch')
  const isTimedText = targetUrl.includes('/timedtext')

  const headers = {
    ...options?.headers,
  } as Record<string, string>

  if (isWatchPage) {
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    headers['Accept-Language'] = 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
    headers['Cookie'] = 'SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg'
  }

  // Dual-fallback for timedtext (subtitles XML retrieval):
  // 1. Try DIRECT fetch first (since timedtext CDNs might not block Vercel IPs)
  // 2. If it fails, fall back to PROXY fetch
  if (isTimedText) {
    try {
      const directRes = await fetch(targetUrl, {
        ...options,
        headers,
      })
      if (directRes.ok) {
        const text = await directRes.text()
        if (text && text.trim().length > 0) {
          return new Response(text, {
            status: directRes.status,
            statusText: directRes.statusText,
            headers: directRes.headers,
          })
        }
      }
    } catch (err) {
      console.warn('Direct timedtext fetch failed, falling back to proxy:', err)
    }

    const proxyRes = await fetch(targetUrl, {
      ...options,
      headers,
      ...(proxyAgent && { dispatcher: proxyAgent } as any),
    })
    return proxyRes
  }

  // For other endpoints (watch page, youtubei player API), route via proxy to bypass bot challenges
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

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export async function getTranscript(videoId: string, lang: 'ru' | 'en' = 'ru'): Promise<string> {
  let items
  if (lang === 'en') {
    items = await YoutubeTranscript.fetchTranscript(videoId, { 
      lang: 'en',
      fetch: customFetch
    }).catch(() => YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'ru',
      fetch: customFetch
    })).catch(() => YoutubeTranscript.fetchTranscript(videoId, {
      fetch: customFetch
    }))
  } else {
    items = await YoutubeTranscript.fetchTranscript(videoId, { 
      lang: 'ru',
      fetch: customFetch
    }).catch(() => YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',
      fetch: customFetch
    })).catch(() => YoutubeTranscript.fetchTranscript(videoId, {
      fetch: customFetch
    }))
  }

  const blocks: string[] = []
  let currentBlockTime = 0
  let currentBlockText: string[] = []

  for (const item of items) {
    const offset = item.offset || 0
    if (currentBlockText.length === 0) {
      currentBlockTime = offset
      currentBlockText.push(item.text)
    } else if (offset - currentBlockTime >= 30000) {
      blocks.push(`[${formatTime(currentBlockTime)}] ${currentBlockText.join(' ')}`)
      currentBlockTime = offset
      currentBlockText = [item.text]
    } else {
      currentBlockText.push(item.text)
    }
  }

  if (currentBlockText.length > 0) {
    blocks.push(`[${formatTime(currentBlockTime)}] ${currentBlockText.join(' ')}`)
  }

  return blocks.join('\n')
}
