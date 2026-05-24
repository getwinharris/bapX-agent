import { useState, useEffect, useRef, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MessageSquare, Plus, Settings, LogOut, Send, User, ChevronLeft, ChevronRight } from 'lucide-react'

interface Session {
  id: string; title: string; created_at: string; updated_at: string;
}
interface ChatMessage {
  id?: number; role: string; content: string; tool_calls?: any;
}

const API = ''

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userName, setUserName] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const loadSessions = async () => {
    const token = localStorage.getItem('bapx_token')
    if (!token) return
    const r = await fetch(`${API}/api/user/sessions`, { headers: { Authorization: `Bearer ${token}` } })
    const d = await r.json()
    setSessions(d.sessions || [])
  }

  useEffect(() => {
    const token = localStorage.getItem('bapx_token')
    if (!token) { navigate('/login'); return }
    fetch(`${API}/api/user/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(u => {
        setUserName(u.name || u.email)
        setHasApiKey(!!u.api_key)
      })
      .catch(() => { localStorage.removeItem('bapx_token'); navigate('/login') })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadSessions()
  }, [navigate])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const newChat = () => {
    setSessionId(null)
    setMessages([])
  }

  const loadSession = async (id: string) => {
    setSessionId(id)
    setMessages([])
    const token = localStorage.getItem('bapx_token')
    const r = await fetch(`${API}/api/chat/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const d = await r.json()
    setMessages(d.messages || [])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || streaming) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setStreaming(true)

    const token = localStorage.getItem('bapx_token')
    const res = await fetch(`${API}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: msg, sessionId }),
    })

    if (!res.ok) {
      const err = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${err.error}` }])
      setStreaming(false)
      return
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let content = ''
    let buffer = ''

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              content += data.text
              setMessages(prev => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                if (last?.role === 'assistant') last.content = content
                return copy
              })
            }
            if (data.done) {
              setSessionId(data.sessionId)
              loadSessions()
            }
            if (data.error) {
              setMessages(prev => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                if (last?.role === 'assistant') last.content = `❌ ${data.error}`
                return copy
              })
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    }
    setStreaming(false)
  }

  const logout = () => {
    localStorage.removeItem('bapx_token')
    navigate('/login')
  }

  return (
    <div className="h-screen flex" style={{ background: '#0a0a14' }}>
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-surface-border transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}
        style={{ background: '#0d0d1a' }}>
        <div className="p-3 border-b border-surface-border">
          <Link to="/" className="text-lg font-extrabold tracking-tight text-white block text-center">
            bap<span style={{ color: '#9651b8' }}>X</span>
          </Link>
        </div>
        <div className="p-2">
          <button onClick={newChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 border border-surface-border transition-colors">
            <Plus size={14} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessions.map(s => (
            <button key={s.id} onClick={() => loadSession(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${sessionId === s.id ? 'bg-[#9651b8]/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
              <MessageSquare size={14} className="shrink-0" />
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-surface-border space-y-1">
          <Link to="/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors">
            <Settings size={14} /> Settings
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-950/20 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 h-12 border-b border-surface-border shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white p-1">
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User size={12} />
            <span>{userName || 'User'}</span>
          </div>
          <div className="flex-1" />
          <Link to="/settings" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            {hasApiKey ? 'API Key Configured ✓' : 'Configure API Key →'}
          </Link>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="text-5xl font-extrabold tracking-tight mb-4" style={{ color: '#9651b8' }}>
                bap<span style={{ color: '#9651b8' }}>X</span>
              </div>
              <p className="text-gray-500 text-sm max-w-md">
                Your autonomous AI agent platform. Start a conversation below.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role !== 'user' && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: '#9651b8' }}>
                      <span className="text-[10px] font-bold text-white">bX</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] ${m.role === 'user' ? 'order-1' : ''}`}>
                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'rounded-br-md' : ''
                    }`}
                      style={m.role === 'user' ? { background: '#9651b8', color: '#fff' } : { background: '#12121e', border: '1px solid #2a2a3e' }}>
                      {m.content || (i === messages.length - 1 && streaming ? (
                        <span className="typing-indicator inline-flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        </span>
                      ) : '')}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-surface-border p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
            <div className="flex-1 relative">
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder="Ask bapX anything..."
                className="w-full rounded-xl border border-surface-border bg-surface-light pl-4 pr-12 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#9651b8] focus:ring-1 focus:ring-[#9651b8]/30 transition-all"
                disabled={streaming} />
                {input.length > 0 && (
                  <button type="submit" disabled={streaming}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white transition-colors"
                    style={{ background: '#9651b8' }}>
                    <Send size={14} />
                  </button>
                )}
            </div>
          </form>
          <p className="text-[10px] text-gray-600 text-center mt-2">
            bapX uses your own API key. Messages are private to your account.
          </p>
        </div>
      </div>
    </div>
  )
}
