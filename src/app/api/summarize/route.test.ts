import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFrom, mockMaybeSingle, mockInsert, mockUpsert, mockGetUser } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn()
  const mockInsert = vi.fn()
  const mockUpsert = vi.fn()
  const mockEq = vi.fn().mockImplementation(() => ({
    maybeSingle: mockMaybeSingle
  }))
  const mockSelect = vi.fn().mockImplementation(() => ({
    eq: mockEq
  }))
  const mockFrom = vi.fn().mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    upsert: mockUpsert,
  }))
  const mockGetUser = vi.fn()
  return { mockFrom, mockMaybeSingle, mockInsert, mockUpsert, mockGetUser }
})

vi.mock('@/lib/supabase', () => {
  const mockClient = {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }
  return {
    supabase: mockClient,
    supabaseAdmin: mockClient,
  }
})

vi.mock('@/lib/youtube', () => ({
  extractVideoId: vi.fn(),
  getTranscript: vi.fn(),
}))

vi.mock('@/lib/gemini', () => ({
  summarize: vi.fn(),
}))

// Now import the module under test and other utilities
import { POST } from './route'
import { getTranscript, extractVideoId } from '@/lib/youtube'
import { summarize } from '@/lib/gemini'

describe('POST /api/summarize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when JSON body is invalid', async () => {
    const req = new NextRequest('http://localhost/api/summarize', {
      method: 'POST',
      body: 'invalid-json'
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid JSON')
  })

  it('should return 400 when url is missing', async () => {
    const req = new NextRequest('http://localhost/api/summarize', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('URL is required')
  })

  it('should return 400 when url is invalid', async () => {
    vi.mocked(extractVideoId).mockReturnValue(null)

    const req = new NextRequest('http://localhost/api/summarize', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://invalid-url.com' })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid YouTube URL')
  })

  it('should return cached summary if available in DB', async () => {
    vi.mocked(extractVideoId).mockReturnValue('12345678901')
    mockMaybeSingle.mockResolvedValue({
      data: {
        transcript: 'Тестовый транскрипт из базы',
        summary: 'Тестовое саммари из базы',
        thumbnail: 'https://img.youtube.com/vi/12345678901/hqdefault.jpg'
      },
      error: null
    })

    const req = new NextRequest('http://localhost/api/summarize', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=12345678901' })
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    
    const data = await res.json()
    expect(data.videoId).toBe('12345678901')
    expect(data.summary).toBe('Тестовое саммари из базы')
    expect(data.transcript).toBe('Тестовый транскрипт из базы')
    
    // Youtube and Gemini should not be called
    expect(getTranscript).not.toHaveBeenCalled()
    expect(summarize).not.toHaveBeenCalled()
  })

  it('should fetch, summarize, and save summary when not cached', async () => {
    vi.mocked(extractVideoId).mockReturnValue('12345678901')
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    vi.mocked(getTranscript).mockResolvedValue('Свежий транскрипт видео')
    vi.mocked(summarize).mockResolvedValue('Свежее саммари видео')
    mockInsert.mockResolvedValue({ error: null })

    const req = new NextRequest('http://localhost/api/summarize', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=12345678901' })
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const data = await res.json()
    expect(data.videoId).toBe('12345678901')
    expect(data.summary).toBe('Свежее саммари видео')
    expect(data.transcript).toBe('Свежий транскрипт видео')

    expect(getTranscript).toHaveBeenCalledWith('12345678901', 'ru')
    expect(summarize).toHaveBeenCalledWith('Свежий транскрипт видео', 'ru')
    expect(mockInsert).toHaveBeenCalledWith({
      video_id: '12345678901',
      url: 'https://youtube.com/watch?v=12345678901',
      summary: 'Свежее саммари видео',
      transcript: 'Свежий транскрипт видео',
      thumbnail: 'https://img.youtube.com/vi/12345678901/hqdefault.jpg'
    })
  })

  it('should return 502 when transcript retrieval fails', async () => {
    vi.mocked(extractVideoId).mockReturnValue('12345678901')
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    vi.mocked(getTranscript).mockRejectedValue(new Error('Subtitles error'))

    const req = new NextRequest('http://localhost/api/summarize', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=12345678901' })
    })

    const res = await POST(req)
    expect(res.status).toBe(502)
    const data = await res.json()
    expect(data.error).toContain('Could not fetch transcript')
  })

  it('should return 502 when gemini service fails', async () => {
    vi.mocked(extractVideoId).mockReturnValue('12345678901')
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    vi.mocked(getTranscript).mockResolvedValue('Транскрипт видео')
    vi.mocked(summarize).mockRejectedValue(new Error('Gemini failed'))

    const req = new NextRequest('http://localhost/api/summarize', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=12345678901' })
    })

    const res = await POST(req)
    expect(res.status).toBe(502)
    const data = await res.json()
    expect(data.error).toBe('Gemini API error')
  })

  it('should save search in user history if authenticated', async () => {
    vi.mocked(extractVideoId).mockReturnValue('12345678901')
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    vi.mocked(getTranscript).mockResolvedValue('Транскрипт')
    vi.mocked(summarize).mockResolvedValue('Саммари')
    mockInsert.mockResolvedValue({ error: null })
    mockUpsert.mockResolvedValue({ error: null })
    
    // Mock user session
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-uuid' } as any },
      error: null
    })

    const req = new NextRequest('http://localhost/api/summarize', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      },
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=12345678901' })
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    
    expect(mockGetUser).toHaveBeenCalledWith('valid-jwt-token')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'test-user-uuid',
        video_id: '12345678901',
      }),
      { onConflict: 'user_id,video_id' }
    )
  })
})
