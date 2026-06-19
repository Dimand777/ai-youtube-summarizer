'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

type FileNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

const STAGES = [
  'Получение субтитров...',
  'ИИ анализирует текст...',
  'Формируем саммари...',
]

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderLineContent(text: string) {
  const escaped = escapeHtml(text)
  const html = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function formatDate(isoString: string) {
  const date = new Date(isoString)
  const today = new Date()
  const isToday = date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear()
  const time = date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  if (isToday) {
    return `Сегодня, ${time}`
  }
  return `${date.toLocaleDateString('ru')}, ${time}`
}

function MarkdownRenderer({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed text-gray-700 space-y-3 select-text">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) {
          const content = line.slice(3)
          return (
            <h3 key={i} className="text-base font-bold text-gray-900 mt-6 mb-2">
              {renderLineContent(content)}
            </h3>
          )
        }
        if (line.startsWith('> ')) {
          const content = line.slice(2)
          return (
            <blockquote key={i} className="border-l-4 border-red-500 pl-4 italic text-gray-500 my-3 bg-gray-50/50 py-2 rounded-r-lg">
              {renderLineContent(content)}
            </blockquote>
          )
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.slice(2)
          return (
            <li key={i} className="list-disc ml-5 mb-1.5 pl-1 text-gray-700">
              {renderLineContent(content)}
            </li>
          )
        }
        if (!line.trim()) return <div key={i} className="h-2" />
        
        return (
          <p key={i} className="mb-2 leading-relaxed">
            {renderLineContent(line)}
          </p>
        )
      })}
    </div>
  )
}

function FileTreeItem({
  node,
  onSelectFile,
  selectedPath,
}: {
  node: FileNode
  onSelectFile: (path: string) => void
  selectedPath?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isDir = node.type === 'directory'
  const isSelected = selectedPath === node.path

  if (isDir) {
    return (
      <div className="select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-1.5 py-1.5 px-2 hover:bg-gray-50 rounded-lg text-xs text-gray-700 font-medium cursor-pointer text-left transition-colors"
        >
          <span className="text-gray-400 w-3 h-3 flex items-center justify-center text-[9px] flex-shrink-0">
            {isOpen ? '▼' : '▶'}
          </span>
          <span className="text-yellow-500 flex-shrink-0 text-xs">📁</span>
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div className="pl-3 border-l border-gray-100 ml-3.5 mt-0.5 space-y-0.5">
            {node.children.map(child => (
              <FileTreeItem
                key={child.path}
                node={child}
                onSelectFile={onSelectFile}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs cursor-pointer text-left truncate transition-colors ${
        isSelected ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className="text-gray-400 flex-shrink-0">📄</span>
      <span className="truncate">{node.name}</span>
    </button>
  )
}

export default function Dashboard() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stageIdx, setStageIdx] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [tab, setTab] = useState<'summary' | 'transcript' | 'code'>('summary')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Auth state
  const [userSession, setUserSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()

  // File explorer states
  const [sidebarTab, setSidebarTab] = useState<'history' | 'files'>('history')
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null)

  // Check auth session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setUserSession(session)
        setAuthLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login')
      } else {
        setUserSession(session)
        setAuthLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // Load history from Supabase when session is loaded
  useEffect(() => {
    async function loadHistory() {
      if (!userSession) return
      
      try {
        const { data, error } = await supabase
          .from('user_history')
          .select(`
            created_at,
            video_id,
            summaries (
              video_id,
              url,
              summary,
              transcript,
              thumbnail
            )
          `)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        if (data) {
          const mapped = data.map((item: any) => {
            const sum = item.summaries
            return {
              id: item.video_id,
              url: sum?.url || '',
              result: {
                videoId: sum?.video_id || '',
                summary: sum?.summary || '',
                transcript: sum?.transcript || '',
                thumbnail: sum?.thumbnail || '',
              },
              date: formatDate(item.created_at)
            }
          }).filter(item => item.id)
          setHistory(mapped)
        }
      } catch (e) {
        console.error('Error loading history from Supabase:', e)
      }
    }

    loadHistory()
  }, [userSession])

  // Fetch file tree when switching to "files" tab for the first time
  async function fetchFileTree() {
    setLoadingFiles(true)
    try {
      const res = await fetch('/api/files')
      if (res.ok) {
        const data = await res.json()
        setFileTree(data)
      }
    } catch (e) {
      console.error('Failed to fetch file tree', e)
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => {
    if (sidebarTab === 'files' && fileTree.length === 0) {
      fetchFileTree()
    }
  }, [sidebarTab, fileTree])

  async function handleSubmit() {
    setError('')
    if (!url.trim()) {
      setError('Введите ссылку на YouTube-видео.')
      return
    }

    if (loading) return
    if (!userSession) {
      setError('Вы не авторизованы.')
      return
    }

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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.access_token}`
        },
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
      const newItem: HistoryItem = {
        id: data.videoId,
        url,
        result: data,
        date: `Сегодня, ${now}`
      }
      setHistory(h => [newItem, ...h.filter(item => item.id !== data.videoId)].slice(0, 50))
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

  async function deleteHistoryItem(id: string) {
    if (!userSession) return
    
    // Optimistic UI update
    setHistory(h => h.filter(item => item.id !== id))
    if (result && result.videoId === id) {
      setResult(null)
      if (selectedFile) {
        setTab('code')
      } else {
        setTab('summary')
      }
    }

    try {
      await supabase
        .from('user_history')
        .delete()
        .eq('user_id', userSession.user.id)
        .eq('video_id', id)
    } catch (e) {
      console.error('Failed to delete item from Supabase:', e)
    }
  }

  async function clearHistory() {
    if (!userSession) return
    if (window.confirm('Вы уверены, что хотите очистить всю историю?')) {
      // Optimistic UI update
      setHistory([])
      setResult(null)
      if (selectedFile) {
        setTab('code')
      } else {
        setTab('summary')
      }

      try {
        await supabase
          .from('user_history')
          .delete()
          .eq('user_id', userSession.user.id)
      } catch (e) {
        console.error('Failed to clear history from Supabase:', e)
      }
    }
  }

  async function handleSelectFile(filePath: string) {
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`)
      if (!res.ok) {
        const errData = await res.json()
        alert(`Не удалось прочитать файл: ${errData.error || 'Ошибка доступа'}`)
        return
      }
      const data = await res.json()
      setSelectedFile({ path: filePath, content: data.content })
      setTab('code')
      setSidebarOpen(false) // Close sidebar drawer on mobile
    } catch (e) {
      console.error(e)
      alert('Ошибка при чтении файла')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-100 border-t-red-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar Backdrop for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-gray-200 transition-transform duration-300 transform md:translate-x-0 md:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
            <span className="text-red-500">▶</span> YT Summarizer
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:hidden cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sidebar Navigation Tabs */}
        <div className="flex px-3 py-2 gap-1 border-b border-gray-100 bg-gray-50/30 flex-shrink-0">
          <button
            onClick={() => setSidebarTab('history')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
              sidebarTab === 'history' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            История
          </button>
          <button
            onClick={() => setSidebarTab('files')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
              sidebarTab === 'files' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Файлы проекта
          </button>
        </div>

        {/* Sidebar Content */}
        {sidebarTab === 'history' ? (
          <>
            <div className="px-4 pt-3.5 pb-1 text-[11px] font-semibold text-gray-400 tracking-wider uppercase flex-shrink-0">
              История запросов
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
              {history.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2 italic">История пуста</p>
              ) : (
                history.map(item => (
                  <div
                    key={item.id + item.date}
                    data-testid={`history-item-${item.id}`}
                    className={`group relative flex items-center justify-between rounded-lg transition-colors pr-1 hover:bg-gray-50 ${
                      result?.videoId === item.id && tab !== 'code' ? 'bg-red-50/50 hover:bg-red-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => {
                        setResult(item.result)
                        setTab('summary')
                        setSidebarOpen(false)
                      }}
                      className="flex-1 flex gap-3 p-2 text-left min-w-0 cursor-pointer"
                    >
                      <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 font-semibold text-xs transition-colors ${
                        result?.videoId === item.id && tab !== 'code' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        YT
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800 truncate">
                          {item.url.replace(/^https?:\/\/(www\.)?/, '')}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{item.date}</div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteHistoryItem(item.id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                      title="Удалить из истории"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
                <button
                  onClick={clearHistory}
                  className="w-full py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Очистить историю
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="px-4 pt-3.5 pb-1 text-[11px] font-semibold text-gray-400 tracking-wider uppercase flex-shrink-0">
              Файлы и папки
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                </div>
              ) : fileTree.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2 italic">Файлы не найдены</p>
              ) : (
                fileTree.map(node => (
                  <FileTreeItem
                    key={node.path}
                    node={node}
                    onSelectFile={handleSelectFile}
                    selectedPath={selectedFile?.path}
                  />
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center text-[10px] text-gray-400 px-4 flex-shrink-0">
              <span>Каталог проекта</span>
              <button
                onClick={fetchFileTree}
                className="hover:text-red-500 transition-colors cursor-pointer font-medium"
              >
                Обновить
              </button>
            </div>
          </>
        )}

        {/* User Account Controls */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Аккаунт</p>
            <p className="text-xs text-gray-600 truncate font-semibold">{userSession?.user?.email}</p>
          </div>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
            title="Выйти из аккаунта"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-red-500 font-bold text-lg">▶</span>
            <span className="font-bold text-gray-900 text-base">YT Summarizer</span>
          </div>
          <div className="hidden md:block text-sm font-semibold text-gray-700">
            {tab === 'code' ? 'Просмотрщик исходного кода' : result ? 'Результат анализа видео' : 'Новый запрос'}
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none md:hidden cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* URL Input Bar */}
        <div className="bg-white border-b border-gray-200 px-5 py-4 shadow-sm flex-shrink-0">
          <div className="max-w-4xl mx-auto flex gap-3">
            <div className="flex-1 relative">
              <input
                data-testid="youtube-url-input"
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                placeholder="Вставьте ссылку на YouTube видео (например: https://www.youtube.com/watch?v=...)"
                disabled={loading}
                className="w-full h-11 pl-4 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-60 font-sans"
              />
              {url && (
                <button
                  onClick={() => setUrl('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              data-testid="submit-url-btn"
              onClick={handleSubmit}
              disabled={loading}
              className="h-11 px-6 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Обработка
                </>
              ) : (
                'Анализировать'
              )}
            </button>
          </div>
          {error && (
            <div className="max-w-4xl mx-auto mt-2">
              <p
                data-testid="url-error-message"
                role="alert"
                className="text-xs text-red-500 flex items-center gap-1"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          {loading ? (
            /* Loading State */
            <div
              data-testid="loading-spinner"
              className="bg-white border border-gray-100 rounded-2xl p-8 text-center max-w-md mx-auto shadow-md"
            >
              <div className="w-10 h-10 border-4 border-red-100 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-semibold text-gray-700 mb-2">{STAGES[stageIdx]}</p>
              <div className="mt-6 space-y-2.5 max-w-[280px] mx-auto">
                {[80, 60, 90, 50].map((w, i) => (
                  <div
                    key={i}
                    data-testid={i === 0 ? 'summary-skeleton' : undefined}
                    style={{ width: `${w}%` }}
                    className="h-2.5 bg-gray-100 rounded-full mx-auto animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Dynamic View rendering depending on active tab */}
              {tab === 'code' && selectedFile ? (
                /* Code File View */
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-w-4xl mx-auto flex flex-col h-full max-h-[80vh]">
                  {/* File Header Details */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-[10px] text-red-500 font-bold tracking-wider uppercase">Файл Проекта</p>
                      <h2 className="text-xs font-semibold text-gray-800 font-mono mt-0.5 truncate">{selectedFile.path}</h2>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedFile.content)
                        alert('Содержимое файла скопировано в буфер обмена')
                      }}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 hover:text-red-500 transition-colors flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                        />
                      </svg>
                      Копировать
                    </button>
                  </div>

                  {/* Navigation Tab Bar inside Code view */}
                  <div role="tablist" className="flex px-5 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                    {result && (
                      <>
                        <button
                          role="tab"
                          data-testid="tab-summary"
                          onClick={() => setTab('summary')}
                          className="px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-all cursor-pointer"
                        >
                          Саммари
                        </button>
                        <button
                          role="tab"
                          data-testid="tab-transcript"
                          onClick={() => setTab('transcript')}
                          className="px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-all cursor-pointer"
                        >
                          Транскрипт
                        </button>
                      </>
                    )}
                    <button
                      role="tab"
                      data-testid="tab-code"
                      aria-selected={true}
                      className="px-5 py-3 text-sm font-semibold border-b-2 border-red-500 text-red-500 transition-all cursor-pointer"
                    >
                      Код: {selectedFile.path.split('/').pop()}
                    </button>
                  </div>

                  {/* Code View Panel */}
                  <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-gray-950 text-gray-200 font-mono text-xs leading-relaxed font-semibold">
                    <pre className="select-text whitespace-pre-wrap break-all">
                      <code>{selectedFile.content}</code>
                    </pre>
                  </div>
                </div>
              ) : result ? (
                /* Video Summary / Transcript View */
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-w-4xl mx-auto flex flex-col h-full max-h-[80vh]">
                  {/* Thumbnail Header */}
                  <div className="relative h-44 md:h-56 w-full bg-black overflow-hidden flex-shrink-0">
                    <img
                      src={result.thumbnail}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover opacity-80"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end p-5">
                      <div className="w-full">
                        <p className="text-[10px] text-red-400 font-bold tracking-wider uppercase">YouTube Источник</p>
                        <a
                          href={`https://youtube.com/watch?v=${result.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:underline text-sm font-semibold mt-1 inline-flex items-center gap-1.5 truncate max-w-full"
                        >
                          youtube.com/watch?v={result.videoId}
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div role="tablist" className="flex px-5 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                    {(['summary', 'transcript'] as const).map(t => (
                      <button
                        key={t}
                        role="tab"
                        data-testid={`tab-${t}`}
                        aria-selected={tab === t}
                        onClick={() => setTab(t)}
                        className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                          tab === t ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {t === 'summary' ? 'Саммари' : 'Транскрипт'}
                      </button>
                    ))}
                    {selectedFile && (
                      <button
                        role="tab"
                        data-testid="tab-code"
                        onClick={() => setTab('code')}
                        className="px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-all cursor-pointer"
                      >
                        Код: {selectedFile.path.split('/').pop()}
                      </button>
                    )}
                  </div>

                  {/* Content Panel */}
                  <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
                    {tab === 'summary' && <MarkdownRenderer text={result.summary} />}
                    {tab === 'transcript' && (
                      <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap select-text">
                        {result.transcript}
                      </p>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex-shrink-0">
                    <div className="text-xs text-gray-400">
                      Саммари сформировано с помощью ИИ
                    </div>
                    <button
                      data-testid="copy-btn"
                      onClick={copyContent}
                      className={`px-4 py-2 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        copied
                          ? 'text-green-600 border-green-200 bg-green-50'
                          : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {copied ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Скопировано
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                            />
                          </svg>
                          Копировать
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-4 animate-bounce">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 mb-1">Готов к суммаризации</h2>
                  <p className="text-sm text-gray-400">
                    Вставьте ссылку на YouTube-видео в поле ввода выше или откройте любой файл проекта в боковой панели «Файлы проекта».
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
