'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DonateModal } from '@/components/DonateModal'
import { getTranslation, Locale } from '@/lib/i18n'

function extractVideoId(url: string): string | null {
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

type Result = {
  videoId: string
  summary: string
  transcript: string
  thumbnail: string
}

function renderLineContent(content: string) {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Replace timestamps [MM:SS] or [HH:MM:SS] with styled spans
  let html = escaped.replace(/\[(\d{2}:\d{2}(?::\d{2})?)\]/g, '<span class="text-red-400 font-mono font-semibold">[$1]</span>')
  
  // Replace markdown bold tags **text** with <strong>tags
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split('\n')
  type Block = 
    | { type: 'h3'; content: string }
    | { type: 'blockquote'; content: string }
    | { type: 'list'; items: string[] }
    | { type: 'paragraph'; content: string }
    | { type: 'empty' }

  const blocks: Block[] = []
  let currentList: string[] | null = null

  for (const line of lines) {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2)
      if (currentList) {
        currentList.push(content)
      } else {
        currentList = [content]
      }
    } else {
      if (currentList) {
        blocks.push({ type: 'list', items: currentList })
        currentList = null
      }

      if (line.startsWith('## ')) {
        blocks.push({ type: 'h3', content: line.slice(3) })
      } else if (line.startsWith('> ')) {
        blocks.push({ type: 'blockquote', content: line.slice(2) })
      } else if (!line.trim()) {
        blocks.push({ type: 'empty' })
      } else {
        blocks.push({ type: 'paragraph', content: line })
      }
    }
  }

  if (currentList) {
    blocks.push({ type: 'list', items: currentList })
  }

  return (
    <div className="text-sm leading-relaxed text-slate-300 space-y-3 select-text text-left">
      {blocks.map((block, i) => {
        if (block.type === 'h3') {
          return (
            <h3 key={i} className="text-base font-bold text-white mt-6 mb-2">
              {renderLineContent(block.content)}
            </h3>
          )
        }
        if (block.type === 'blockquote') {
          return (
            <blockquote key={i} className="border-l-4 border-red-500 pl-4 italic text-slate-400 my-3 bg-slate-800/40 py-2 rounded-r-lg">
              {renderLineContent(block.content)}
            </blockquote>
          )
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="list-disc ml-5 mb-3 space-y-1.5 pl-1 text-slate-300">
              {block.items.map((item, j) => (
                <li key={j} className="text-slate-300">
                  {renderLineContent(item)}
                </li>
              ))}
            </ul>
          )
        }
        if (block.type === 'empty') {
          return <div key={i} className="h-2" />
        }
        return (
          <p key={i} className="mb-2 leading-relaxed">
            {renderLineContent(block.content)}
          </p>
        )
      })}
    </div>
  )
}

export default function HomeClient({ locale }: { locale: Locale }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [userSession, setUserSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [tab, setTab] = useState<'summary' | 'transcript'>('summary')
  const [copied, setCopied] = useState(false)
  const [stageIdx, setStageIdx] = useState(0)
  const [isDonateOpen, setIsDonateOpen] = useState(false)
  const router = useRouter()

  const t = getTranslation(locale)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session)
      setAuthLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUserSession(null)
  }

  async function handleSummarize(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!url.trim()) {
      setError(t.landing.errors.emptyUrl)
      return
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      setError(t.landing.errors.invalidUrl)
      return
    }

    setLoading(true)
    setStageIdx(0)

    let s = 0
    const iv = setInterval(() => {
      s = Math.min(s + 1, t.landing.stages.length - 1)
      setStageIdx(s)
    }, 1500)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (userSession?.access_token) {
        headers['Authorization'] = `Bearer ${userSession.access_token}`
      }

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url, lang: locale }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error retrieving summary')
        return
      }

      setResult(data)
      setTab('summary')
    } catch (err) {
      setError(t.landing.errors.serverError)
    } finally {
      clearInterval(iv)
      setLoading(false)
    }
  }

  function copyContent() {
    const text = tab === 'summary' ? result?.summary : result?.transcript
    if (text) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-red-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800/60 z-10">
        <Link href={locale === 'en' ? '/en' : '/'} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white font-bold shadow-md shadow-red-500/20">
            ▶
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {t.header.logo}
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <div className="flex bg-slate-800/60 p-1 rounded-xl border border-slate-700/40">
            <Link
              href={locale === 'ru' ? '#' : '/'}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-colors ${
                locale === 'ru'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-900/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RU
            </Link>
            <Link
              href={locale === 'en' ? '#' : '/en'}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-colors ${
                locale === 'en'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-900/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </Link>
          </div>

          <button
            onClick={() => setIsDonateOpen(true)}
            className="h-10 px-4 rounded-xl border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 text-xs font-bold text-rose-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-500/5 hover:scale-[1.02]"
          >
            <span>{t.header.donate}</span>
          </button>
          {authLoading ? (
            <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
          ) : userSession ? (
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 hidden sm:inline-block max-w-[150px] truncate">
                {userSession.user.email}
              </span>
              <Link
                href={locale === 'en' ? '/en/dashboard' : '/dashboard'}
                className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors flex items-center justify-center"
              >
                {t.header.dashboard}
              </Link>
              <button
                onClick={handleLogout}
                className="h-9 px-3 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {t.header.logout}
              </button>
            </div>
          ) : (
            <Link
              href={locale === 'en' ? '/en/login' : '/login'}
              className="h-10 px-5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all shadow-lg shadow-white/5 flex items-center justify-center cursor-pointer"
            >
              {t.header.login}
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-6 py-16 text-center z-10 w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400 mb-6 animate-pulse">
          {t.landing.badge}
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          {locale === 'ru' ? (
            <>
              Получите краткую выжимку <br />
              <span className="bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">
                любого YouTube видео
              </span>
            </>
          ) : (
            <>
              Get a brief summary <br />
              <span className="bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">
                of any YouTube video
              </span>
            </>
          )}
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
          {t.landing.subtitle}
        </p>

        {/* Input Form Card */}
        <div className="w-full max-w-2xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-xl mb-12">
          <form onSubmit={handleSummarize} className="space-y-4">
            <div className="relative flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder={t.landing.inputPlaceholder}
                  disabled={loading}
                  className="w-full h-12 pl-4 pr-10 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500/50 transition-all disabled:opacity-50"
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="h-12 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold text-xs rounded-xl shadow-md shadow-red-900/20 hover:shadow-red-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t.landing.btnProcessing}</span>
                  </>
                ) : (
                  <>
                    <span>{t.landing.btnSummarize}</span>
                    <span className="text-xs">→</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-400 text-left bg-red-950/20 border border-red-900/30 px-3 py-2 rounded-lg mt-2 flex items-center gap-1.5 animate-fadeIn">
                ⚠️ {error}
              </p>
            )}

            <p className="text-[11px] text-slate-500 text-left pl-1">
              {t.landing.inputHelp}
            </p>
          </form>

          {/* Large Donate Button */}
          <div className="mt-5 pt-5 border-t border-slate-700/40 flex justify-center">
            <button
              onClick={() => setIsDonateOpen(true)}
              className="w-full h-12 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-500/5 hover:scale-[1.01]"
            >
              <span>{t.landing.btnDonateMain}</span>
            </button>
          </div>
        </div>

        {/* Loading / Results Panel */}
        {loading && (
          <div className="w-full max-w-2xl bg-slate-800/20 border border-slate-800/60 rounded-2xl p-8 text-center shadow-lg mb-12">
            <div className="w-10 h-10 border-4 border-red-900/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-300 mb-4">{t.landing.stages[stageIdx]}</p>
            <div className="space-y-2.5 max-w-[280px] mx-auto">
              {[80, 60, 90, 50].map((w, i) => (
                <div
                  key={i}
                  style={{ width: `${w}%` }}
                  className="h-2 bg-slate-800 rounded-full mx-auto animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="w-full max-w-2xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl mb-12 flex flex-col text-left animate-fadeIn">
            {/* Thumbnail Header */}
            <div className="relative h-48 sm:h-60 w-full bg-black overflow-hidden flex-shrink-0">
              <img
                src={result.thumbnail}
                alt="Video thumbnail"
                className="w-full h-full object-cover opacity-75"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent flex items-end p-6">
                <div className="w-full">
                  <p className="text-[10px] text-red-400 font-bold tracking-wider uppercase">{t.result.source}</p>
                  <a
                    href={`https://youtube.com/watch?v=${result.videoId.split(':')[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:underline text-sm font-semibold mt-1 inline-flex items-center gap-1.5 truncate max-w-full"
                  >
                    youtube.com/watch?v={result.videoId.split(':')[0]}
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div role="tablist" className="flex px-5 border-b border-slate-800/60 bg-slate-800/10 flex-shrink-0">
              {(['summary', 'transcript'] as const).map(tName => (
                <button
                  key={tName}
                  role="tab"
                  aria-selected={tab === tName}
                  onClick={() => setTab(tName)}
                  className={`px-5 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    tab === tName ? 'border-red-500 text-red-500' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tName === 'summary' ? t.result.tabSummary : t.result.tabTranscript}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="p-6 md:p-8 max-h-[400px] overflow-y-auto bg-slate-900/30">
              {tab === 'summary' ? (
                <MarkdownRenderer text={result.summary} />
              ) : (
                <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap select-text">
                  {result.transcript}
                </p>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-800/40 bg-slate-800/10 flex-shrink-0">
              <div className="text-xs text-slate-500">
                {t.result.aiDisclaimer}
              </div>
              <button
                onClick={copyContent}
                className={`px-4 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copied
                    ? 'text-green-400 border-green-500/20 bg-green-500/10'
                    : 'text-slate-300 border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.result.btnCopied}
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    {t.result.btnCopy}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Small features list */}
        {!result && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl text-left">
            <div className="p-5 bg-slate-800/25 border border-slate-800/60 rounded-xl hover:border-slate-700/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-lg mb-3">
                ⚡
              </div>
              <h3 className="font-semibold text-sm text-slate-200 mb-1">
                {locale === 'ru' ? 'Мгновенный анализ' : 'Instant Analysis'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {locale === 'ru'
                  ? 'Не нужно смотреть длинные видео. Извлекаем ключевую суть всего за 10-15 секунд.'
                  : 'No need to watch long videos. Extract the key essence in just 10-15 seconds.'}
              </p>
            </div>
            <div className="p-5 bg-slate-800/25 border border-slate-800/60 rounded-xl hover:border-slate-700/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-lg mb-3">
                🎯
              </div>
              <h3 className="font-semibold text-sm text-slate-200 mb-1">
                {locale === 'ru' ? 'Качественный ИИ' : 'High Quality AI'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {locale === 'ru'
                  ? 'Использование Google Gemini 2.5 Flash гарантирует структурированность и точность выводов.'
                  : 'Using Google Gemini 2.5 Flash guarantees highly structured and accurate summaries.'}
              </p>
            </div>
            <div className="p-5 bg-slate-800/25 border border-slate-800/60 rounded-xl hover:border-slate-700/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-lg mb-3">
                💾
              </div>
              <h3 className="font-semibold text-sm text-slate-200 mb-1">
                {locale === 'ru' ? 'Сохранение истории' : 'Save History'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {locale === 'ru'
                  ? 'Войдите в личный кабинет, чтобы хранить все свои прошлые саммари в одном месте.'
                  : 'Log in to store all your past summaries securely in one place.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-800/30 z-10 gap-4">
        <span>© {new Date().getFullYear()} AI YouTube Summarizer. {locale === 'ru' ? 'Все права защищены.' : 'All rights reserved.'}</span>
        <button
          onClick={() => setIsDonateOpen(true)}
          className="font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
        >
          💝 {locale === 'ru' ? 'Пожертвовать разработчику' : 'Donate to Developer'}
        </button>
      </footer>

      <DonateModal isOpen={isDonateOpen} onClose={() => setIsDonateOpen(false)} locale={locale} />
    </main>
  )
}
