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

/**
 * Stream chat messages via SSE from the chat/send endpoint.
 * Calls onToken for each text chunk, onToolCall for tool calls, and onDone when finished.
 * Returns an abort function to cancel the stream.
 */
function streamChat(
  message: string,
  sessionId: string | undefined,
  callbacks: {
    onToken: (text: string) => void
    onToolCall?: (toolCall: any) => void
    onDone: (sessionId: string) => void
    onError: (error: string) => void
  }
): () => void {
  const token = localStorage.getItem('bapx_token')
  const abortController = new AbortController()

  fetch(`${API_BASE}/chat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, sessionId }),
    signal: abortController.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const errText = await res.text()
      callbacks.onError(`API error: ${res.status} — ${errText.slice(0, 200)}`)
      return
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (!data) continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              callbacks.onToken(parsed.text)
            } else if (parsed.tool_call) {
              callbacks.onToolCall?.(parsed.tool_call)
            } else if (parsed.done) {
              callbacks.onDone(parsed.sessionId)
              return
            } else if (parsed.error) {
              callbacks.onError(parsed.error)
              return
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      callbacks.onError(err.message)
    }
  })

  return () => abortController.abort()
}

export const api = {
  auth: {
    signup: (email: string, password: string, name: string, extra?: { username?: string; age?: string; nature?: string; agent_name?: string; bio?: string }) =>
      request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name, ...extra }) }),
    login: (email: string, password: string) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  },
  user: {
    profile: () => request('/user/profile'),
    updateApiKey: (provider: string, key: string | undefined, model: string) =>
      request('/user/api-key', { method: 'PUT', body: JSON.stringify({ provider, key, model }) }),
  },
  chat: {
    send: (message: string, sessionId?: string) =>
      request('/chat/send', { method: 'POST', body: JSON.stringify({ message, sessionId }) }),
    stream: streamChat,
    newSession: () => request('/chat/new', { method: 'POST' }),
    getSession: (sessionId: string) => request(`/chat/${sessionId}`),
    listSessions: () => request('/user/sessions'),
  },
}
