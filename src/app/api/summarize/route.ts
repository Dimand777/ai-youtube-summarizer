import { NextRequest, NextResponse } from 'next/server'
import { extractVideoId, getTranscript } from '@/lib/youtube'
import { summarize } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { url } = body
  if (!url?.trim()) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  const videoId = extractVideoId(url)
  if (!videoId) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  let transcript: string
  try {
    transcript = await getTranscript(videoId)
    if (!transcript.trim()) {
      return NextResponse.json(
        { error: 'Could not fetch transcript. Video may have no subtitles.' },
        { status: 502 }
      )
    }
  } catch {
    return NextResponse.json(
      { error: 'Could not fetch transcript. Video may have no subtitles.' },
      { status: 502 }
    )
  }

  let summary: string
  try {
    summary = await summarize(transcript)
  } catch (error) {
    console.error('Gemini error:', error)
    return NextResponse.json({ error: 'Gemini API error' }, { status: 502 })
  }

  return NextResponse.json(
    {
      videoId,
      transcript,
      summary,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    },
    { status: 201 }
  )
}
