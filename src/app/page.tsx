import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <div className="text-red-500 text-6xl mb-6">▶</div>
        <h1 className="text-4xl font-semibold text-gray-900 mb-4">
          AI YouTube Summarizer
        </h1>
        <p className="text-lg text-gray-500 mb-8">
          Вставьте ссылку на любое YouTube-видео и получите структурированное саммари, ключевые тезисы и полный транскрипт за несколько секунд.
        </p>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 bg-red-500 text-white px-8 py-3 rounded-xl text-base font-medium hover:bg-red-600 transition-colors">
          Начать бесплатно →
        </Link>
        <div className="mt-12 grid grid-cols-3 gap-6 text-sm text-gray-500">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl mb-2">⚡</div>
            <div className="font-medium text-gray-700">Быстро</div>
            <div>Субтитры и ИИ за ~10 секунд</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl mb-2">🌍</div>
            <div className="font-medium text-gray-700">Любой язык</div>
            <div>Саммари всегда на русском</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl mb-2">💾</div>
            <div className="font-medium text-gray-700">История</div>
            <div>Все саммари сохраняются</div>
          </div>
        </div>
      </div>
    </main>
  )
}
