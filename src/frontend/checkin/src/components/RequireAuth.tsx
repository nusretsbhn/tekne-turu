import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isReady } = useAuth()
  if (!isReady) return <div style={{ padding: '2rem', textAlign: 'center' }}>Yükleniyor...</div>
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
