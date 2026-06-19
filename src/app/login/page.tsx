'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      }
    })
  }, [router])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (!email.trim() || !password.trim()) {
      setError('Заполните все поля.')
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
          router.replace('/dashboard')
        } else {
          setMessage('Проверьте вашу почту для подтверждения регистрации (если включено подтверждение).')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.replace('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при авторизации.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main data-testid="login-container" className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 font-bold text-2xl mb-3">
            ▶
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSignUp ? 'Создать аккаунт' : 'Войти в личный кабинет'}
          </h1>
          <p className="text-sm text-gray-400 mt-1 text-center">
            {isSignUp
              ? 'Зарегистрируйтесь, чтобы сохранять историю саммари'
              : 'Введите свои данные для доступа к истории'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              data-testid="login-email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={loading}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Пароль
            </label>
            <input
              data-testid="login-password-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-60"
            />
          </div>

          {error && (
            <p data-testid="login-error-message" role="alert" className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-1.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </p>
          )}

          {message && (
            <p data-testid="login-success-message" className="text-xs text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 flex items-center gap-1.5">
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
            className="w-full h-11 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSignUp ? (
              'Зарегистрироваться'
            ) : (
              'Войти'
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <button
            data-testid="login-toggle-btn"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setMessage('')
            }}
            className="text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
          >
            {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </main>
  )
}
