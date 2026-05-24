import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createAcentaBooking, type BookingPersonDto } from '../api'

function todayStr() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

type AgencyPersonForm = BookingPersonDto & {
  birthDay: string
  birthMonth: string
  birthYear: string
}

const emptyPerson = (): AgencyPersonForm => ({
  fullName: '',
  idNumber: '',
  nationality: 'TR',
  birthDate: null,
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  ageCategory: 'Yetişkin',
  phone: '',
  email: '',
  accommodationPlace: '',
  kvkkConsent: true,
  smsConsent: true,
})

function digitsOnly(s: string, maxLen: number) {
  return s.replace(/\D/g, '').slice(0, maxLen)
}

/** Gün / ay / yıl stringlerinden yyyy-MM-dd; geçersiz takvimde null */
function toIsoBirthDate(yStr: string, mStr: string, dStr: string): string | null {
  const y = yStr.trim()
  const m = mStr.trim()
  const d = dStr.trim()
  if (!y || y.length < 4 || !m || !d) return null
  const yi = Number(y)
  const mi = Number(m)
  const di = Number(d)
  if (!Number.isFinite(yi) || !Number.isFinite(mi) || !Number.isFinite(di)) return null
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return null
  const dt = new Date(yi, mi - 1, di)
  if (dt.getFullYear() !== yi || dt.getMonth() !== mi - 1 || dt.getDate() !== di) return null
  if (dt > new Date()) return null
  return `${yi}-${String(mi).padStart(2, '0')}-${String(di).padStart(2, '0')}`
}

function toBookingDto(p: AgencyPersonForm): BookingPersonDto {
  const birthDate = toIsoBirthDate(p.birthYear, p.birthMonth, p.birthDay)
  return {
    fullName: p.fullName,
    idNumber: '',
    nationality: 'TR',
    birthDate,
    ageCategory: p.ageCategory,
    phone: p.phone?.trim() || null,
    email: p.email?.trim() || null,
    accommodationPlace: p.accommodationPlace?.trim() || null,
    kvkkConsent: p.kvkkConsent,
    smsConsent: p.smsConsent,
  }
}

function validatePersonForm(p: AgencyPersonForm, index: number): string | null {
  const i = index + 1
  if (!p.fullName?.trim() || p.fullName.trim().length < 3) {
    return `Kişi ${i}: Ad soyad en az 3 karakter olmalıdır.`
  }
  if (!p.kvkkConsent) return `Kişi ${i}: KVKK onayı zorunludur.`

  const birthDate = toIsoBirthDate(p.birthYear, p.birthMonth, p.birthDay)
  if (!birthDate) {
    return `Kişi ${i}: Geçerli bir doğum tarihi giriniz (gün, ay, yıl).`
  }

  const ageCat = p.ageCategory?.trim() ?? 'Yetişkin'
  if (!['Yetişkin', 'Çocuk', 'Bebek'].includes(ageCat)) {
    return `Kişi ${i}: Yaş kategorisi Yetişkin, Çocuk veya Bebek olmalıdır.`
  }

  const em = (p.email ?? '').trim()
  if (em && !em.includes('@')) return `Kişi ${i}: Geçerli bir e-posta adresi giriniz.`

  return null
}

export function AgencyNewPassenger() {
  const { token } = useAuth()
  const [tourDate, setTourDate] = useState(todayStr())
  const [useShuttle, setUseShuttle] = useState(false)
  const [persons, setPersons] = useState<AgencyPersonForm[]>([emptyPerson()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const setPerson = (idx: number, patch: Partial<AgencyPersonForm>) =>
    setPersons((list) => list.map((p, i) => (i === idx ? { ...p, ...patch } : p)))

  const addPerson = () => {
    setPersons((list) => {
      const hotel = list[0]?.accommodationPlace?.trim()
      const np = emptyPerson()
      if (hotel) np.accommodationPlace = hotel
      return [...list, np]
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    setSuccess('')
    for (let idx = 0; idx < persons.length; idx++) {
      const err = validatePersonForm(persons[idx], idx)
      if (err) {
        setError(err)
        setSaving(false)
        return
      }
    }
    const payload: BookingPersonDto[] = persons.map(toBookingDto)
    try {
      await createAcentaBooking(token, { tourDate, useShuttle, persons: payload })
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
                <div className="form-group">
                  <label>Ad Soyad</label>
                  <input value={p.fullName} onChange={(e) => setPerson(i, { fullName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Doğum tarihi</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="bday-day"
                      placeholder="Gün"
                      aria-label="Doğum günü"
                      value={p.birthDay}
                      onChange={(e) => setPerson(i, { birthDay: digitsOnly(e.target.value, 2) })}
                      style={{ width: '4.5rem' }}
                    />
                    <span aria-hidden>/</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="bday-month"
                      placeholder="Ay"
                      aria-label="Doğum ayı"
                      value={p.birthMonth}
                      onChange={(e) => setPerson(i, { birthMonth: digitsOnly(e.target.value, 2) })}
                      style={{ width: '4.5rem' }}
                    />
                    <span aria-hidden>/</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="bday-year"
                      placeholder="Yıl"
                      aria-label="Doğum yılı"
                      value={p.birthYear}
                      onChange={(e) => setPerson(i, { birthYear: digitsOnly(e.target.value, 4) })}
                      style={{ width: '5.5rem' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <select value={p.ageCategory} onChange={(e) => setPerson(i, { ageCategory: e.target.value })}>
                    <option>Yetişkin</option>
                    <option>Çocuk</option>
                    <option>Bebek</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input
                    value={p.phone ?? ''}
                    onChange={(e) => setPerson(i, { phone: e.target.value })}
                    placeholder="+90 5xx xxx xx xx"
                  />
                </div>
                <div className="form-group">
                  <label>Otel</label>
                  <input value={p.accommodationPlace ?? ''} onChange={(e) => setPerson(i, { accommodationPlace: e.target.value })} />
                </div>
              </div>
              {persons.length > 1 && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPersons((list) => list.filter((_, idx) => idx !== i))}>
                  Kişiyi Sil
                </button>
              )}
            </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={addPerson}>
            Kişi Ekle
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
        {error && <p className="msg-error">{error}</p>}
        {success && <p className="msg-success">{success}</p>}
      </form>
    </div>
  )
}
