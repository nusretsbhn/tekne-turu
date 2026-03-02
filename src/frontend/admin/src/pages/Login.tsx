import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const CHECKIN_URL = import.meta.env.VITE_CHECKIN_URL ?? (typeof window !== 'undefined' ? `${window.location.origin}/checkin/` : '/checkin/')

export function Login() {
  const navigate = useNavigate()
  const { login, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.ok && result.role === 'Admin') {
      navigate('/dashboard')
      return
    }
    if (result.ok && result.role !== 'Admin') {
      logout()
      setError('Bu panele sadece Admin girişi yapabilir. Check-in ekranı için aşağıdaki bağlantıyı kullanın.')
      return
    }
    setError(result.error ?? 'Giriş başarısız.')
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 400, margin: '2rem auto', width: '100%', boxSizing: 'border-box' }}>
      <div className="card card-lg">
      <h1 className="page-title" style={{ marginTop: 0 }}>Giriş</h1>
      {error && (
        <div className="msg-error">
          <p>{error}</p>
          {error.includes('Check-in') && (
            <a href={CHECKIN_URL} style={{ display: 'inline-block', marginTop: 8, fontWeight: 500 }}>
              Check-in sayfasına git →
            </a>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="login-email">E-posta</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Şifre</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
      </div>
    </div>
  )
}
