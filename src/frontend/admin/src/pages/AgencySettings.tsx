import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { changeAcentaPassword } from '../api'

export function AgencySettings() {
  const { token } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setError(''); setSuccess('')
    try {
      await changeAcentaPassword(token, { currentPassword, newPassword, confirmNewPassword })
      setSuccess('Şifre güncellendi.')
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre değiştirilemedi')
    }
  }

  return (
    <div>
      <h1 className="page-title">Ayarlar</h1>
      <form onSubmit={submit} className="card" style={{ maxWidth: 520 }}>
        <div className="form-group"><label>Mevcut Şifre</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
        <div className="form-group"><label>Yeni Şifre</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
        <div className="form-group"><label>Yeni Şifre (Tekrar)</label><input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required /></div>
        <button className="btn btn-primary" type="submit">Şifreyi Güncelle</button>
        {error && <p className="msg-error">{error}</p>}
        {success && <p className="msg-success">{success}</p>}
      </form>
    </div>
  )
}
