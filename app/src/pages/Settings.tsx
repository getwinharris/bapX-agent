import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { ArrowLeft, Key, Server, Save } from 'lucide-react'

export default function Settings() {
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)
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
      // Only send the API key if the user actually typed something new
      // The masked "••••abcd" value means they didn't change it
      const keyToSend = hasExistingKey && apiKey.startsWith('••••') ? undefined : apiKey
      await api.user.updateApiKey(provider, keyToSend, model)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      // Re-fetch profile to get fresh masked key
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
    // If user clears the field or types something different from masked, mark as changed
    if (value === '' || !value.startsWith('••••')) {
      setHasExistingKey(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('bapx_token')
    navigate('/login')
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
          {hasExistingKey && (
            <p className="text-xs text-emerald-400">✓ API key is configured. Enter a new key below to change it.</p>
          )}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Provider</label>
            <select value={provider} onChange={e => setProvider(e.target.value)}
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
              placeholder="gpt-4o / claude-sonnet-4 / ..." value={model}
              onChange={e => setModel(e.target.value)} />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="btn btn-primary w-full justify-center gap-2">
            <Save size={14} />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>

        {/* Danger zone */}
        <div className="card space-y-3 border-red-900/30">
          <p className="text-xs text-gray-500">Signed in as your email</p>
          <button onClick={handleLogout}
            className="btn w-full justify-center text-red-400 border border-red-900/30 hover:bg-red-950/20">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
