import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.auth.signup(email, password, name)
      localStorage.setItem('bapx_token', data.token)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a0a14' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold tracking-tight text-white">
            bap<span style={{ color: '#9651b8' }}>X</span>
          </Link>
          <p className="text-gray-500 text-sm mt-2">Create your account</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
              <input type="text" className="input" placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input type="email" className="input" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <input type="password" className="input" placeholder="At least 8 characters"
                value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={loading}
              className="btn btn-primary w-full justify-center">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-xs text-gray-500 text-center mt-4">
            Already have an account? <Link to="/login" className="text-[#9651b8] hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
