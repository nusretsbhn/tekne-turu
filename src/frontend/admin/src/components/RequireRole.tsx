import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={user.role === 'Acenta' ? '/agency/dashboard' : '/dashboard'} replace />
  return <>{children}</>
}
