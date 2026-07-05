'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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

export default function Home() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [userSession, setUserSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()

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

  async function handleGoogleLogin() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Ошибка входа через Google')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUserSession(null)
  }

  function handleSummarize(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!url.trim()) {
      setError('Введите ссылку на YouTube-видео.')
      return
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      setError('Некорректная ссылка на YouTube-видео.')
      return
    }

    if (userSession) {
      // User is logged in, redirect to dashboard to start summarizing
      router.push(`/dashboard?url=${encodeURIComponent(url)}`)
    } else {
      // User is not logged in, save url and login with Google
      sessionStorage.setItem('pendingUrl', url)
      handleGoogleLogin()
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-red-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800/60 z-10">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white font-bold shadow-md shadow-red-500/20">
            ▶
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Summarizer
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {authLoading ? (
            <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
          ) : userSession ? (
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 hidden sm:inline-block max-w-[150px] truncate">
                {userSession.user.email}
              </span>
              <Link
                href="/dashboard"
                className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors flex items-center justify-center"
              >
                Панель управления
              </Link>
              <button
                onClick={handleLogout}
                className="h-9 px-3 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Выйти
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="h-10 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all shadow-lg shadow-white/5 flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.01c2.34-2.16 3.69-5.32 3.69-8.74Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.54 1.19-3.95 1.19-3.05 0-5.63-2.06-6.55-4.83H1.31v3.23A12 12 0 0 0 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.45 14.33a7.14 7.14 0 0 1 0-4.66V6.44H1.31a12 12 0 0 0 0 11.12l4.14-3.23Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0A12 12 0 0 0 1.31 6.44L5.45 9.67C6.37 6.9 8.95 4.75 12 4.75Z"
                />
              </svg>
              Войти через Google
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-6 py-16 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400 mb-6 animate-pulse">
          ⚡ ИИ саммаризация YouTube видео
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Получите краткую выжимку <br />
          <span className="bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">
            любого YouTube видео
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Вставьте ссылку на YouTube-видео ниже. Наш искусственный интеллект мгновенно проанализирует субтитры и сформирует структурированное саммари, сэкономив ваше время.
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
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full h-12 pl-4 pr-4 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-100 placeholder-slate-500 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                />
              </div>
              <button
                type="submit"
                className="h-12 px-6 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/10 hover:shadow-red-600/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Саммаризировать</span>
                <span className="text-xs">→</span>
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-400 text-left bg-red-950/20 border border-red-900/30 px-3 py-2 rounded-lg mt-2 flex items-center gap-1.5 animate-fadeIn">
                ⚠️ {error}
              </p>
            )}

            <p className="text-[11px] text-slate-500 text-left pl-1">
              * Поддерживаются стандартные ссылки YouTube, укороченные youtu.be и YouTube Shorts.
            </p>
          </form>
        </div>

        {/* Small features list */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl text-left">
          <div className="p-5 bg-slate-800/25 border border-slate-800/60 rounded-xl hover:border-slate-700/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-lg mb-3">
              ⚡
            </div>
            <h3 className="font-semibold text-sm text-slate-200 mb-1">Мгновенный анализ</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Не нужно смотреть длинные видео. Извлекаем ключевую суть всего за 10-15 секунд.
            </p>
          </div>
          <div className="p-5 bg-slate-800/25 border border-slate-800/60 rounded-xl hover:border-slate-700/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-lg mb-3">
              🎯
            </div>
            <h3 className="font-semibold text-sm text-slate-200 mb-1">Качественный ИИ</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Использование Google Gemini 1.5 Flash гарантирует структурированность и точность выводов.
            </p>
          </div>
          <div className="p-5 bg-slate-800/25 border border-slate-800/60 rounded-xl hover:border-slate-700/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-lg mb-3">
              💾
            </div>
            <h3 className="font-semibold text-sm text-slate-200 mb-1">Сохранение истории</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Войдите через Google, чтобы хранить все свои прошлые саммари в одном месте.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-800/30 z-10">
        © {new Date().getFullYear()} AI YouTube Summarizer. Все права защищены.
      </footer>
    </main>
  )
}
