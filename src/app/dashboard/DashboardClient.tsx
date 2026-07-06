'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DonateModal } from '@/components/DonateModal'
import { getTranslation, Locale } from '@/lib/i18n'

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
  let html = escaped.replace(/\[(\d{2}:\d{2}(?::\d{2})?)\]/g, '<span class="text-red-500 font-mono font-semibold">[$1]</span>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function formatDate(isoString: string, locale: Locale = 'ru') {
  const date = new Date(isoString)
  const today = new Date()
  const isToday = date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear()
  const time = date.toLocaleTimeString(locale === 'en' ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (isToday) {
    return locale === 'ru' ? `Сегодня, ${time}` : `Today, ${time}`
  }
  return `${date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU')}, ${time}`
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
    <div className="text-sm leading-relaxed text-gray-700 space-y-3 select-text">
      {blocks.map((block, i) => {
        if (block.type === 'h3') {
          return (
            <h3 key={i} className="text-base font-bold text-gray-900 mt-6 mb-2">
              {renderLineContent(block.content)}
            </h3>
          )
        }
        if (block.type === 'blockquote') {
          return (
            <blockquote key={i} className="border-l-4 border-red-500 pl-4 italic text-gray-500 my-3 bg-gray-50/50 py-2 rounded-r-lg">
              {renderLineContent(block.content)}
            </blockquote>
          )
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="list-disc ml-5 mb-3 space-y-1.5 pl-1 text-gray-700">
              {block.items.map((item, j) => (
                <li key={j} className="text-gray-700">
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

export default function DashboardClient({ locale }: { locale: Locale }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stageIdx, setStageIdx] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [tab, setTab] = useState<'summary' | 'transcript' | 'code'>('summary')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isDonateOpen, setIsDonateOpen] = useState(false)

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const t = getTranslation(locale)

  // Helper to show toast
  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ message, type })
  }

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])


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
        router.replace(locale === 'en' ? '/en/login' : '/login')
      } else {
        setUserSession(session)
        setAuthLoading(false)

        // Process auto-summarization URL
        const params = new URLSearchParams(window.location.search)
        const queryUrl = params.get('url')
        const sessionUrl = sessionStorage.getItem('pendingUrl')
        const pendingUrl = sessionUrl || queryUrl
        if (pendingUrl) {
          setUrl(pendingUrl)
          sessionStorage.removeItem('pendingUrl')
          if (queryUrl) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
          handleSubmit(pendingUrl, session)
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace(locale === 'en' ? '/en/login' : '/login')
      } else {
        setUserSession(session)
        setAuthLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, locale])

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
          .eq('user_id', userSession.user.id)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        if (data) {
          const mapped = data.map((item: any) => {
            const sum = item.summaries
            const rawId = item.video_id || ''
            const cleanId = rawId.endsWith(':en') ? rawId.slice(0, -3) : rawId
            return {
              id: rawId,
              url: sum?.url || '',
              result: {
                videoId: cleanId,
                summary: sum?.summary || '',
                transcript: sum?.transcript || '',
                thumbnail: sum?.thumbnail || `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`,
              },
              date: formatDate(item.created_at, locale)
            }
          }).filter(item => item.id)
          setHistory(mapped)
        }
      } catch (e) {
        console.error('Error loading history from Supabase:', e)
      }
    }

    loadHistory()
  }, [userSession, locale])

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

  async function handleSubmit(urlToUse?: string, sessionToUse?: any) {
    const activeUrl = urlToUse !== undefined ? urlToUse : url
    const activeSession = sessionToUse || userSession

    setError('')
    if (!activeUrl.trim()) {
      setError(t.landing.errors.emptyUrl)
      showToast(t.landing.errors.emptyUrl, 'error')
      return
    }

    if (loading) return
    if (!activeSession) {
      setError(locale === 'ru' ? 'Вы не авторизованы.' : 'You are not authorized.')
      showToast(locale === 'ru' ? 'Вы не авторизованы.' : 'You are not authorized.', 'error')
      return
    }

    setLoading(true)
    setResult(null)
    setStageIdx(0)

    let s = 0
    const iv = setInterval(() => {
      s = Math.min(s + 1, t.landing.stages.length - 1)
      setStageIdx(s)
    }, 1500)

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeSession.access_token}`
        },
        body: JSON.stringify({ url: activeUrl, lang: locale }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Server error')
        showToast(data.error || 'Server error', 'error')
        return
      }

      setResult(data)
      setTab('summary')
      const now = new Date().toLocaleTimeString(locale === 'en' ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
      const newItem: HistoryItem = {
        id: data.videoId,
        url: activeUrl,
        result: data,
        date: locale === 'ru' ? `Сегодня, ${now}` : `Today, ${now}`
      }
      setHistory(h => [newItem, ...h.filter(item => item.id !== data.videoId)].slice(0, 50))
      showToast(locale === 'ru' ? 'Видео успешно проанализировано!' : 'Video successfully analyzed!', 'success')
    } catch {
      setError(t.landing.errors.serverError)
      showToast(t.landing.errors.serverError, 'error')
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
    const msgConfirm = locale === 'ru' ? 'Вы уверены, что хотите очистить всю историю?' : 'Are you sure you want to clear your entire history?'
    if (window.confirm(msgConfirm)) {
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
        showToast(locale === 'ru' ? `Не удалось прочитать файл: ${errData.error || 'Ошибка доступа'}` : `Failed to read file: ${errData.error || 'Access denied'}`, 'error')
        return
      }
      const data = await res.json()
      setSelectedFile({ path: filePath, content: data.content })
      setTab('code')
      setSidebarOpen(false) // Close sidebar drawer on mobile
      showToast(locale === 'ru' ? `Файл ${filePath.split('/').pop()} загружен!` : `File ${filePath.split('/').pop()} loaded!`, 'success')
    } catch (e) {
      console.error(e)
      showToast(locale === 'ru' ? 'Ошибка при чтении файла' : 'Error reading file', 'error')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace(locale === 'en' ? '/en/login' : '/login')
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
          <Link href={locale === 'en' ? '/en' : '/'} className="flex items-center gap-2 font-bold text-gray-900 text-lg hover:opacity-80 transition-opacity">
            <span className="text-red-500">▶</span> {t.header.logo}
          </Link>
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
            {locale === 'ru' ? 'История' : 'History'}
          </button>
          <button
            onClick={() => setSidebarTab('files')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
              sidebarTab === 'files' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {locale === 'ru' ? 'Файлы проекта' : 'Project Files'}
          </button>
        </div>

        {/* Sidebar Content */}
        {sidebarTab === 'history' ? (
          <>
            <div className="px-4 pt-3.5 pb-1 text-[11px] font-semibold text-gray-400 tracking-wider uppercase flex-shrink-0">
              {locale === 'ru' ? 'История запросов' : 'Query History'}
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
              {history.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2 italic">{locale === 'ru' ? 'История пуста' : 'History is empty'}</p>
              ) : (
                history.map(item => (
                  <div
                    key={item.id + item.date}
                    data-testid={`history-item-${item.id}`}
                    className={`group relative flex items-center justify-between rounded-lg transition-colors pr-1 hover:bg-gray-50 ${
                      result?.videoId === item.result.videoId && tab !== 'code' ? 'bg-red-50/50 hover:bg-red-50' : ''
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
                        result?.videoId === item.result.videoId && tab !== 'code' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
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
                      title={locale === 'ru' ? 'Удалить из истории' : 'Delete from history'}
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
                  {t.dashboard.clearHistory}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="px-4 pt-3.5 pb-1 text-[11px] font-semibold text-gray-400 tracking-wider uppercase flex-shrink-0">
              {locale === 'ru' ? 'Файлы и папки' : 'Files & Folders'}
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                </div>
              ) : fileTree.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2 italic">{locale === 'ru' ? 'Файлы не найдены' : 'No files found'}</p>
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
              <span>{locale === 'ru' ? 'Каталог проекта' : 'Project Directory'}</span>
              <button
                onClick={fetchFileTree}
                className="hover:text-red-500 transition-colors cursor-pointer font-medium"
              >
                {locale === 'ru' ? 'Обновить' : 'Refresh'}
              </button>
            </div>
          </>
        )}

        {/* Support Widget */}
        <div className="p-3 border-t border-gray-100 bg-rose-50/10 flex-shrink-0">
          <button
            onClick={() => setIsDonateOpen(true)}
            className="w-full py-2 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/50 text-rose-600 hover:text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{t.dashboard.sidebar.donate}</span>
          </button>
        </div>

        {/* User Account Controls */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">{locale === 'ru' ? 'Аккаунт' : 'Account'}</p>
            <p className="text-xs text-gray-600 truncate font-semibold">{userSession?.user?.email}</p>
          </div>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
            title={locale === 'ru' ? 'Выйти из аккаунта' : 'Log out'}
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
            <span className="font-bold text-gray-900 text-base">{t.header.logo}</span>
          </div>
          <div className="hidden md:block text-sm font-semibold text-gray-700">
            {tab === 'code' ? (locale === 'ru' ? 'Просмотрщик исходного кода' : 'Source Code Viewer') : result ? (locale === 'ru' ? 'Результат анализа видео' : 'Video Summary Result') : (locale === 'ru' ? 'Новый запрос' : 'New Request')}
          </div>
          <div className="flex items-center gap-3">
            {/* Language Switcher inside dashboard */}
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
              <Link
                href={locale === 'ru' ? '#' : '/dashboard'}
                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-colors ${
                  locale === 'ru'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                RU
              </Link>
              <Link
                href={locale === 'en' ? '#' : '/en/dashboard'}
                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-colors ${
                  locale === 'en'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                EN
              </Link>
            </div>

            <button
              onClick={() => setIsDonateOpen(true)}
              className="h-8 px-3 rounded-lg border border-rose-200 hover:border-rose-300 bg-rose-50/50 hover:bg-rose-100/50 text-[11px] font-bold text-rose-600 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>{t.header.donate}</span>
            </button>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none md:hidden cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
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
                placeholder={locale === 'ru' ? "Вставьте ссылку на YouTube видео (например: https://www.youtube.com/watch?v=...)" : "Paste YouTube video link (e.g. https://www.youtube.com/watch?v=...)"}
                disabled={loading}
                className="w-full h-11 pl-4 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-60 font-sans"
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
              onClick={() => handleSubmit()}
              disabled={loading}
              className="h-11 px-6 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.landing.btnProcessing}
                </>
              ) : (
                locale === 'ru' ? 'Анализировать' : 'Analyze'
              )}
            </button>
          </div>
          {error && (
            <div className="max-w-4xl mx-auto mt-3 animate-slide-down">
              <div
                data-testid="url-error-message"
                role="alert"
                className="text-xs text-rose-600 bg-rose-50/80 backdrop-blur-sm border border-rose-100 p-3 rounded-xl flex items-center justify-between gap-2 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="font-semibold">{error}</span>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-rose-400 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-100/50"
                  title={locale === 'ru' ? 'Закрыть' : 'Close'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
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
              <p className="text-sm font-semibold text-gray-700 mb-2">{t.landing.stages[stageIdx]}</p>
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
                // Code File View
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-w-4xl mx-auto flex flex-col h-full max-h-[80vh]">
                  {/* File Header Details */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-[10px] text-red-500 font-bold tracking-wider uppercase">{locale === 'ru' ? 'Файл Проекта' : 'Project File'}</p>
                      <h2 className="text-xs font-semibold text-gray-800 font-mono mt-0.5 truncate">{selectedFile.path}</h2>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedFile.content)
                        alert(locale === 'ru' ? 'Содержимое файла скопировано в буфер обмена' : 'File contents copied to clipboard')
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
                      {t.result.btnCopy}
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
                          {t.result.tabSummary}
                        </button>
                        <button
                          role="tab"
                          data-testid="tab-transcript"
                          onClick={() => setTab('transcript')}
                          className="px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-all cursor-pointer"
                        >
                          {t.result.tabTranscript}
                        </button>
                      </>
                    )}
                    <button
                      role="tab"
                      data-testid="tab-code"
                      aria-selected={true}
                      className="px-5 py-3 text-sm font-semibold border-b-2 border-red-500 text-red-500 transition-all cursor-pointer"
                    >
                      {locale === 'ru' ? 'Код' : 'Code'}: {selectedFile.path.split('/').pop()}
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
                // Video Summary / Transcript View
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
                      <div className="w-full text-left">
                        <p className="text-[10px] text-red-400 font-bold tracking-wider uppercase">{t.result.source}</p>
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
                    {(['summary', 'transcript'] as const).map(tName => (
                      <button
                        key={tName}
                        role="tab"
                        data-testid={`tab-${tName}`}
                        aria-selected={tab === tName}
                        onClick={() => setTab(tName)}
                        className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                          tab === tName ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tName === 'summary' ? t.result.tabSummary : t.result.tabTranscript}
                      </button>
                    ))}
                    {selectedFile && (
                      <button
                        role="tab"
                        data-testid="tab-code"
                        onClick={() => setTab('code')}
                        className="px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-all cursor-pointer"
                      >
                        {locale === 'ru' ? 'Код' : 'Code'}: {selectedFile.path.split('/').pop()}
                      </button>
                    )}
                  </div>

                  {/* Content Panel */}
                  <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white text-left">
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
                      {t.result.aiDisclaimer}
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
                          {t.result.btnCopied}
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
                          {t.result.btnCopy}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                // Empty State
                <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-12">
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
                  <h2 className="text-lg font-bold text-gray-800 mb-1">{locale === 'ru' ? 'Готов к суммаризации' : 'Ready to Summarize'}</h2>
                  <p className="text-sm text-gray-400">
                    {locale === 'ru'
                      ? 'Вставьте ссылку на YouTube-видео в поле ввода выше или откройте любой файл проекта в боковой панели «Файлы проекта».'
                      : 'Paste a YouTube video link in the input field above or open any project file in the Project Files sidebar.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in max-w-sm w-full shadow-lg">
          <div className={`p-4 rounded-xl border flex items-start gap-3 backdrop-blur-md ${
            toast.type === 'error'
              ? 'bg-rose-50/90 border-rose-100 text-rose-800'
              : toast.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800'
              : 'bg-blue-50/90 border-blue-100 text-blue-800'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${
              toast.type === 'error'
                ? 'bg-rose-100 text-rose-600'
                : toast.type === 'success'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-blue-100 text-blue-600'
            }`}>
              {toast.type === 'error' ? '!' : toast.type === 'success' ? '✓' : 'i'}
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <DonateModal isOpen={isDonateOpen} onClose={() => setIsDonateOpen(false)} locale={locale} />
    </div>
  )
}
