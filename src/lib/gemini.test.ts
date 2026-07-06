import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoogleGenerativeAI } from '@google/generative-ai'

const { mockGenerateContent, mockGetGenerativeModel } = vi.hoisted(() => {
  // Set the environment variable before the module is imported
  process.env.GEMINI_API_KEY = 'mock-api-key'
  
  const mockGenerateContent = vi.fn()
  const mockGetGenerativeModel = vi.fn().mockReturnValue({
    generateContent: mockGenerateContent
  })
  return { mockGenerateContent, mockGetGenerativeModel }
})

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => {
      return {
        getGenerativeModel: mockGetGenerativeModel
      }
    })
  }
})

// Now import the module under test
import { summarize } from './gemini'

describe('gemini service', () => {
  beforeEach(() => {
    // Clear mocks, but keep in mind GoogleGenerativeAI was constructed during module import
    vi.clearAllMocks()
  })

  it('should call getGenerativeModel with correct model name and generate content', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '## 🎯 Ключевая идея\nТестовое саммари'
      }
    })

    const transcript = 'Это тестовый транскрипт видео.'
    const result = await summarize(transcript)

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' })
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining(transcript))
    expect(result).toBe('## 🎯 Ключевая идея\nТестовое саммари')
  })
})
