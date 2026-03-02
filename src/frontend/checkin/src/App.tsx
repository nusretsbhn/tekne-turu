import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { CheckInPage } from './pages/CheckInPage'
import { RequireAuth } from './components/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><CheckInPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
