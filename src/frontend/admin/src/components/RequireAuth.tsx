import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const CHECKIN_URL = import.meta.env.VITE_CHECKIN_URL ?? 'http://localhost:5175'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user, isReady, logout } = useAuth()
  const location = useLocation()

  if (!isReady) return <div style={{ padding: '2rem', textAlign: 'center' }}>Yükleniyor...</div>
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  if (user && user.role !== 'Admin') {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: 400, margin: '4rem auto' }}>
        <p style={{ color: '#1a1a1a', marginBottom: '1rem' }}>Acenta hesabı ile giriş yapıldı.</p>
        <p style={{ color: '#666', marginBottom: '1rem' }}>Acenta kullanıcı sekmeleri yakında eklenecek.</p>
        <p style={{ marginBottom: '1rem' }}>Check-in ekranı için:</p>
        <a href={CHECKIN_URL} style={{ display: 'inline-block', marginBottom: '1rem', color: '#1a1a1a', fontWeight: 600 }}>Check-in sayfasına git →</a>
        <br />
        <button type="button" onClick={logout} style={{ padding: '8px 16px', marginTop: 8 }}>Çıkış yap</button>
      </div>
    )
  }
  return <>{children}</>
}
