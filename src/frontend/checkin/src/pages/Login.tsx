import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
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
    if (result.ok) navigate('/')
    else setError(result.error ?? 'Giriş başarısız.')
  }

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: '2rem', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
      <h1 style={{ marginTop: 0 }}>Check-in Girişi</h1>
      {error && <p style={{ color: '#c00', marginBottom: '1rem' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>E-posta</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Şifre</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.6rem', background: '#1a1a1a', color: '#fff', border: 0, borderRadius: 6 }}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  )
}
