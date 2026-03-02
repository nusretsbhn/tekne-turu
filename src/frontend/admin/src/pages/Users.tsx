import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchUsers, createUser, type UserItem } from '../api'

export function Users() {
  const { token } = useAuth()
  const [list, setList] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'Çalışan' })
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    if (!token) return
    setLoading(true)
    fetchUsers(token)
      .then(setList)
      .catch(() => setMessage('Liste alınamadı.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [token])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setMessage('')
    setSubmitting(true)
    createUser(token, { ...form, role: form.role })
      .then(() => {
        setForm({ email: '', password: '', fullName: '', role: 'Çalışan' })
        setMessage('Kullanıcı oluşturuldu.')
        load()
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Oluşturulamadı.'))
      .finally(() => setSubmitting(false))
  }

  return (
    <div>
      <h1 className="page-title">Kullanıcılar</h1>
      <div className="card card-md" style={{ marginBottom: 24, maxWidth: 480 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '1.125rem' }}>Yeni kullanıcı</h2>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>E-posta *</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Şifre (en az 6 karakter) *</label>
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={6} />
          </div>
          <div className="form-group">
            <label>Ad soyad *</label>
            <input type="text" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Rol *</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="Çalışan">Çalışan (sadece check-in)</option>
              <option value="Admin">Admin (admin panel + check-in)</option>
            </select>
          </div>
          {message && <p className={message.includes('oluşturuldu') ? 'msg-success' : 'msg-error'}>{message}</p>}
          <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Oluşturuluyor...' : 'Kullanıcı oluştur'}</button>
        </form>
      </div>

      {loading && <p>Yükleniyor...</p>}
      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ad soyad</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Son giriş</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.isActive ? 'Aktif' : 'Pasif'}</td>
                  <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('tr-TR') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && list.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Henüz kullanıcı yok.</p>}
    </div>
  )
}
