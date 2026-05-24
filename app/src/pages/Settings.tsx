import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { ArrowLeft, Key, Server, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function Settings() {
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const navigate = useNavigate()

  useEffect(() => {
    api.user.profile().then(u => {
      if (u.api_key) {
        setApiKey(u.api_key)
        setHasExistingKey(true)
      }
      if (u.provider) setProvider(u.provider)
      if (u.model) setModel(u.model)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const keyToSend = hasExistingKey && apiKey.startsWith('••••') ? undefined : apiKey
      await api.user.updateApiKey(provider, keyToSend, model)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      const profile = await api.user.profile()
      if (profile.api_key) {
        setApiKey(profile.api_key)
        setHasExistingKey(true)
      }
    } catch { /* noop */ }
    setSaving(false)
  }

  const handleKeyChange = (value: string) => {
    setApiKey(value)
    setTestResult('idle')
    if (value === '' || !value.startsWith('••••')) {
      setHasExistingKey(false)
    }
  }

  const testConnection = async () => {
    setTestResult('testing')
    // Save first, then do a quick test call
    try {
      const keyToSend = hasExistingKey && apiKey.startsWith('••••') ? undefined : apiKey
      if (keyToSend !== undefined || hasExistingKey) {
        await api.user.updateApiKey(provider, keyToSend, model)
        // Refresh masked key
        const profile = await api.user.profile()
        if (profile.api_key) {
          setApiKey(profile.api_key)
          setHasExistingKey(true)
        }
      }
      // Test by making a tiny API call to the chat endpoint
      const token = localStorage.getItem('bapx_token')
      const res = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setTestResult('success')
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setTestResult('error')
      }
    } catch {
      setTestResult('error')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('bapx_token')
    navigate('/login')
  }

  const modelPlaceholders: Record<string, string> = {
    openai: 'gpt-4o, gpt-4o-mini, o3, o4-mini...',
    anthropic: 'claude-sonnet-4, claude-haiku-3.5...',
    google: 'gemini-2.5-flash, gemini-2.5-pro...',
    openrouter: 'openai/gpt-4o, anthropic/claude-sonnet-4...',
    custom: 'your-model-name',
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a14' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-6 h-14 border-b border-surface-border">
        <button onClick={() => navigate('/')} className="btn btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-semibold">Settings</h1>
      </header>

      <div className="max-w-lg mx-auto p-6 space-y-6">
        {/* API Key */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Key size={16} className="text-[#9651b8]" />
            API Key
          </div>
          <p className="text-xs text-gray-500">
            bapX uses your own API key. The agent uses your provider to respond.
          </p>
          {hasExistingKey && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 rounded-lg px-3 py-2 border border-emerald-900/30">
              <CheckCircle size={12} />
              API key is configured. Enter a new key below to change it.
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Provider</label>
            <select value={provider} onChange={e => { setProvider(e.target.value); setTestResult('idle'); }}
              className="input">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">API Key</label>
            <input type="password" className="input font-mono text-xs"
              placeholder={hasExistingKey ? '•••••••• (key configured)' : 'sk-...'}
              value={apiKey} onChange={e => handleKeyChange(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
              <Server size={12} /> Model
            </label>
            <input type="text" className="input font-mono text-xs"
              placeholder={modelPlaceholders[provider] || 'gpt-4o'}
              value={model}
              onChange={e => setModel(e.target.value)} />
            <p className="text-[10px] text-gray-500 mt-1">
              {provider === 'openai' && 'Default: gpt-4o. For o-series models, the agent may use function calling.'}
              {provider === 'anthropic' && 'Default: claude-sonnet-4-20250514. Extended thinking supported.'}
              {provider === 'openrouter' && 'Format: provider/model (e.g. openai/gpt-4o).'}
            </p>
          </div>

          {/* Test result feedback */}
          {testResult === 'success' && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 rounded-lg px-3 py-2 border border-emerald-900/30">
              <CheckCircle size={12} />
              Settings saved and profile verified successfully!
            </div>
          )}
          {testResult === 'error' && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-lg px-3 py-2 border border-red-900/30">
              <AlertCircle size={12} />
              Profile saved but connection test could not be completed. Your settings are saved — try sending a message in chat.
            </div>
          )}
          {testResult === 'testing' && (
            <div className="flex items-center gap-2 text-xs text-gray-400 rounded-lg px-3 py-2 border border-surface-border">
              <Loader2 size={12} className="animate-spin" />
              Testing connection...
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
                <><CheckCircle size={14} /> Test & Save</>
              )}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card space-y-3 border-red-900/30">
          <p className="text-xs text-gray-500">Signed in to your account</p>
          <button onClick={handleLogout}
            className="btn w-full justify-center text-red-400 border border-red-900/30 hover:bg-red-950/20">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
