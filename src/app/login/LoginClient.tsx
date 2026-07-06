'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getTranslation, Locale } from '@/lib/i18n'

export default function LoginClient({ locale }: { locale: Locale }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const t = getTranslation(locale)

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(locale === 'en' ? '/en/dashboard' : '/dashboard')
      }
    })
  }, [router, locale])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (!email.trim() || !password.trim()) {
      setError(locale === 'ru' ? 'Заполните все поля.' : 'Fill in all fields.')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        if (data.user && data.session) {
          router.replace(locale === 'en' ? '/en/dashboard' : '/dashboard')
        } else {
          setMessage(locale === 'ru' ? 'Проверьте вашу почту для подтверждения регистрации.' : 'Check your email to confirm registration.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.replace(locale === 'en' ? '/en/dashboard' : '/dashboard')
      }
    } catch (err: any) {
      setError(err.message || (locale === 'ru' ? 'Произошла ошибка при авторизации.' : 'An error occurred during authentication.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main data-testid="login-container" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-red-900/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-rose-900/5 blur-[100px] pointer-events-none" />

      {/* Language Switcher in Login Page */}
      <div className="absolute top-6 right-6 flex bg-slate-800/60 p-1 rounded-xl border border-slate-700/40 z-10">
        <Link
          href={locale === 'ru' ? '#' : '/login'}
          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-colors ${
            locale === 'ru'
              ? 'bg-red-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          RU
        </Link>
        <Link
          href={locale === 'en' ? '#' : '/en/login'}
          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-colors ${
            locale === 'en'
              ? 'bg-red-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          EN
        </Link>
      </div>

      <div className="max-w-md w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 shadow-xl backdrop-blur-xl z-10">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href={locale === 'en' ? '/en' : '/'} className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-md shadow-red-500/10">
            ▶
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">
            {isSignUp ? (locale === 'ru' ? 'Создать аккаунт' : 'Sign Up') : (locale === 'ru' ? 'Вход в систему' : 'Sign In')}
          </h1>
          <p className="text-xs text-slate-400 mt-2 text-center leading-relaxed">
            {isSignUp
              ? (locale === 'ru' ? 'Зарегистрируйтесь, чтобы сохранять историю саммари' : 'Sign up to keep your summaries history safe')
              : t.login.subtitle}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
              Email
            </label>
            <input
              data-testid="login-email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={loading}
              className="w-full h-11 px-4 rounded-xl border border-slate-700 bg-slate-900/40 text-white text-xs outline-none focus:border-red-500/50 focus:bg-slate-900 transition-all disabled:opacity-60 placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
              {t.login.password}
            </label>
            <input
              data-testid="login-password-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full h-11 px-4 rounded-xl border border-slate-700 bg-slate-900/40 text-white text-xs outline-none focus:border-red-500/50 focus:bg-slate-900 transition-all disabled:opacity-60 placeholder-slate-600"
            />
          </div>

          {error && (
            <p data-testid="login-error-message" role="alert" className="text-xs text-red-400 bg-red-950/20 p-3 rounded-xl border border-red-900/30 flex items-center gap-1.5 leading-relaxed">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </p>
          )}

          {message && (
            <p data-testid="login-success-message" className="text-xs text-green-400 bg-green-950/20 p-3 rounded-xl border border-green-900/30 flex items-center gap-1.5 leading-relaxed">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {message}
            </p>
          )}

          <button
            data-testid="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98] shadow-md shadow-red-900/20"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSignUp ? (
              t.login.btnSignUp
            ) : (
              t.login.btnSignIn
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-6 pt-6 border-t border-slate-800/60 text-center">
          <button
            data-testid="login-toggle-btn"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setMessage('')
            }}
            className="text-xs font-bold text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            {isSignUp ? t.login.hasAccount : t.login.noAccount}
          </button>
        </div>
      </div>
    </main>
  )
}
