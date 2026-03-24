import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user, isReady, logout } = useAuth()
  const location = useLocation()

  if (!isReady) return <div style={{ padding: '2rem', textAlign: 'center' }}>Yükleniyor...</div>
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  if (!user) { logout(); return <Navigate to="/login" replace /> }
  return <>{children}</>
}
