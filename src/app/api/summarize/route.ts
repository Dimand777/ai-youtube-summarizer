import { NextRequest, NextResponse } from 'next/server'
import { extractVideoId, getTranscript } from '@/lib/youtube'
import { summarize } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  // 1. Auth Validation
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Body parsing & validation
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

  try {
    // 3. Check Supabase cache
    const { data: cached, error: cacheError } = await supabase
      .from('summaries')
      .select('*')
      .eq('video_id', videoId)
      .maybeSingle()

    if (cached) {
      // Add to user history if not already present, or update created_at
      await supabase.from('user_history').upsert(
        {
          user_id: user.id,
          video_id: videoId,
          created_at: new Date().toISOString()
        },
        { onConflict: 'user_id,video_id' }
      )

      return NextResponse.json(
        {
          videoId,
          transcript: cached.transcript,
          summary: cached.summary,
          thumbnail: cached.thumbnail,
        },
        { status: 201 } // Return 201 even for cached hits as it creates/updates user history entry
      )
    }

    // 4. Fetch transcript for new video
    let transcript: string
    try {
      transcript = await getTranscript(videoId)
      if (!transcript?.trim()) {
        return NextResponse.json(
          { error: 'Could not fetch transcript. Video may have no subtitles.' },
          { status: 502 }
        )
      }
    } catch (err: any) {
      return NextResponse.json(
        { error: `Could not fetch transcript: ${err.message || err}` },
        { status: 502 }
      )
    }

    // 5. Generate summary using Gemini AI
    let summaryText: string
    try {
      summaryText = await summarize(transcript)
    } catch (err: any) {
      console.error('Gemini error:', err)
      return NextResponse.json({ error: 'Gemini API error' }, { status: 502 })
    }

    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

    // 6. Save summary to database
    const { error: dbError } = await supabase.from('summaries').insert({
      video_id: videoId,
      url,
      summary: summaryText,
      transcript,
      thumbnail
    })

    if (dbError) {
      console.error('Failed to save summary cache to Supabase:', dbError)
    }

    // 7. Save to user history
    const { error: historyError } = await supabase.from('user_history').upsert(
      {
        user_id: user.id,
        video_id: videoId,
        created_at: new Date().toISOString()
      },
      { onConflict: 'user_id,video_id' }
    )

    if (historyError) {
      console.error('Failed to save user history link to Supabase:', historyError)
    }

    return NextResponse.json(
      {
        videoId,
        transcript,
        summary: summaryText,
        thumbnail,
      },
      { status: 201 }
    )
  } catch (globalError: any) {
    console.error('Unexpected server error:', globalError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 502 })
  }
}
