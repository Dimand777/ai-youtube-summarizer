import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractVideoId, getTranscript } from './youtube'
import { YoutubeTranscript } from 'youtube-transcript'

vi.mock('youtube-transcript', () => {
  return {
    YoutubeTranscript: {
      fetchTranscript: vi.fn(),
    },
  }
})

describe('youtube utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractVideoId', () => {
    it('should extract video ID from standard youtube URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=pgKg6jb7_5M')).toBe('pgKg6jb7_5M')
      expect(extractVideoId('https://youtube.com/watch?v=pgKg6jb7_5M&t=10s')).toBe('pgKg6jb7_5M')
    })

    it('should extract video ID from short youtu.be URL', () => {
      expect(extractVideoId('https://youtu.be/pgKg6jb7_5M')).toBe('pgKg6jb7_5M')
      expect(extractVideoId('https://youtu.be/pgKg6jb7_5M?t=10')).toBe('pgKg6jb7_5M')
    })

    it('should extract video ID from shorts URL', () => {
      expect(extractVideoId('https://www.youtube.com/shorts/pgKg6jb7_5M')).toBe('pgKg6jb7_5M')
      expect(extractVideoId('https://youtube.com/shorts/pgKg6jb7_5M?feature=share')).toBe('pgKg6jb7_5M')
    })

    it('should return null for invalid URLs', () => {
      expect(extractVideoId('https://example.com')).toBeNull()
      expect(extractVideoId('not-a-url')).toBeNull()
    })
  })

  describe('getTranscript', () => {
    it('should fetch transcript successfully in requested language', async () => {
      const mockItems = [
        { text: 'Привет', offset: 0 },
        { text: 'мир', offset: 1000 }
      ]
      vi.mocked(YoutubeTranscript.fetchTranscript).mockResolvedValue(mockItems)

      const result = await getTranscript('pgKg6jb7_5M')
      expect(result).toBe('[00:00] Привет мир')
      expect(YoutubeTranscript.fetchTranscript).toHaveBeenCalledWith('pgKg6jb7_5M', expect.objectContaining({ lang: 'ru' }))
    })

    it('should fallback to default language if requested language fails', async () => {
      const mockItems = [
        { text: 'Hello', offset: 0 },
        { text: 'world', offset: 1000 }
      ]
      
      // Russian request fails, default request succeeds
      vi.mocked(YoutubeTranscript.fetchTranscript)
        .mockRejectedValueOnce(new Error('Language not available'))
        .mockResolvedValueOnce(mockItems)

      const result = await getTranscript('pgKg6jb7_5M')
      expect(result).toBe('[00:00] Hello world')
      expect(YoutubeTranscript.fetchTranscript).toHaveBeenCalledTimes(2)
    })

    it('should throw an error if all attempts fail', async () => {
      vi.mocked(YoutubeTranscript.fetchTranscript).mockRejectedValue(new Error('Fetch failed'))

      await expect(getTranscript('pgKg6jb7_5M')).rejects.toThrow('Fetch failed')
    })
  })
})
