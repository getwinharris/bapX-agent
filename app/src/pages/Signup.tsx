import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function Signup() {
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [age, setAge] = useState('')
  const [nature, setNature] = useState('')
  const [agentName, setAgentName] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const data = await api.auth.signup(email, password, name, { username, age, nature, agent_name: agentName, bio })
      localStorage.setItem('bapx_token', data.token)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a0a14' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-extrabold tracking-tight text-white">
            bap<span style={{ color: '#9651b8' }}>X</span>
          </Link>
          <p className="text-gray-500 text-sm mt-1">Create your account for your personal AI agent</p>
        </div>

        <div className="card">
          {/* Step indicator */}
          <div className="flex gap-1 mb-6">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-[#9651b8]' : 'bg-surface-border'}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-[#9651b8]' : 'bg-surface-border'}`} />
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Account basics */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-200">Account Details</h2>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Username *</label>
                  <input type="text" className="input" placeholder="Choose a unique username"
                    value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    required minLength={3} maxLength={30} />
                  <p className="text-[10px] text-gray-500 mt-1">Letters, numbers, hyphens and underscores only</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Full Name *</label>
                  <input type="text" className="input" placeholder="Your real name"
                    value={name} onChange={e => setName(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Email *</label>
                  <input type="email" className="input" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Age</label>
                  <input type="date" className="input"
                    value={age} onChange={e => setAge(e.target.value)}
                    max={new Date().toISOString().split('T')[0]} />
                </div>

                <button type="button" onClick={() => setStep(2)}
                  className="btn btn-primary w-full justify-center">
                  Next — Agent Setup
                </button>
              </div>
            )}

            {/* Step 2: Agent & profile */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-200">Agent &amp; Profile</h2>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Agent Name *</label>
                  <input type="text" className="input" placeholder="Name your AI agent (e.g. 'Aria', 'Nexus', 'BapX')"
                    value={agentName} onChange={e => setAgentName(e.target.value)}
                    required />
                  <p className="text-[10px] text-gray-500 mt-1">This is what your agent will call itself</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">What do you do?</label>
                  <input type="text" className="input" placeholder="e.g. Software Engineer, Student, Designer, Researcher..."
                    value={nature} onChange={e => setNature(e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">About You</label>
                  <textarea className="input min-h-[80px] resize-none" placeholder="A short bio so your agent knows who you are — your style, goals, personality..."
                    value={bio} onChange={e => setBio(e.target.value)} maxLength={500} />
                  <p className="text-[10px] text-gray-500 mt-1">{bio.length}/500 — This becomes part of your agent's context</p>
                </div>

                <div className="border-t border-surface-border pt-4 space-y-4">
                  <h3 className="text-xs font-semibold text-gray-400">Set Password</h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Password *</label>
                    <input type="password" className="input" placeholder="At least 8 characters"
                      value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Confirm Password *</label>
                    <input type="password" className="input" placeholder="Type password again"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={8} required />
                  </div>
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-red-400 text-xs">Passwords do not match</p>
                  )}
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="btn btn-ghost flex-1 justify-center">
                    Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="btn btn-primary flex-1 justify-center">
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            Already have an account? <Link to="/login" className="text-[#9651b8] hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
