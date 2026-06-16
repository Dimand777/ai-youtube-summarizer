'use client'
import { useState } from 'react'

type Result = {
  videoId: string
  summary: string
  transcript: string
  thumbnail: string
}

type HistoryItem = {
  id: string
  url: string
  result: Result
  date: string
}

const STAGES = [
  'Получение субтитров...',
  'ИИ анализирует текст...',
  'Формируем саммари...',
]

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function MarkdownRenderer({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 13, lineHeight: 1.75 }}>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <h3 key={i} style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 8px' }}>{escapeHtml(line.slice(3))}</h3>
        if (line.startsWith('> '))
          return <blockquote key={i} style={{ borderLeft: '3px solid #ef4444', paddingLeft: 12, fontStyle: 'italic', color: '#6b7280', margin: '8px 0' }}>{escapeHtml(line.slice(2))}</blockquote>
        if (line.startsWith('- ')) {
          const content = line.slice(2)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          return <li key={i} style={{ marginLeft: 16, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: escapeHtml(content).replace(/<strong>(.*?)<\/strong>/g, '<strong>$1</strong>') }} />
        }
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />
        const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        return <p key={i} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: escapeHtml(html).replace(/<strong>(.*?)<\/strong>/g, '<strong>$1</strong>') }} />
      })}
    </div>
  )
}

export default function Dashboard() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stageIdx, setStageIdx] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [tab, setTab] = useState<'summary' | 'transcript'>('summary')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [copied, setCopied] = useState(false)

  async function handleSubmit() {
    setError('')
    if (!url.trim()) {
      setError('Введите ссылку на YouTube-видео.')
      return
    }

    if (loading) return

    setLoading(true)
    setResult(null)
    setStageIdx(0)

    let s = 0
    const iv = setInterval(() => {
      s = Math.min(s + 1, STAGES.length - 1)
      setStageIdx(s)
    }, 1500)

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Ошибка сервера')
        return
      }

      setResult(data)
      setTab('summary')
      const now = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
      setHistory(h => [{ id: data.videoId, url, result: data, date: `Сегодня, ${now}` }, ...h].slice(0, 50))
    } catch {
      setError('Не удалось связаться с сервером.')
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
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
      <aside style={{ width: 240, background: '#fff', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15 }}>
          <span style={{ color: '#ef4444' }}>▶</span> YT Summarizer
        </div>
        <div style={{ padding: '10px 12px 4px', fontSize: 11, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>История</div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          {history.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af', padding: '8px 8px' }}>Пусто</p>}
          {history.map(item => (
            <button key={item.id + item.date} data-testid={`history-item-${item.id}`}
              onClick={() => { setResult(item.result); setTab('summary') }}
              style={{ width: '100%', display: 'flex', gap: 8, padding: '8px', borderRadius: 8, cursor: 'pointer', border: 'none', background: 'transparent', textAlign: 'left', marginBottom: 2 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#111' }}>{item.url.replace('https://', '').replace('http://', '')}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{item.date}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '14px 20px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input data-testid="youtube-url-input" type="text" value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
              placeholder="https://youtube.com/watch?v=..."
              disabled={loading}
              style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            <button data-testid="submit-url-btn" onClick={handleSubmit} disabled={loading}
              style={{ height: 38, padding: '0 16px', background: loading ? '#fca5a5' : '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Обработка...' : 'Генерировать'}
            </button>
          </div>
          {error && <p data-testid="url-error-message" role="alert" style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{error}</p>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {!loading && !result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', textAlign: 'center', gap: 12 }}>
              <div style={{ fontSize: 48, opacity: 0.3 }}>▶</div>
              <p style={{ fontSize: 14 }}>Вставьте ссылку и нажмите «Генерировать»</p>
            </div>
          )}

          {loading && (
            <div data-testid="loading-spinner" style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, padding: '32px 24px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #fee2e2', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{STAGES[stageIdx]}</p>
              <div style={{ marginTop: 20 }}>
                {[80, 60, 90, 50].map((w, i) => (
                  <div key={i} data-testid={i === 0 ? 'summary-skeleton' : undefined}
                    style={{ height: 12, width: `${w}%`, background: '#f3f4f6', borderRadius: 4, margin: '8px auto', animation: 'pulse 1.2s ease-in-out infinite' }} />
                ))}
              </div>
            </div>
          )}

          {result && !loading && (
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
              <img src={result.thumbnail} alt="Video thumbnail" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} loading="lazy" />
              <div style={{ padding: '14px 20px 0' }}>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>youtube.com/watch?v={result.videoId}</p>
              </div>
              <div role="tablist" style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid #f0f0f0', marginTop: 12 }}>
                {(['summary', 'transcript'] as const).map(t => (
                  <button key={t} data-testid={`tab-${t}`} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                    style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: tab === t ? '2px solid #ef4444' : '2px solid transparent', background: 'none', cursor: 'pointer', color: tab === t ? '#ef4444' : '#6b7280', fontFamily: 'inherit' }}>
                    {t === 'summary' ? 'Саммари' : 'Транскрипт'}
                  </button>
                ))}
              </div>
              <div role="tabpanel" style={{ padding: 20, maxHeight: '50vh', overflowY: 'auto' }}>
                {tab === 'summary' && <MarkdownRenderer text={result.summary} />}
                {tab === 'transcript' && (
                  <p style={{ fontSize: 13, lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-wrap' }}>{result.transcript}</p>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 20px', borderTop: '1px solid #f0f0f0' }}>
                <button data-testid="copy-btn" onClick={copyContent}
                  style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: copied ? '#16a34a' : '#6b7280', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? '✓ Скопировано' : 'Копировать'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
