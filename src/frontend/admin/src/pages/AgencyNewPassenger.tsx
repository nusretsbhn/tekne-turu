import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createAcentaBooking, type BookingPersonDto } from '../api'

function todayStr() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

const emptyPerson = (): BookingPersonDto => ({
  fullName: '',
  idNumber: '',
  nationality: 'TR',
  birthDate: null,
  ageCategory: 'Yetişkin',
  phone: '',
  email: '',
  accommodationPlace: '',
  kvkkConsent: true,
  smsConsent: true,
})

export function AgencyNewPassenger() {
  const { token } = useAuth()
  const [tourDate, setTourDate] = useState(todayStr())
  const [useShuttle, setUseShuttle] = useState(false)
  const [persons, setPersons] = useState<BookingPersonDto[]>([emptyPerson()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const setPerson = (idx: number, patch: Partial<BookingPersonDto>) =>
    setPersons((list) => list.map((p, i) => (i === idx ? { ...p, ...patch } : p)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true); setError(''); setSuccess('')
    try {
      await createAcentaBooking(token, { tourDate, useShuttle, persons })
      setSuccess('Kayıt başarılı.')
      setPersons([emptyPerson()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">Yeni Yolcu Ekle</h1>
      <form onSubmit={submit} className="card">
        <div className="form-row">
          <div className="form-group">
            <label>Tur Tarihi</label>
            <input type="date" value={tourDate} onChange={(e) => setTourDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="service-check" style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                id="service-check"
                type="checkbox"
                checked={useShuttle}
                onChange={(e) => setUseShuttle(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  minWidth: 18,
                  minHeight: 18,
                  margin: 0,
                  padding: 0,
                  appearance: 'auto',
                  WebkitAppearance: 'checkbox',
                  cursor: 'pointer',
                }}
              />
              Servis kullanılacak
            </label>
          </div>
        </div>
        {persons.map((p, i) => (
          <div key={i} className="card" style={{ marginBottom: 12, border: '1px solid var(--color-border)' }}>
            <div className="form-row">
              <div className="form-group"><label>Ad Soyad</label><input value={p.fullName} onChange={(e) => setPerson(i, { fullName: e.target.value })} required /></div>
              <div className="form-group"><label>Uyruk</label><select value={p.nationality} onChange={(e) => setPerson(i, { nationality: e.target.value })}><option value="TR">TR</option><option value="Diğer">Diğer</option></select></div>
              <div className="form-group"><label>Kimlik/Pasaport</label><input value={p.idNumber} onChange={(e) => setPerson(i, { idNumber: e.target.value })} /></div>
              <div className="form-group"><label>Doğum Tarihi</label><input type="date" value={p.birthDate?.slice(0, 10) ?? ''} onChange={(e) => setPerson(i, { birthDate: e.target.value || null })} required /></div>
              <div className="form-group"><label>Kategori</label><select value={p.ageCategory} onChange={(e) => setPerson(i, { ageCategory: e.target.value })}><option>Yetişkin</option><option>Çocuk</option><option>Bebek</option></select></div>
              <div className="form-group"><label>Telefon</label><input value={p.phone ?? ''} onChange={(e) => setPerson(i, { phone: e.target.value })} /></div>
              <div className="form-group"><label>Otel</label><input value={p.accommodationPlace ?? ''} onChange={(e) => setPerson(i, { accommodationPlace: e.target.value })} /></div>
            </div>
            {persons.length > 1 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPersons((list) => list.filter((_, idx) => idx !== i))}>Kişiyi Sil</button>}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setPersons((list) => [...list, emptyPerson()])}>Kişi Ekle</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </div>
        {error && <p className="msg-error">{error}</p>}
        {success && <p className="msg-success">{success}</p>}
      </form>
    </div>
  )
}
