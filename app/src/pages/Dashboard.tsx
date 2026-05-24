import { useState, useEffect, useRef, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MessageSquare, Plus, Settings, LogOut, Send, User, ChevronLeft, ChevronRight, Key, ArrowRight, CheckCircle, Bot, Sparkles } from 'lucide-react'

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
  const [hasMessages, setHasMessages] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
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
        setIsLoading(false)
      })
      .catch(() => { localStorage.removeItem('bapx_token'); navigate('/login') })
    loadSessions()
  }, [navigate])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Refresh profile when returning from settings (e.g. after API key config)
  useEffect(() => {
    const handleFocus = () => {
      const token = localStorage.getItem('bapx_token')
      if (!token) return
      fetch(`${API}/api/user/profile`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(u => {
          setHasApiKey(!!u.api_key)
          setHasMessages(false) // will be rechecked next message
        })
        .catch(() => {})
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const newChat = () => {
    setSessionId(null)
    setMessages([])
    setHasMessages(true) // User initiated chat — hide onboarding
  }

  const loadSession = async (id: string) => {
    setSessionId(id)
    setMessages([])
    const token = localStorage.getItem('bapx_token')
    const r = await fetch(`${API}/api/chat/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const d = await r.json()
    setMessages(d.messages || [])
    setHasMessages((d.messages || []).length > 0)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || streaming) return
    if (!hasApiKey) {
      // If no API key, navigate to settings
      navigate('/settings')
      return
    }
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setStreaming(true)
    setHasMessages(true)

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

  // Onboarding screen for users without API key
  const renderOnboarding = () => (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Welcome hero */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #9651b8, #7c3aed)' }}>
            <Bot size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome to bap<span style={{ color: '#9651b8' }}>X</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Your personal autonomous AI agent platform. Let's get you set up.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {/* Step 1: API Key */}
          <div className="card border border-surface-border/60 hover:border-[#9651b8]/30 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#9651b8]/10 border border-[#9651b8]/30">
                <Key size={14} className="text-[#9651b8]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-200">Configure Your API Key</h3>
                <p className="text-xs text-gray-500 mt-1">
                  bapX uses your own API key. Choose from OpenAI, Anthropic, Google, or OpenRouter.
                </p>
                <Link to="/settings"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                  style={{ background: '#9651b8' }}>
                  <Key size={14} />
                  Configure API Key
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Step 2: First Chat */}
          <div className={`card border border-surface-border/60 transition-all ${hasApiKey ? 'opacity-100' : 'opacity-40'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${hasApiKey ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-gray-800/50 border border-gray-700/30'}`}>
                {hasApiKey ? <CheckCircle size={14} className="text-emerald-400" /> : <Sparkles size={14} className="text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-200">Start Chatting</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {hasApiKey
                    ? 'Your API key is ready! Type a message below to start working with your agent.'
                    : 'Configure your API key above first, then come back here to start chatting.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick tips */}
        <div className="bg-white/[0.02] rounded-xl p-4 border border-surface-border/30">
          <p className="text-xs font-medium text-gray-400 mb-2">💡 Quick tips</p>
          <ul className="space-y-1.5">
            <li className="text-xs text-gray-500 flex gap-2">
              <span className="text-[#9651b8] shrink-0">•</span>
              Type your message and hit Send to talk to your agent
            </li>
            <li className="text-xs text-gray-500 flex gap-2">
              <span className="text-[#9651b8] shrink-0">•</span>
              Your chat sessions appear in the left sidebar
            </li>
            <li className="text-xs text-gray-500 flex gap-2">
              <span className="text-[#9651b8] shrink-0">•</span>
              Visit Settings to change your provider or model anytime
            </li>
          </ul>
        </div>
      </div>
    </div>
  )

  // API key missing banner
  const renderApiKeyBanner = () => (
    <div className="px-4 py-2.5 border-b border-surface-border" style={{ background: 'linear-gradient(90deg, rgba(150,81,184,0.08), rgba(124,58,237,0.04))' }}>
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <Key size={14} className="text-[#9651b8] shrink-0" />
        <p className="text-xs text-gray-300 flex-1">
          <span className="font-medium text-[#9651b8]">API key required.</span>{' '}
          Configure your provider key in Settings to start chatting with your agent.
        </p>
        <Link to="/settings"
          className="text-xs font-medium text-white px-3 py-1.5 rounded-md transition-all shrink-0"
          style={{ background: '#9651b8' }}>
          Configure
        </Link>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0a0a14' }}>
        <div className="text-gray-500 text-sm animate-pulse">Loading...</div>
      </div>
    )
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

        {/* API Key missing banner */}
        {!hasApiKey && !hasMessages && renderApiKeyBanner()}

        {/* Messages / Onboarding */}
        <div className="flex-1 overflow-y-auto">
          {!hasApiKey && !hasMessages && messages.length === 0 ? (
            renderOnboarding()
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="text-5xl font-extrabold tracking-tight mb-4" style={{ color: '#9651b8' }}>
                bap<span style={{ color: '#9651b8' }}>X</span>
              </div>
              <p className="text-gray-500 text-sm max-w-md">
                {hasApiKey
                  ? 'Your API key is ready. Start a conversation below.'
                  : 'Configure your API key in Settings to get started.'}
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
                placeholder={hasApiKey ? "Ask bapX anything..." : "Configure API key to start chatting..."}
                className="w-full rounded-xl border border-surface-border bg-surface-light pl-4 pr-12 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#9651b8] focus:ring-1 focus:ring-[#9651b8]/30 transition-all"
                disabled={streaming} />
                {input.length > 0 && (
                  <button type="submit" disabled={streaming}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white transition-colors"
                    style={{ background: hasApiKey ? '#9651b8' : '#4a4a5e' }}>
                    <Send size={14} />
                  </button>
                )}
            </div>
          </form>
          <p className="text-[10px] text-gray-600 text-center mt-2">
            {hasApiKey
              ? 'bapX uses your own API key. Messages are private to your account.'
              : 'Configure your API key in Settings to start using your agent.'}
          </p>
        </div>
      </div>
    </div>
  )
}
