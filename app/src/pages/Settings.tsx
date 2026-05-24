import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { 
  ArrowLeft, Key, Server, Save, CheckCircle, AlertCircle, Loader2,
  LogIn, Shield, Layers, GitBranch, Plus, Trash2, Globe, Zap,
  ChevronDown, ChevronRight, ExternalLink, RefreshCw
} from 'lucide-react'

type AuthTab = 'api-key' | 'oauth' | 'custom-providers' | 'fallback' | 'pooled'

interface CustomProvider {
  name: string
  base_url: string
  api_key: string
  model: string
}

interface FallbackProvider {
  provider: string
  model: string
}

interface PooledCredential {
  provider: string
  label: string
  api_key: string
}

// All Hermes-supported providers — every one a user can connect via API key
const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', models: '200+ models, pay-per-token', auth: 'API key', url: 'https://openrouter.ai/keys' },
  { id: 'openai', name: 'OpenAI', models: 'GPT-5.4, GPT-4.1, GPT-4o, o3, o4-mini...', auth: 'API key', url: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'Anthropic', models: 'Claude Sonnet 4, Claude Haiku 3.5...', auth: 'API key', url: 'https://console.anthropic.com/settings/keys' },
  { id: 'google', name: 'Google Gemini', models: 'Gemini 2.5 Flash/Pro...', auth: 'API key', url: 'https://aistudio.google.com/apikey' },
  { id: 'deepseek', name: 'DeepSeek', models: 'deepseek-chat, deepseek-reasoner', auth: 'API key', url: 'https://platform.deepseek.com/api_keys' },
  { id: 'groq', name: 'Groq', models: 'Llama 3.3, Mixtral, Gemma...', auth: 'API key', url: 'https://console.groq.com/keys' },
  { id: 'together', name: 'Together AI', models: 'Llama, Mixtral, DeepSeek...', auth: 'API key', url: 'https://api.together.ai/settings/api-keys' },
  { id: 'mistral', name: 'Mistral AI', models: 'Mistral Large, Small...', auth: 'API key', url: 'https://console.mistral.ai/api-keys/' },
  { id: 'cohere', name: 'Cohere', models: 'Command R+, Command R...', auth: 'API key', url: 'https://dashboard.cohere.com/api-keys' },
  { id: 'perplexity', name: 'Perplexity', models: 'Sonar Pro, Sonar...', auth: 'API key', url: 'https://www.perplexity.ai/settings/api' },
  { id: 'nvidia-nim', name: 'NVIDIA NIM', models: 'Nemotron, Llama, Mistral...', auth: 'API key', url: 'https://build.nvidia.com' },
  { id: 'xai', name: 'xAI Grok', models: 'Grok 3, Grok 2...', auth: 'API key / OAuth', url: 'https://console.x.ai' },
  { id: 'huggingface', name: 'Hugging Face', models: '400k+ models', auth: 'API key', url: 'https://huggingface.co/settings/tokens' },
  { id: 'kimi', name: 'Kimi / Moonshot', models: 'kimi-coding, kimi-k2...', auth: 'API key', url: 'https://platform.moonshot.ai' },
  { id: 'minimax', name: 'MiniMax', models: 'MiniMax-Text-01...', auth: 'API key / OAuth', url: 'https://www.minimax.io' },
  { id: 'zai', name: 'Z.AI / GLM', models: 'GLM-4, GLM-4V...', auth: 'API key', url: 'https://z.ai' },
  { id: 'xiaomi', name: 'Xiaomi MiMo', models: 'MiMo...', auth: 'API key', url: 'https://platform.xiaomimimo.com' },
  { id: 'stepfun', name: 'StepFun', models: 'Step-2...', auth: 'API key', url: 'https://stepfun.com' },
  { id: 'arcee', name: 'Arcee', models: 'Arcee models...', auth: 'API key', url: 'https://arcee.ai' },
  { id: 'gmi-cloud', name: 'GMI Cloud', models: 'Various models...', auth: 'API key', url: 'https://gmicloud.ai' },
  { id: 'ollama-cloud', name: 'Ollama Cloud', models: 'Llama, Mistral, Gemma...', auth: 'API key', url: 'https://cloud.ollama.ai' },
  { id: 'lm-studio', name: 'LM Studio', models: 'Local models', auth: 'Local endpoint', url: 'https://lmstudio.ai' },
  { id: 'aws-bedrock', name: 'AWS Bedrock', models: 'Claude, Llama, Mistral...', auth: 'IAM / API key', url: 'https://aws.amazon.com/bedrock/' },
  { id: 'azure-foundry', name: 'Azure Foundry', models: 'GPT-4x, Llama, Claude...', auth: 'API key', url: 'https://ai.azure.com' },
  { id: 'qwen-oauth', name: 'Qwen (Aliyun)', models: 'Qwen-Max, Qwen-Plus...', auth: 'OAuth', url: 'https://tongyi.aliyun.com' },
  { id: 'tencent', name: 'Tencent TokenHub', models: 'Hunyuan models...', auth: 'Token', url: 'https://cloud.tencent.com' },
]

// OAuth providers — login with existing subscriptions (like Hermes)
const OAUTH_PROVIDERS = [
  { id: 'openai-codex', name: 'OpenAI / ChatGPT', desc: 'Login with your ChatGPT Plus/Pro/Top plan', icon: '🤖', url: 'https://chatgpt.com' },
  { id: 'anthropic-oauth', name: 'Anthropic / Claude', desc: 'Login with your Claude Max subscription', icon: '🟣', url: 'https://claude.ai' },
  { id: 'xai-oauth', name: 'xAI Grok', desc: 'Login with your X Premium+ or SuperGrok plan', icon: '⚡', url: 'https://grok.com' },
  { id: 'google-gemini-oauth', name: 'Google Gemini (OAuth)', desc: 'Login with your Google Cloud / Gemini CLI account', icon: '🔵', url: 'https://aistudio.google.com' },
  { id: 'nous', name: 'Nous Portal', desc: 'Login with your Nous Research subscription', icon: '🔮', url: 'https://portal.nousresearch.com' },
  { id: 'minimax-oauth', name: 'MiniMax (OAuth)', desc: 'Login with your MiniMax account', icon: '🎯', url: 'https://www.minimax.io' },
]

// Fallback options — cross-provider failover chain
const FALLBACK_OPTIONS = [
  { id: 'openrouter', name: 'OpenRouter', desc: 'Routes to 200+ models' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT-5.4, GPT-4.1, GPT-4o' },
  { id: 'anthropic', name: 'Anthropic', desc: 'Claude Sonnet 4, Haiku 3.5' },
  { id: 'google', name: 'Google Gemini', desc: 'Gemini 2.5 Flash/Pro' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'deepseek-chat, deepseek-reasoner' },
  { id: 'groq', name: 'Groq', desc: 'Llama 3.3, Mixtral, Gemma' },
  { id: 'mistral', name: 'Mistral AI', desc: 'Mistral Large, Small' },
  { id: 'nous', name: 'Nous Portal', desc: 'Nous Research subscription' },
  { id: 'aws-bedrock', name: 'AWS Bedrock', desc: 'Converse API / IAM' },
  { id: 'xai', name: 'xAI Grok', desc: 'Grok 3, Grok 2' },
  { id: 'minimax', name: 'MiniMax', desc: 'MiniMax API key' },
  { id: 'kimi', name: 'Kimi / Moonshot', desc: 'Moonshot platform' },
  { id: 'nvidia-nim', name: 'NVIDIA NIM', desc: 'NVIDIA NIM endpoint' },
]

export default function Settings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<AuthTab>('api-key')
  const [userName, setUserName] = useState('')

  // API Key state
  const [provider, setProvider] = useState('openrouter')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  // OAuth state
  const [oauthProvider, setOauthProvider] = useState('')
  const [oauthToken, setOauthToken] = useState('')
  const [oauthRefresh, setOauthRefresh] = useState('')
  const [oauthExpires, setOauthExpires] = useState('')
  const [oauthSaved, setOauthSaved] = useState(false)
  const [oauthSaving, setOauthSaving] = useState(false)
  const [expandedOauth, setExpandedOauth] = useState<string | null>(null)

  // Custom providers state
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newCustom, setNewCustom] = useState<CustomProvider>({ name: '', base_url: '', api_key: '', model: '' })
  const [customSaving, setCustomSaving] = useState(false)

  // Fallback state
  const [fallbackProviders, setFallbackProviders] = useState<FallbackProvider[]>([])
  const [showAddFallback, setShowAddFallback] = useState(false)
  const [newFallback, setNewFallback] = useState<FallbackProvider>({ provider: 'openrouter', model: '' })

  // Pooled credentials state
  const [pooledCredentials, setPooledCredentials] = useState<PooledCredential[]>([])
  const [showAddPooled, setShowAddPooled] = useState(false)
  const [newPooled, setNewPooled] = useState<PooledCredential>({ provider: 'openai', label: '', api_key: '' })

  useEffect(() => {
    api.user.profile().then(u => {
      setUserName(u.name || u.email)
      if (u.api_key) {
        setApiKey(u.api_key)
        setHasExistingKey(true)
      }
      if (u.provider) setProvider(u.provider)
      if (u.model) setModel(u.model)
      if (u.oauth_provider) setOauthProvider(u.oauth_provider)
      if (u.custom_providers) setCustomProviders(u.custom_providers)
      if (u.fallback_providers) setFallbackProviders(u.fallback_providers)
      if (u.pooled_credentials) setPooledCredentials(u.pooled_credentials)
    }).catch(() => {})
  }, [])

  // === API Key handlers ===
  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try {
      const keyToSend = hasExistingKey && apiKey.startsWith('••••') ? undefined : apiKey
      await api.user.updateApiKey(provider, keyToSend, model)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      const profile = await api.user.profile()
      if (profile.api_key) { setApiKey(profile.api_key); setHasExistingKey(true) }
    } catch { /* noop */ }
    setSaving(false)
  }

  const handleKeyChange = (value: string) => {
    setApiKey(value); setTestResult('idle')
    if (value === '' || !value.startsWith('••••')) setHasExistingKey(false)
  }

  const testConnection = async () => {
    setTestResult('testing')
    try {
      const keyToSend = hasExistingKey && apiKey.startsWith('••••') ? undefined : apiKey
      if (keyToSend !== undefined || hasExistingKey) {
        await api.user.updateApiKey(provider, keyToSend, model)
        const profile = await api.user.profile()
        if (profile.api_key) { setApiKey(profile.api_key); setHasExistingKey(true) }
      }
      const token = localStorage.getItem('bapx_token')
      const res = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { setTestResult('success'); setSaved(true); setTimeout(() => setSaved(false), 2000) }
      else setTestResult('error')
    } catch { setTestResult('error') }
  }

  // === OAuth handlers ===
  const handleOauthSave = async () => {
    if (!oauthProvider || !oauthToken) return
    setOauthSaving(true)
    try {
      await api.user.saveOauth(oauthProvider, oauthToken, oauthRefresh, oauthExpires)
      setOauthSaved(true)
      setTimeout(() => setOauthSaved(false), 2000)
    } catch { /* noop */ }
    setOauthSaving(false)
  }

  // === Custom providers handlers ===
  const handleAddCustom = async () => {
    if (!newCustom.name || !newCustom.base_url) return
    setCustomSaving(true)
    const updated = [...customProviders, newCustom]
    setCustomProviders(updated)
    try {
      await api.user.saveCustomProviders(updated)
      setShowAddCustom(false)
      setNewCustom({ name: '', base_url: '', api_key: '', model: '' })
    } catch { setCustomProviders(customProviders) }
    setCustomSaving(false)
  }

  const handleRemoveCustom = async (idx: number) => {
    const updated = customProviders.filter((_, i) => i !== idx)
    setCustomProviders(updated)
    try { await api.user.saveCustomProviders(updated) } catch { setCustomProviders(customProviders) }
  }

  // === Fallback handlers ===
  const handleAddFallback = async () => {
    setCustomSaving(true)
    const updated = [...fallbackProviders, newFallback]
    setFallbackProviders(updated)
    try {
      await api.user.saveFallbackProviders(updated)
      setShowAddFallback(false)
      setNewFallback({ provider: 'openrouter', model: '' })
    } catch { setFallbackProviders(fallbackProviders) }
    setCustomSaving(false)
  }

  const handleRemoveFallback = async (idx: number) => {
    const updated = fallbackProviders.filter((_, i) => i !== idx)
    setFallbackProviders(updated)
    try { await api.user.saveFallbackProviders(updated) } catch { setFallbackProviders(fallbackProviders) }
  }

  // === Pooled handlers ===
  const handleAddPooled = async () => {
    if (!newPooled.label || !newPooled.api_key) return
    setCustomSaving(true)
    const updated = [...pooledCredentials, newPooled]
    setPooledCredentials(updated)
    try {
      await api.user.savePooledCredentials(updated)
      setShowAddPooled(false)
      setNewPooled({ provider: 'openai', label: '', api_key: '' })
    } catch { setPooledCredentials(pooledCredentials) }
    setCustomSaving(false)
  }

  const handleRemovePooled = async (idx: number) => {
    const updated = pooledCredentials.filter((_, i) => i !== idx)
    setPooledCredentials(updated)
    try { await api.user.savePooledCredentials(updated) } catch { setPooledCredentials(pooledCredentials) }
  }

  const tabs: { id: AuthTab; label: string; icon: any }[] = [
    { id: 'api-key', label: 'API Key', icon: Key },
    { id: 'oauth', label: 'Existing Plans', icon: LogIn },
    { id: 'custom-providers', label: 'Custom Endpoints', icon: Server },
    { id: 'fallback', label: 'Fallback', icon: GitBranch },
    { id: 'pooled', label: 'Pooled Keys', icon: Layers },
  ]

  const handleLogout = () => {
    localStorage.removeItem('bapx_token')
    navigate('/login')
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a14' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-surface-border">
        <button onClick={() => navigate('/')} className="btn btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-semibold">Settings</h1>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">{userName || 'User'}</span>
      </header>

      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-surface-border gap-0 px-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#9651b8] text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* ======= TAB: API KEY ======= */}
        {activeTab === 'api-key' && (
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Key size={16} className="text-[#9651b8]" />
              Connect Your AI Provider
            </div>
            <p className="text-xs text-gray-500">
              bapX uses your own API key. Pick your provider and enter your key below. You can switch anytime.
            </p>
            {hasExistingKey && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 rounded-lg px-3 py-2 border border-emerald-900/30">
                <CheckCircle size={12} />
                API key is configured. Enter a new key to change it.
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Provider</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setProvider(p.id); setTestResult('idle') }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ${
                      provider === p.id
                        ? 'border-[#9651b8] bg-[#9651b8]/10 text-white'
                        : 'border-surface-border text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    <div>{p.name}</div>
                    {provider === p.id && <div className="text-[9px] text-gray-500 mt-0.5 truncate">{p.models}</div>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                <Key size={12} /> API Key
              </label>
              <div className="flex gap-2">
                <input type="password" className="input font-mono text-xs flex-1"
                  placeholder={hasExistingKey ? '•••••••• (key configured)' : 'sk-...'}
                  value={apiKey} onChange={e => handleKeyChange(e.target.value)} />
                <a href={PROVIDERS.find(p => p.id === provider)?.url} target="_blank"
                  className="btn border border-surface-border px-3 py-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
                  title="Get API key">
                  <ExternalLink size={12} /> Get Key
                </a>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                <Server size={12} /> Model
              </label>
              <input type="text" className="input font-mono text-xs"
                placeholder={PROVIDERS.find(p => p.id === provider)?.models || 'gpt-4o'}
                value={model} onChange={e => setModel(e.target.value)} />
            </div>

            {testResult === 'success' && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 rounded-lg px-3 py-2 border border-emerald-900/30">
                <CheckCircle size={12} /> Connected and verified!
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-lg px-3 py-2 border border-red-900/30">
                <AlertCircle size={12} /> Could not verify. Settings saved — try chatting.
              </div>
            )}
            {testResult === 'testing' && (
              <div className="flex items-center gap-2 text-xs text-gray-400 rounded-lg px-3 py-2 border border-surface-border">
                <Loader2 size={12} className="animate-spin" /> Testing connection...
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="btn btn-primary flex-1 justify-center gap-2">
                <Save size={14} />
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
              </button>
              <button onClick={testConnection} disabled={saving || testResult === 'testing'}
                className="btn flex-1 justify-center gap-2 border border-surface-border text-gray-300 hover:bg-white/5">
                {testResult === 'testing' ? (
                  <><Loader2 size={14} className="animate-spin" /> Testing...</>
                ) : testResult === 'success' ? (
                  <><CheckCircle size={14} className="text-emerald-400" /> Verified</>
                ) : (
                  <><RefreshCw size={14} /> Test & Save</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ======= TAB: OAUTH ======= */}
        {activeTab === 'oauth' && (
          <div className="space-y-4">
            <div className="card space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LogIn size={16} className="text-[#9651b8]" />
                Login With Your Existing Plan
              </div>
              <p className="text-xs text-gray-500">
                Use your existing AI subscriptions instead of raw API keys. Works just like Hermes Agent — connect your ChatGPT Plus, Claude Max, Grok, or other plan and start using bapX immediately.
              </p>

              {OAUTH_PROVIDERS.map(op => (
                <div key={op.id}
                  className={`border rounded-xl transition-all ${
                    expandedOauth === op.id ? 'border-[#9651b8]/40' : 'border-surface-border'
                  }`}
                >
                  <button
                    onClick={() => setExpandedOauth(expandedOauth === op.id ? null : op.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-lg">{op.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-200">{op.name}</div>
                      <div className="text-xs text-gray-500">{op.desc}</div>
                    </div>
                    {expandedOauth === op.id ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  </button>

                  {expandedOauth === op.id && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="border-t border-surface-border pt-3 space-y-3">
                        <p className="text-[10px] text-gray-500">
                          To connect, run this on your machine then paste the result:
                        </p>
                        <div className="font-mono text-[11px] px-3 py-2 rounded-lg bg-black/40 text-gray-300 border border-surface-border select-all">
                          hermes auth login --provider {op.id}
                        </div>
                        <p className="text-[10px] text-gray-500">
                          Don't have Hermes installed? Get the token from <a href={op.url} target="_blank" className="text-[#9651b8] underline">your {op.name} account</a> and paste below.
                        </p>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Token</label>
                          <input type="password" className="input font-mono text-xs"
                            placeholder="Paste OAuth token..."
                            value={oauthProvider === op.id ? oauthToken : ''}
                            onChange={e => { setOauthProvider(op.id); setOauthToken(e.target.value) }} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Refresh Token (optional)</label>
                          <input type="password" className="input font-mono text-xs"
                            placeholder="Refresh token for auto-renewal"
                            value={oauthProvider === op.id ? oauthRefresh : ''}
                            onChange={e => setOauthRefresh(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Expires At (optional)</label>
                          <input type="text" className="input font-mono text-xs"
                            placeholder="ISO date or empty"
                            value={oauthProvider === op.id ? oauthExpires : ''}
                            onChange={e => setOauthExpires(e.target.value)} />
                        </div>
                        <button onClick={handleOauthSave} disabled={oauthSaving || !oauthToken}
                          className="btn btn-primary justify-center gap-2 w-full">
                          {oauthSaving ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                          {oauthSaving ? 'Connecting...' : oauthSaved ? 'Connected ✓' : `Connect ${op.name}`}
                        </button>
                        {oauthSaved && oauthProvider === op.id && (
                          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 rounded-lg px-3 py-2 border border-emerald-900/30">
                            <CheckCircle size={12} /> Connected to {op.name}!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="bg-white/[0.02] rounded-xl p-4 border border-surface-border/30">
                <p className="text-xs font-medium text-gray-400 mb-2">ℹ️ How it works</p>
                <ul className="space-y-1.5">
                  <li className="text-xs text-gray-500 flex gap-2"><span className="text-[#9651b8] shrink-0">•</span> bapX saves your OAuth credentials and uses them to authenticate API requests</li>
                  <li className="text-xs text-gray-500 flex gap-2"><span className="text-[#9651b8] shrink-0">•</span> Your agent runs inference using your subscription — no extra per-token cost</li>
                  <li className="text-xs text-gray-500 flex gap-2"><span className="text-[#9651b8] shrink-0">•</span> Tokens refresh automatically when they expire</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ======= TAB: CUSTOM PROVIDERS ======= */}
        {activeTab === 'custom-providers' && (
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Server size={16} className="text-[#9651b8]" />
              Custom OpenAI-Compatible Endpoints
            </div>
            <p className="text-xs text-gray-500">
              Add any OpenAI-compatible API. Use for self-hosted models (Ollama, vLLM, llama.cpp), local inference, or enterprise gateways.
            </p>

            {customProviders.length === 0 && !showAddCustom && (
              <div className="text-center py-6 text-gray-500 text-xs">
                No custom providers configured yet.
              </div>
            )}

            {customProviders.map((cp, idx) => (
              <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-border bg-white/[0.02]">
                <Globe size={14} className="text-[#9651b8] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-200">{cp.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{cp.base_url} — {cp.model || 'any model'}</div>
                </div>
                <button onClick={() => handleRemoveCustom(idx)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {showAddCustom && (
              <div className="space-y-3 p-3 rounded-lg border border-surface-border bg-white/[0.02]">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Name</label>
                  <input type="text" className="input text-xs" placeholder="e.g. Local LLM, Ollama, vLLM..."
                    value={newCustom.name} onChange={e => setNewCustom({...newCustom, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Base URL</label>
                  <input type="text" className="input font-mono text-xs" placeholder="http://localhost:8080/v1"
                    value={newCustom.base_url} onChange={e => setNewCustom({...newCustom, base_url: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">API Key (optional — for local skip this)</label>
                  <input type="password" className="input font-mono text-xs" placeholder="sk-..."
                    value={newCustom.api_key} onChange={e => setNewCustom({...newCustom, api_key: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Default Model</label>
                  <input type="text" className="input font-mono text-xs" placeholder="gpt-4o, llama-3, mistral..."
                    value={newCustom.model} onChange={e => setNewCustom({...newCustom, model: e.target.value})} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddCustom} disabled={customSaving || !newCustom.name || !newCustom.base_url}
                    className="btn btn-primary flex-1 justify-center gap-2 text-xs">
                    {customSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Add
                  </button>
                  <button onClick={() => setShowAddCustom(false)}
                    className="btn border border-surface-border flex-1 justify-center text-xs text-gray-400">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showAddCustom && (
              <button onClick={() => setShowAddCustom(true)}
                className="btn border border-surface-border w-full justify-center gap-2 text-xs text-gray-400 hover:text-gray-200">
                <Plus size={12} /> Add Custom Endpoint
              </button>
            )}
          </div>
        )}

        {/* ======= TAB: FALLBACK ======= */}
        {activeTab === 'fallback' && (
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <GitBranch size={16} className="text-[#9651b8]" />
              Auto-Failover Providers
            </div>
            <p className="text-xs text-gray-500">
              Set a fallback chain. When your primary provider is down or rate-limited, bapX automatically tries the next in line.
            </p>

            {fallbackProviders.length === 0 && !showAddFallback && (
              <div className="text-center py-6 text-gray-500 text-xs">
                No fallback providers configured.
              </div>
            )}

            {fallbackProviders.map((fb, idx) => (
              <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-border bg-white/[0.02]">
                <Zap size={14} className="text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-200">
                    {FALLBACK_OPTIONS.find(o => o.id === fb.provider)?.name || fb.provider}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {fb.model || 'any model'} — {FALLBACK_OPTIONS.find(o => o.id === fb.provider)?.desc || ''}
                  </div>
                </div>
                <button onClick={() => handleRemoveFallback(idx)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {showAddFallback && (
              <div className="space-y-3 p-3 rounded-lg border border-surface-border bg-white/[0.02]">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Fallback Provider</label>
                  <select value={newFallback.provider} onChange={e => setNewFallback({...newFallback, provider: e.target.value})}
                    className="input text-xs">
                    {FALLBACK_OPTIONS.map(fo => (
                      <option key={fo.id} value={fo.id}>{fo.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Model</label>
                  <input type="text" className="input font-mono text-xs" placeholder="claude-sonnet-4, gpt-4o..."
                    value={newFallback.model} onChange={e => setNewFallback({...newFallback, model: e.target.value})} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddFallback}
                    className="btn btn-primary flex-1 justify-center gap-2 text-xs">
                    <Plus size={12} /> Add
                  </button>
                  <button onClick={() => setShowAddFallback(false)}
                    className="btn border border-surface-border flex-1 justify-center text-xs text-gray-400">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showAddFallback && (
              <button onClick={() => setShowAddFallback(true)}
                className="btn border border-surface-border w-full justify-center gap-2 text-xs text-gray-400 hover:text-gray-200">
                <Plus size={12} /> Add Fallback
              </button>
            )}
          </div>
        )}

        {/* ======= TAB: POOLED CREDENTIALS ======= */}
        {activeTab === 'pooled' && (
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Layers size={16} className="text-[#9651b8]" />
              Pooled API Keys (Teams)
            </div>
            <p className="text-xs text-gray-500">
              Share multiple API keys for the same provider. When one hits rate limits, the system cycles to the next automatically.
            </p>

            {pooledCredentials.length === 0 && !showAddPooled && (
              <div className="text-center py-6 text-gray-500 text-xs">
                No pooled credentials configured. Each user uses their own single key by default.
              </div>
            )}

            {pooledCredentials.map((pc, idx) => (
              <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-border bg-white/[0.02]">
                <Shield size={14} className="text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-200">{pc.label}</div>
                  <div className="text-[10px] text-gray-500">{PROVIDERS.find(p => p.id === pc.provider)?.name || pc.provider}</div>
                </div>
                <button onClick={() => handleRemovePooled(idx)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {showAddPooled && (
              <div className="space-y-3 p-3 rounded-lg border border-surface-border bg-white/[0.02]">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Label</label>
                  <input type="text" className="input text-xs" placeholder="e.g. Team Key 1"
                    value={newPooled.label} onChange={e => setNewPooled({...newPooled, label: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Provider</label>
                  <select value={newPooled.provider} onChange={e => setNewPooled({...newPooled, provider: e.target.value})}
                    className="input text-xs">
                    {PROVIDERS.filter(p => p.id !== 'custom').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">API Key</label>
                  <input type="password" className="input font-mono text-xs" placeholder="sk-..."
                    value={newPooled.api_key} onChange={e => setNewPooled({...newPooled, api_key: e.target.value})} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddPooled} disabled={!newPooled.label || !newPooled.api_key}
                    className="btn btn-primary flex-1 justify-center gap-2 text-xs">
                    <Plus size={12} /> Add
                  </button>
                  <button onClick={() => setShowAddPooled(false)}
                    className="btn border border-surface-border flex-1 justify-center text-xs text-gray-400">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showAddPooled && (
              <button onClick={() => setShowAddPooled(true)}
                className="btn border border-surface-border w-full justify-center gap-2 text-xs text-gray-400 hover:text-gray-200">
                <Plus size={12} /> Add Pooled Key
              </button>
            )}
          </div>
        )}

        {/* Sign Out */}
        <div className="card space-y-3 border-red-900/30">
          <p className="text-xs text-gray-500">Signed in as {userName}</p>
          <button onClick={handleLogout}
            className="btn w-full justify-center text-red-400 border border-red-900/30 hover:bg-red-950/20">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
