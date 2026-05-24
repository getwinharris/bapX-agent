import { useState, useEffect, useRef, FormEvent, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  MessageSquare, Plus, Settings, LogOut, Send,
  Key, ArrowRight, Bot, Copy, Check, Menu, X,
  BookOpen, FolderOpen, Plug, Clock,
  Image, Globe, Video, FileText, Monitor, Terminal, Layout,
  Palette, Download, ToggleLeft, ToggleRight
} from 'lucide-react'

// ── Types ──
interface Session { id: string; title: string; created_at: string; updated_at: string }
interface ChatMessage { id?: number; role: string; content: string; tool_calls?: any }
interface Project { id: string; name: string; description: string; created_at: string }
interface MCP { id: string; name: string; enabled: boolean; description: string }
interface Skill { id: string; name: string; category: string; description: string; prompt: string; enabled: boolean }
interface LibraryItem { name: string; path: string; type: 'file' | 'dir'; size?: number; modified?: string }
interface Automation { id: string; name: string; schedule: string; enabled: boolean; last_run?: string }

type SidebarSection = 'chat' | 'projects' | 'mcps' | 'automation' | 'skills' | 'library' | 'settings'
type RightTab = 'canvas' | 'browser' | 'terminal' | 'files' | 'preview' | 'none'

const API = ''
const LIBRARY_CATEGORIES = [
  { id: 'images', icon: Image, label: 'Images', pattern: '*.{png,jpg,gif,webp,svg}' },
  { id: 'websites', icon: Globe, label: 'Websites', pattern: '*.{html,htm}' },
  { id: 'videos', icon: Video, label: 'Videos', pattern: '*.{mp4,webm,gif}' },
  { id: 'presentations', icon: FileText, label: 'Presentations', pattern: '*.{pptx,ppt}' },
  { id: 'documents', icon: FileText, label: 'Documents', pattern: '*.{md,txt,pdf,docx}' },
  { id: 'downloads', icon: Download, label: 'Downloads', pattern: '*' },
]

// ── Markdown Components ──
function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* noop */ }
  }
  if (!language) return (
    <pre className="relative group" style={{ background: '#1a1a2e', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: '#2a2a3e', color: '#9ca3af' }}>{copied ? <Check size={12} /> : <Copy size={12} />}</button>
      <code className="text-sm leading-relaxed block p-4 overflow-x-auto" style={{ color: '#e8e8f0' }}>{code}</code>
    </pre>
  )
  return (
    <div className="relative group" style={{ borderRadius: '0.5rem', overflow: 'hidden' }}>
      <div className="flex items-center justify-between px-4 py-1.5 text-xs font-medium" style={{ background: '#16162a', color: '#6b7280', borderBottom: '1px solid #2a2a3e' }}>
        <span>{language}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 p-1 rounded hover:bg-white/5 transition-colors">{copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}</button>
      </div>
      <SyntaxHighlighter style={oneDark} language={language} PreTag="div" customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem', fontSize: '0.8125rem', lineHeight: '1.5' }}>{code}</SyntaxHighlighter>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const components = useMemo(() => ({
    code({ className, children, inline }: any) { return inline ? <code className="text-sm px-1.5 py-0.5 rounded" style={{ background: '#2a2a3e', color: '#e8e8f0' }}>{children}</code> : <CodeBlock className={className}>{children}</CodeBlock> },
    p({ children }: any) { return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p> },
    ul({ children }: any) { return <ul className="list-disc pl-5 mb-3 space-y-1 last:mb-0">{children}</ul> },
    ol({ children }: any) { return <ol className="list-decimal pl-5 mb-3 space-y-1 last:mb-0">{children}</ol> },
    h1({ children }: any) { return <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1> },
    h2({ children }: any) { return <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2> },
    blockquote({ children }: any) { return <blockquote className="border-l-4 border-[#9651b8] pl-4 italic mb-3 last:mb-0" style={{ color: '#9ca3af' }}>{children}</blockquote> },
    a({ href, children }: any) { return <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#9651b8] transition-colors">{children}</a> },
  }), [])
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>
}

// ── Sidebar Item Component ──
function SidebarLink({ icon: Icon, label, active, onClick, className }: any) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
        active ? 'bg-[#9651b8]/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      } ${className || ''}`}>
      <Icon size={14} />
      {label}
    </button>
  )
}

// ── Dashboard ──
export default function Dashboard() {
  const navigate = useNavigate()

  // Core state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('chat')
  const [rightTab, setRightTab] = useState<RightTab>('none')
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState(() => localStorage.getItem('mobileSidebarExpanded') === 'true')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Projects
  const [projects, setProjects] = useState<Project[]>([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')

  // MCPs
  const [mcps, setMcps] = useState<MCP[]>([
    { id: '1', name: 'GitHub', enabled: true, description: 'Repository management, PRs, issues' },
    { id: '2', name: 'Filesystem', enabled: true, description: 'Read/write files in sandbox' },
    { id: '3', name: 'Web Search', enabled: false, description: 'Web research and browsing' },
    { id: '4', name: 'Database', enabled: false, description: 'SQLite/PostgreSQL operations' },
  ])

  // Skills — user's own skills
  const [userSkills, setUserSkills] = useState<Skill[]>([])
  const [enabledSkills, setEnabledSkills] = useState<string[]>([])
  const [loadingSkills, setLoadingSkills] = useState(false)
  const [showNewSkill, setShowNewSkill] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillDesc, setNewSkillDesc] = useState('')
  const [newSkillPrompt, setNewSkillPrompt] = useState('')

  // Automation
  const [automations, setAutomations] = useState<Automation[]>([])
  const [showNewAuto, setShowNewAuto] = useState(false)
  const [newAutoName, setNewAutoName] = useState('')
  const [newAutoSchedule, setNewAutoSchedule] = useState('')

  // Library
  const [libraryCategory, setLibraryCategory] = useState('images')
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])

  // ── Load data ──
  const loadProfile = async () => {
    try {
      const u = await api.user.profile()
      setHasApiKey(!!u.api_key)
      return u
    } catch {
      localStorage.removeItem('bapx_token')
      navigate('/login')
      return null
    }
  }

  const getSessionsData = async () => {
    const token = localStorage.getItem('bapx_token')
    if (!token) return []
    const r = await fetch(`${API}/api/user/sessions`, { headers: { Authorization: `Bearer ${token}` } })
    const d = await r.json()
    return d.sessions || []
  }

  const loadSessions = async () => {
    try {
      const data = await getSessionsData()
      setSessions(data)
    } catch { /* noop */ }
  }

  const fetchSkillsData = async () => {
    const [lib, prof] = await Promise.all([api.user.getSkillsLibrary(), api.user.profile()])
    const allSkills = lib.skills || []
    return { skills: allSkills, enabled: prof.skills_enabled || [] }
  }

  const fetchLibraryData = async (category: string) => {
    const pat = LIBRARY_CATEGORIES.find(c => c.id === category)?.pattern || '*'
    const token = localStorage.getItem('bapx_token')
    const r = await fetch(`${API}/api/library/list?pattern=${encodeURIComponent(pat)}`, { headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) { const d = await r.json(); return d.items || [] }
    return []
  }

  const loadSkills = async () => {
    setLoadingSkills(true)
    try {
      const data = await fetchSkillsData()
      setUserSkills(data.skills)
      setEnabledSkills(data.enabled)
    } catch { /* noop */ }
    setLoadingSkills(false)
  }

  const createSkill = async () => {
    if (!newSkillName || !newSkillPrompt) return
    try {
      await api.user.createSkill(newSkillName, newSkillDesc, newSkillPrompt)
      setShowNewSkill(false)
      setNewSkillName('')
      setNewSkillDesc('')
      setNewSkillPrompt('')
      loadSkills()
    } catch { /* noop */ }
  }

  useEffect(() => {
    const init = async () => {
      const u = await loadProfile()
      if (u) setIsLoading(false)
    }
    init()
    getSessionsData().then(data => setSessions(data)).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (sidebarSection === 'skills' && userSkills.length === 0) { fetchSkillsData().then(data => { setUserSkills(data.skills); setEnabledSkills(data.enabled) }).catch(() => {}) } }, [sidebarSection, userSkills.length])
  useEffect(() => { if (sidebarSection === 'library') { fetchLibraryData(libraryCategory).then(items => setLibraryItems(items)).catch(() => {}) } }, [sidebarSection, libraryCategory])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { localStorage.setItem('mobileSidebarExpanded', String(mobileSidebarExpanded)) }, [mobileSidebarExpanded])

  // ── Chat ──
  const newChat = () => { setSessionId(null); setMessages([]) }

  const loadSession = async (id: string) => {
    setSessionId(id); setMessages([])
    const token = localStorage.getItem('bapx_token')
    const r = await fetch(`${API}/api/chat/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const d = await r.json()
    setMessages(d.messages || [])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || streaming) return
    if (!hasApiKey) { navigate('/settings'); return }
    const msg = input.trim(); setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setStreaming(true)

    const token = localStorage.getItem('bapx_token')
    const res = await fetch(`${API}/api/chat/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: msg, sessionId }),
    })
    if (!res.ok) { const err = (await res.json()).error; setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${err}` }]); setStreaming(false); return }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let content = '', buffer = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.text) { content += data.text; setMessages(prev => { const c = [...prev]; if (c[c.length-1]?.role === 'assistant') c[c.length-1].content = content; return c }) }
          if (data.done) { setSessionId(data.sessionId); loadSessions() }
          if (data.error) setMessages(prev => { const c = [...prev]; if (c[c.length-1]?.role === 'assistant') c[c.length-1].content = `❌ ${data.error}`; return c })
        } catch { /* skip */ }
      }
    }
    setStreaming(false)
  }

  const toggleSkill = async (name: string) => {
    const updated = enabledSkills.includes(name) ? enabledSkills.filter(s => s !== name) : [...enabledSkills, name]
    setEnabledSkills(updated)
    try { await api.user.saveSkills(updated) } catch { /* noop */ }
  }

  const toggleMCP = (id: string) => setMcps(mcps.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m))

  const logout = () => { localStorage.removeItem('bapx_token'); navigate('/login') }

  const sidebarItems = [
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
    { id: 'projects' as const, icon: FolderOpen, label: 'Projects' },
    { id: 'mcps' as const, icon: Plug, label: 'MCPs' },
    { id: 'automation' as const, icon: Clock, label: 'Automation' },
    { id: 'skills' as const, icon: BookOpen, label: 'Skills' },
    { id: 'library' as const, icon: Image, label: 'Library' },
  ]

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#0a0a14' }}>
      <div className="text-gray-500 text-sm animate-pulse">Loading...</div>
    </div>
  )

  return (
    <div className="h-screen flex" style={{ background: '#0a0a14' }}>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col border-r border-surface-border w-64 shrink-0 transition-all duration-200" style={{ background: '#0d0d1a' }}>
        {/* Logo */}
        <div className="p-3 border-b border-surface-border flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight text-white">bap<span style={{ color: '#9651b8' }}>X</span></span>
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto p-2">
          {sidebarSection === 'chat' && (
            <>
              <button onClick={newChat} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 border border-surface-border transition-colors mb-3">
                <Plus size={14} /> New Chat
              </button>
              <div className="text-[10px] uppercase tracking-wider text-gray-600 px-3 py-1 font-medium">Chat History</div>
              {sessions.map(s => (
                <button key={s.id} onClick={() => loadSession(s.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${sessionId === s.id ? 'bg-[#9651b8]/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="truncate">{s.title}</span>
                </button>
              ))}
            </>
          )}

          {sidebarSection === 'projects' && (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-[10px] uppercase tracking-wider text-gray-600 font-medium">Projects</div>
                <button onClick={() => setShowNewProject(true)} className="text-gray-500 hover:text-white p-1"><Plus size={12} /></button>
              </div>
              {showNewProject && (
                <div className="mb-3 p-2 rounded-lg border border-surface-border space-y-2">
                  <input type="text" placeholder="Project name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="w-full px-2 py-1.5 rounded text-xs bg-surface-light border border-surface-border text-gray-300 placeholder-gray-500 outline-none focus:border-[#9651b8]" />
                  <input type="text" placeholder="Description" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} className="w-full px-2 py-1.5 rounded text-xs bg-surface-light border border-surface-border text-gray-300 placeholder-gray-500 outline-none focus:border-[#9651b8]" />
                  <div className="flex gap-1">
                    <button onClick={() => { if (newProjectName) { setProjects([...projects, { id: Date.now().toString(), name: newProjectName, description: newProjectDesc, created_at: new Date().toISOString() }]); setShowNewProject(false); setNewProjectName(''); setNewProjectDesc('') } }} className="btn btn-primary text-[10px] px-2 py-1 flex-1 justify-center">Create</button>
                    <button onClick={() => setShowNewProject(false)} className="btn border border-surface-border text-[10px] px-2 py-1 text-gray-400 flex-1 justify-center">Cancel</button>
                  </div>
                </div>
              )}
              {projects.map(p => (
                <button key={p.id} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors">
                  <FolderOpen size={14} className="shrink-0" />
                  <div className="truncate"><div className="truncate text-xs">{p.name}</div><div className="text-[10px] text-gray-600 truncate">{p.description}</div></div>
                </button>
              ))}
              {projects.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No projects yet.</p>}
            </>
          )}

          {sidebarSection === 'mcps' && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-gray-600 px-1 py-1 font-medium">MCP Servers</div>
              {mcps.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                  <Plug size={14} className={`shrink-0 ${m.enabled ? 'text-emerald-400' : 'text-gray-600'}`} />
                  <div className="flex-1 min-w-0"><div className="text-xs text-gray-300 truncate">{m.name}</div><div className="text-[10px] text-gray-600 truncate">{m.description}</div></div>
                  <button onClick={() => toggleMCP(m.id)} className="text-gray-500 hover:text-white p-0.5">
                    {m.enabled ? <ToggleRight size={14} className="text-emerald-400" /> : <ToggleLeft size={14} />}
                  </button>
                </div>
              ))}
              <div className="mt-3 px-3 py-2 rounded-lg border border-dashed border-surface-border">
                <p className="text-[10px] text-gray-600 text-center">Install MCPs from marketplace</p>
                <div className="flex mt-1 gap-1">
                  <input type="text" placeholder="npm/pip/gh URL..." className="flex-1 px-2 py-1 rounded text-[10px] bg-surface-light border border-surface-border text-gray-300 placeholder-gray-500 outline-none" />
                  <button className="btn btn-primary text-[10px] px-2 py-1">Install</button>
                </div>
              </div>
            </>
          )}

          {sidebarSection === 'automation' && (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-[10px] uppercase tracking-wider text-gray-600 font-medium">Automation</div>
                <button onClick={() => setShowNewAuto(true)} className="text-gray-500 hover:text-white p-1"><Plus size={12} /></button>
              </div>
              {showNewAuto && (
                <div className="mb-3 p-2 rounded-lg border border-surface-border space-y-2">
                  <input type="text" placeholder="Task name" value={newAutoName} onChange={e => setNewAutoName(e.target.value)} className="w-full px-2 py-1.5 rounded text-xs bg-surface-light border border-surface-border text-gray-300 placeholder-gray-500 outline-none focus:border-[#9651b8]" />
                  <input type="text" placeholder="Schedule (every 1h, 0 9 * * *)" value={newAutoSchedule} onChange={e => setNewAutoSchedule(e.target.value)} className="w-full px-2 py-1.5 rounded text-xs bg-surface-light border border-surface-border text-gray-300 placeholder-gray-500 outline-none focus:border-[#9651b8]" />
                  <div className="flex gap-1">
                    <button onClick={() => { if (newAutoName) { setAutomations([...automations, { id: Date.now().toString(), name: newAutoName, schedule: newAutoSchedule, enabled: true }]); setShowNewAuto(false); setNewAutoName(''); setNewAutoSchedule('') } }} className="btn btn-primary text-[10px] px-2 py-1 flex-1 justify-center">Create</button>
                    <button onClick={() => setShowNewAuto(false)} className="btn border border-surface-border text-[10px] px-2 py-1 text-gray-400 flex-1 justify-center">Cancel</button>
                  </div>
                </div>
              )}
              {automations.map(a => (
                <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                  <Clock size={14} className={`shrink-0 ${a.enabled ? 'text-amber-400' : 'text-gray-600'}`} />
                  <div className="flex-1 min-w-0"><div className="text-xs text-gray-300 truncate">{a.name}</div><div className="text-[10px] text-gray-600">{a.schedule}</div></div>
                </div>
              ))}
              {automations.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No scheduled tasks yet.</p>}
            </>
          )}

          {sidebarSection === 'skills' && (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-[10px] uppercase tracking-wider text-gray-600 font-medium">My Skills</div>
                <button onClick={() => setShowNewSkill(true)} className="text-gray-500 hover:text-white p-1"><Plus size={12} /></button>
              </div>
              {showNewSkill && (
                <div className="mb-3 p-2 rounded-lg border border-surface-border space-y-2">
                  <input type="text" placeholder="Skill name" value={newSkillName} onChange={e => setNewSkillName(e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-xs bg-surface-light border border-surface-border text-gray-300 placeholder-gray-500 outline-none focus:border-[#9651b8]" />
                  <input type="text" placeholder="Description" value={newSkillDesc} onChange={e => setNewSkillDesc(e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-xs bg-surface-light border border-surface-border text-gray-300 placeholder-gray-500 outline-none focus:border-[#9651b8]" />
                  <textarea placeholder="Instructions for the agent..." value={newSkillPrompt} onChange={e => setNewSkillPrompt(e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-xs bg-surface-light border border-surface-border text-gray-300 placeholder-gray-500 outline-none focus:border-[#9651b8] resize-none" rows={4} />
                  <div className="flex gap-1">
                    <button onClick={createSkill} disabled={!newSkillName || !newSkillPrompt}
                      className="btn btn-primary text-[10px] px-2 py-1 flex-1 justify-center">Create</button>
                    <button onClick={() => setShowNewSkill(false)}
                      className="btn border border-surface-border text-[10px] px-2 py-1 text-gray-400 flex-1 justify-center">Cancel</button>
                  </div>
                </div>
              )}
              {loadingSkills ? <p className="text-xs text-gray-500 text-center py-4">Loading...</p> : userSkills.map(s => (
                <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.enabled ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  <div className="flex-1 min-w-0" onClick={() => toggleSkill(s.name)}>
                    <div className="text-xs text-gray-300 truncate">{s.name}</div>
                    <div className="text-[10px] text-gray-600 truncate">{s.description || 'No description'}</div>
                  </div>
                </div>
              ))}
              {!loadingSkills && userSkills.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No skills yet. Click + to create one.</p>}
            </>
          )}

          {sidebarSection === 'library' && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-gray-600 px-1 py-1 font-medium">Library</div>
              <div className="space-y-0.5 mb-3">
                {LIBRARY_CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  return (
                    <button key={cat.id} onClick={() => setLibraryCategory(cat.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${libraryCategory === cat.id ? 'bg-[#9651b8]/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                      <Icon size={14} className="shrink-0" />
                      <span className="capitalize">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="border-t border-surface-border pt-2 space-y-1">
                {libraryItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-gray-400 hover:bg-white/5 cursor-pointer">
                    {item.type === 'dir' ? <FolderOpen size={12} /> : <FileText size={12} />}
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
                {libraryItems.length === 0 && <p className="text-[10px] text-gray-600 text-center py-2">No files yet</p>}
              </div>
            </>
          )}
        </div>

        {/* Sidebar bottom nav */}
        <div className="p-2 border-t border-surface-border space-y-0.5">
          {sidebarItems.map(item => {
            const Icon = item.icon
            return (
              <SidebarLink key={item.id} icon={Icon} label={item.label}
                active={sidebarSection === item.id}
                onClick={() => setSidebarSection(item.id)} />
            )
          })}
          <Link to="/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors">
            <Settings size={14} /> Settings
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-950/20 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MOBILE SIDEBAR RAIL — always visible on mobile, expands on tap ── */}
      <div className={`md:hidden fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-200 ${mobileSidebarExpanded ? 'w-72' : 'w-12'}`} style={{ background: '#0d0d1a', borderRight: '1px solid var(--surface-border, #1e1e2e)' }}>
        {/* Expanded header */}
        <div className={`p-3 border-b border-surface-border flex items-center justify-between ${mobileSidebarExpanded ? '' : 'hidden'}`}>
          <span className="text-lg font-extrabold tracking-tight text-white">bap<span style={{ color: '#9651b8' }}>X</span></span>
          <button onClick={() => setMobileSidebarExpanded(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
        {/* Collapsed header — just logo initial */}
        <div className={`p-2 border-b border-surface-border flex items-center justify-center ${mobileSidebarExpanded ? 'hidden' : ''}`}>
          <span className="text-sm font-extrabold tracking-tight" style={{ color: '#9651b8' }}>b</span>
        </div>
        {/* Rail icons — always visible */}
        <div className="flex-1 overflow-y-auto py-1">
          {sidebarItems.map(item => {
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => { setSidebarSection(item.id); if (!mobileSidebarExpanded) setMobileSidebarExpanded(true) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${mobileSidebarExpanded ? 'rounded-lg text-sm' : 'justify-center'} ${
                  sidebarSection === item.id ? 'bg-[#9651b8]/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}>
                <Icon size={14} className="shrink-0" />
                {mobileSidebarExpanded && <span>{item.label}</span>}
              </button>
            )
          })}
        </div>
        {/* Bottom actions */}
        <div className="border-t border-surface-border py-1">
          <Link to="/settings" onClick={() => setMobileSidebarExpanded(false)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${mobileSidebarExpanded ? 'rounded-lg text-sm' : 'justify-center'} text-gray-400 hover:text-gray-200 hover:bg-white/5`}>
            <Settings size={14} className="shrink-0" />
            {mobileSidebarExpanded && <span>Settings</span>}
          </Link>
          <button onClick={() => { logout(); setMobileSidebarExpanded(false) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${mobileSidebarExpanded ? 'rounded-lg text-sm' : 'justify-center'} text-gray-400 hover:text-red-400 hover:bg-red-950/20`}>
            <LogOut size={14} className="shrink-0" />
            {mobileSidebarExpanded && <span>Sign Out</span>}
          </button>
        </div>
      </div>
      {/* Backdrop when expanded */}
      {mobileSidebarExpanded && (
        <div className="fixed inset-0 z-30 md:hidden bg-black/60" onClick={() => setMobileSidebarExpanded(false)} />
      )}

      {/* ── CENTER PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-0 ml-12">
        {/* Top bar */}
        <header className="flex items-center gap-2 px-3 h-11 border-b border-surface-border shrink-0">
          <button onClick={() => setMobileSidebarExpanded(true)} className="text-gray-400 hover:text-white p-1 md:hidden"><Menu size={16} /></button>
          <span className="text-xs font-semibold text-gray-300">
            {sidebarSection === 'chat' && (sessionId ? 'Chat' : 'New Chat')}
            {sidebarSection === 'projects' && 'Projects'}
            {sidebarSection === 'mcps' && 'MCP Servers'}
              {sidebarSection === 'automation' && 'Automation'}
            {sidebarSection === 'skills' && 'My Skills'}
            {sidebarSection === 'library' && 'Library'}
          </span>
          <div className="flex-1" />
          {rightTab !== 'none' ? (
            <button onClick={() => setRightTab('none')} className="text-gray-500 hover:text-white p-1 hidden sm:block"><X size={14} /></button>
          ) : (
            <button onClick={() => setRightTab('canvas')} className="text-gray-500 hover:text-white text-xs hidden sm:block">Workspace ▸</button>
          )}
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {!hasApiKey && sidebarSection === 'chat' && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8">
              <div className="max-w-md w-full space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #9651b8, #7c3aed)' }}><Bot size={32} className="text-white" /></div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Welcome to bap<span style={{ color: '#9651b8' }}>X</span></h1>
                  <p className="text-gray-400 text-sm">Your personal AI agent. Configure your provider to get started.</p>
                </div>
                <div className="space-y-2">
                  <Link to="/settings" className="card border border-surface-border/60 hover:border-[#9651b8]/30 transition-all block">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: '#9651b8/10', border: '1px solid #9651b8/30' }}><Key size={14} className="text-[#9651b8]" /></div>
                      <div className="flex-1"><h3 className="text-sm font-semibold text-gray-200">Connect AI Provider</h3><p className="text-xs text-gray-500 mt-0.5">API key, OAuth, or custom endpoint</p></div>
                      <ArrowRight size={14} className="text-gray-500" />
                    </div>
                  </Link>
                  <div className="bg-white/[0.02] rounded-xl p-3 border border-surface-border/30">
                    <p className="text-[10px] font-medium text-gray-400 mb-1.5">💡 bapX can</p>
                    <div className="flex flex-wrap gap-1">
                      {['Research', 'Code', 'Design', 'Write', 'Analyze', 'Automate'].map(t => <span key={t} className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: '#9651b8/10', color: '#9651b8' }}>{t}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : messages.length === 0 && sidebarSection === 'chat' ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-8">
              <div className="text-4xl font-extrabold tracking-tight mb-3" style={{ color: '#9651b8' }}>bap<span style={{ color: '#9651b8' }}>X</span></div>
              <p className="text-gray-500 text-sm">Your agent is ready. Start a conversation.</p>
            </div>
          ) : sidebarSection === 'chat' ? (
            <div className="max-w-3xl mx-auto py-5 px-3 space-y-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role !== 'user' && <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#9651b8' }}><span className="text-[9px] font-bold text-white">bX</span></div>}
                  <div className={`max-w-[88%] sm:max-w-[75%] ${m.role === 'user' ? 'order-1' : ''}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-br-md' : ''}`}
                      style={m.role === 'user' ? { background: '#9651b8', color: '#fff' } : { background: '#12121e', border: '1px solid #2a2a3e' }}>
                      {m.role === 'user' ? m.content : i === messages.length - 1 && streaming ? (
                        m.content ? <MarkdownContent content={m.content} /> : <span className="typing-indicator inline-flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /></span>
                      ) : <MarkdownContent content={m.content} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div className="max-w-sm">
                <p className="text-gray-500 text-sm">{sidebarSection === 'projects' ? 'Select or create a project' : sidebarSection === 'mcps' ? 'Manage MCP connections' : sidebarSection === 'automation' ? 'Schedule recurring tasks' : sidebarSection === 'skills' ? 'Enable skills for your agent' : 'Browse your files'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-surface-border p-3">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
            <div className="flex-1 relative">
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder={hasApiKey ? "Ask bapX anything..." : "Configure provider to start chatting..."}
                className="w-full rounded-xl border border-surface-border bg-surface-light pl-4 pr-12 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#9651b8] focus:ring-1 focus:ring-[#9651b8]/30 transition-all"
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
          <p className="text-[10px] text-gray-600 text-center mt-1.5">Your API key. Your sandbox. Your data.</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <aside className="hidden lg:flex flex-col border-l border-surface-border w-80" style={{ background: '#0d0d1a' }}>
        <RightPanelContent rightTab={rightTab} setRightTab={setRightTab} />
      </aside>
    </div>
  )
}

// ── Right Panel Component ──
function RightPanelContent({ rightTab, setRightTab }: { rightTab: RightTab; setRightTab: (tab: RightTab) => void }) {
  if (rightTab === 'none') return (
    <div className="h-full flex flex-col items-center justify-center text-center p-4">
      <Layout size={24} className="text-gray-600 mb-2" />
      <p className="text-xs text-gray-600">Right panel shows context-dependent tools</p>
      <p className="text-[10px] text-gray-700 mt-1">Canvas | Browser | Terminal | Files</p>
    </div>
  )
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-surface-border bg-surface-light/50 overflow-x-auto">
        {(['canvas', 'browser', 'terminal', 'files', 'preview'] as RightTab[]).filter(t => t !== 'none').map(tab => (
          <button key={tab} onClick={() => setRightTab(tab)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${rightTab === tab ? 'bg-[#9651b8]/20 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            {tab === 'canvas' && <Palette size={10} />}
            {tab === 'browser' && <Globe size={10} />}
            {tab === 'terminal' && <Terminal size={10} />}
            {tab === 'files' && <FolderOpen size={10} />}
            {tab === 'preview' && <Monitor size={10} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 p-3 overflow-y-auto">
        {rightTab === 'terminal' && (
          <div className="font-mono text-xs text-gray-400" style={{ background: '#0a0a14', borderRadius: '0.5rem', padding: '1rem', minHeight: '200px' }}>
            <p className="text-green-400 mb-2">$ Ready</p>
            <p className="text-gray-600">Terminal connects to your sandbox</p>
          </div>
        )}
        {rightTab === 'canvas' && <div className="text-xs text-gray-500 text-center py-8">Canvas — visual workspace</div>}
        {rightTab === 'browser' && <div className="text-xs text-gray-500 text-center py-8">Browser — agent browsing session</div>}
        {rightTab === 'files' && <div className="text-xs text-gray-500 text-center py-8">Files — project file explorer</div>}
        {rightTab === 'preview' && <div className="text-xs text-gray-500 text-center py-8">Preview — live content preview</div>}
      </div>
    </div>
  )
}
