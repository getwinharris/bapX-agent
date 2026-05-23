const API_BASE = '/api'

async function request(path: string, options?: RequestInit) {
  const token = localStorage.getItem('bapx_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('bapx_token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  auth: {
    signup: (email: string, password: string, name: string) =>
      request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
    login: (email: string, password: string) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  },
  user: {
    profile: () => request('/user/profile'),
    updateApiKey: (provider: string, key: string, model: string) =>
      request('/user/api-key', { method: 'PUT', body: JSON.stringify({ provider, key, model }) }),
  },
  chat: {
    send: (message: string) =>
      request('/chat/send', { method: 'POST', body: JSON.stringify({ message }) }),
    history: () => request('/chat/history'),
  },
}
