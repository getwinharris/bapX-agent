import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'

function App() {
  const token = localStorage.getItem('bapx_token')

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={token ? <Navigate to="/" /> : <Signup />} />
      <Route path="/settings" element={token ? <Settings /> : <Navigate to="/login" />} />
      <Route path="/*" element={token ? <Dashboard /> : <Navigate to="/login" />} />
    </Routes>
  )
}

export default App
