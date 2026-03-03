import { useState, useCallback, useEffect } from 'react'
import { emptyPerson, type PersonForm } from './types'
import { allPersonsValid } from './validation'
import { createBooking } from './api'
import { PersonCard } from './components/PersonCard'

type Screen = 'start' | 'form' | 'thankyou'

const styles = {
  wrap: { minHeight: '100vh', padding: 24, maxWidth: 800, margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  startBtn: { display: 'block', width: '100%', maxWidth: 400, margin: '80px auto 0', padding: 32, fontSize: 22, fontWeight: 600, background: '#1a1a1a', color: '#fff', border: 0, borderRadius: 12, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,.2)' },
  formHeader: { marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 },
  addBtn: { padding: '10px 20px', background: '#0a0', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 500 },
  submitBtn: { padding: '14px 28px', background: '#1a1a1a', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 },
  submitBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  error: { color: '#c00', marginBottom: 12 },
  thankYou: { textAlign: 'center' as const, padding: '60px 24px', fontSize: 24, color: '#0a0' },
  countdown: { marginTop: 24, fontSize: 18, color: '#666' },
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [persons, setPersons] = useState<PersonForm[]>([])
  const [tourDate, setTourDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(5)

  const startNew = useCallback(() => {
    setPersons([emptyPerson()])
    setExpandedId(null)
    setError('')
    setTourDate(new Date().toISOString().slice(0, 10))
    setScreen('form')
  }, [])

  const addPerson = useCallback(() => {
    setPersons((prev) => {
      const next = [...prev, emptyPerson()]
      const last = next[next.length - 1]
      setExpandedId(last.id)
      return next
    })
  }, [])

  const updatePerson = useCallback((id: string, updates: Partial<PersonForm>) => {
    setPersons((p) => p.map((x) => (x.id === id ? { ...x, ...updates } : x)))
  }, [])

  const removePerson = useCallback((id: string) => {
    setPersons((p) => p.filter((x) => x.id !== id))
    if (expandedId === id) setExpandedId(null)
  }, [expandedId])

  useEffect(() => {
    if (screen !== 'thankyou' || countdown <= 0) return
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [screen, countdown])

  useEffect(() => {
    if (screen === 'thankyou' && countdown === 0) {
      setScreen('start')
      setPersons([])
    }
  }, [screen, countdown])

  const submit = useCallback(async () => {
    if (!allPersonsValid(persons) || !tourDate) return
    const count = persons.length
    const dateTr = new Date(tourDate).toLocaleDateString('tr-TR')
    const dateEn = new Date(tourDate).toLocaleDateString('en-GB')
    const confirmText =
      `Viking Ölüdeniz Tekne Turuna ${dateTr} tarihli ${count} kişilik kayıt yapılacak. Onaylıyor musunuz?\n\n` +
      `This will create a booking for ${count} guest(s) on ${dateEn} for the Viking Oludeniz boat tour. Do you confirm?`
    if (!window.confirm(confirmText)) return
    setError('')
    setLoading(true)
    const result = await createBooking(persons, tourDate)
    setLoading(false)
    if (result.success) {
      setScreen('thankyou')
      setCountdown(5)
    } else {
      setError(result.error ?? 'Kayıt gönderilemedi.')
    }
  }, [persons, tourDate])

  if (screen === 'start') {
    return (
      <div style={styles.wrap}>
        <h1 style={{ textAlign: 'center', marginTop: 48 }}>Viking Ölüdeniz Yolcu Kayıt Sistemi</h1>
        <button type="button" style={styles.startBtn} onClick={startNew}>
          Yeni Grup Kaydı Başlat
        </button>
      </div>
    )
  }

  if (screen === 'thankyou') {
    return (
      <div style={styles.wrap}>
        <div style={styles.thankYou}>
          <p>Kaydınız alındı. Teşekkür ederiz.</p>
          <p style={styles.countdown}>Yeni kayıt için {countdown} saniye...</p>
        </div>
      </div>
    )
  }

  const valid = allPersonsValid(persons)

  return (
    <div style={styles.wrap}>
      <h1 style={{ marginBottom: 8 }}>Viking Ölüdeniz Yolcu Kayıt Sistemi</h1>
      {!valid && persons.length > 0 && <p style={styles.error}>Zorunlu alanları doldurunuz. / Please fill in required fields.</p>}
      {error && <p style={styles.error}>{error}</p>}
      {persons.map((p, i) => (
        <PersonCard
          key={p.id}
          person={p}
          index={i}
          canRemove={persons.length > 1}
          expanded={expandedId === p.id || (expandedId === null && i === 0)}
          onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          onChange={(updates) => updatePerson(p.id, updates)}
          onRemove={() => removePerson(p.id)}
          tourDate={tourDate}
          onTourDateChange={setTourDate}
        />
      ))}
      <div style={{ ...styles.formHeader, marginTop: 16 }}>
        <button type="button" style={styles.addBtn} onClick={addPerson}>
          + Kişi Ekle
        </button>
        <button
          type="button"
          style={{ ...styles.submitBtn, ...(valid && !loading ? {} : styles.submitBtnDisabled) }}
          onClick={submit}
          disabled={!valid || loading}
        >
          {loading ? 'Kaydediliyor...' : 'Grubu Kaydet'}
        </button>
      </div>
    </div>
  )
}
