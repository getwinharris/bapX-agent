import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('bapx_token'))

  useEffect(() => {
    const check = () => setToken(localStorage.getItem('bapx_token'))
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])

  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('bapx_token'))

  useEffect(() => {
    const check = () => setToken(localStorage.getItem('bapx_token'))
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])

  if (token) return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestGuard><Login /></GuestGuard>} />
      <Route path="/signup" element={<GuestGuard><Signup /></GuestGuard>} />
      <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
      <Route path="/*" element={<AuthGuard><Dashboard /></AuthGuard>} />
    </Routes>
  )
}

export default App
