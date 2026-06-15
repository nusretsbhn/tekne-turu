import { useState, type CSSProperties, type FormEvent } from 'react'
import { submitPreReservation } from '../api'
import { PRE_RESERVATION_I18N, type PreReservationLang } from '../i18n/preReservation'

type Screen = 'idle' | 'success' | 'error'

interface PreReservationFormProps {
  lang: PreReservationLang
  onClose?: () => void
  /** modal: kapat butonu; page: tam genişlik kart */
  variant?: 'modal' | 'page'
}

const initialForm = {
  fullName: '',
  phone: '',
  email: '',
  hotelName: '',
  adultCount: 2,
  childCount: 0,
  babyCount: 0,
  tourDate: '',
}

export function PreReservationForm({ lang, onClose, variant = 'modal' }: PreReservationFormProps) {
  const t = PRE_RESERVATION_I18N[lang]
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<Screen>('idle')
  const [submitMessage, setSubmitMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.phone.trim() || !form.tourDate) return
    setSubmitting(true)
    setSubmitStatus('idle')
    setSubmitMessage('')
    try {
      await submitPreReservation({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        hotelName: form.hotelName.trim() || undefined,
        adultCount: Number(form.adultCount) || 0,
        childCount: Number(form.childCount) || 0,
        babyCount: Number(form.babyCount) || 0,
        tourDate: form.tourDate,
      })
      setSubmitStatus('success')
      setSubmitMessage(t.requestReceived)
      setForm((f) => ({ ...f, fullName: '', phone: '', email: '', hotelName: '' }))
    } catch (err) {
      setSubmitStatus('error')
      setSubmitMessage(err instanceof Error ? err.message : t.requestFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const showTitle = variant === 'page'

  return (
    <form onSubmit={handleSubmit} style={variant === 'page' ? styles.pageForm : undefined}>
      {showTitle && (
        <>
          <h1 style={styles.pageTitle}>{t.title}</h1>
          <p style={styles.pageDesc}>{t.desc}</p>
        </>
      )}
      <div style={styles.formRow}>
        <label style={styles.label}>
          {t.fullName} <span style={styles.required}>{t.required}</span>
        </label>
        <input
          style={styles.input}
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          required
          autoComplete="name"
        />
      </div>
      <div style={styles.formRow}>
        <label style={styles.label}>
          {t.phone} <span style={styles.required}>{t.required}</span>
        </label>
        <input
          style={styles.input}
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          required
          autoComplete="tel"
        />
      </div>
      <div style={styles.formRow}>
        <label style={styles.label}>{t.email}</label>
        <input
          type="email"
          style={styles.input}
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          autoComplete="email"
        />
      </div>
      <div style={styles.formRow}>
        <label style={styles.label}>{t.hotelName}</label>
        <input
          style={styles.input}
          value={form.hotelName}
          onChange={(e) => setForm((f) => ({ ...f, hotelName: e.target.value }))}
        />
      </div>
      <div style={styles.formRowGrid}>
        <div>
          <label style={styles.label}>{t.adult}</label>
          <input
            type="number"
            min={0}
            style={styles.input}
            value={form.adultCount}
            onChange={(e) => setForm((f) => ({ ...f, adultCount: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label style={styles.label}>{t.child}</label>
          <input
            type="number"
            min={0}
            style={styles.input}
            value={form.childCount}
            onChange={(e) => setForm((f) => ({ ...f, childCount: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label style={styles.label}>{t.baby}</label>
          <input
            type="number"
            min={0}
            style={styles.input}
            value={form.babyCount}
            onChange={(e) => setForm((f) => ({ ...f, babyCount: Number(e.target.value) }))}
          />
        </div>
      </div>
      <div style={styles.formRow}>
        <label style={styles.label}>
          {t.tourDate} <span style={styles.required}>{t.required}</span>
        </label>
        <input
          type="date"
          style={styles.input}
          value={form.tourDate}
          onChange={(e) => setForm((f) => ({ ...f, tourDate: e.target.value }))}
          required
        />
      </div>
      {submitStatus !== 'idle' && (
        <p
          style={{
            marginTop: 8,
            marginBottom: 0,
            fontSize: 14,
            color: submitStatus === 'success' ? '#0a0' : '#c00',
          }}
        >
          {submitMessage}
        </p>
      )}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: onClose ? 'flex-end' : 'stretch' }}>
        {onClose && (
          <button type="button" style={styles.secondaryBtn} onClick={onClose}>
            {t.close}
          </button>
        )}
        <button
          type="submit"
          style={{
            ...styles.primaryBtn,
            flex: onClose ? undefined : 1,
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? 'wait' : 'pointer',
          }}
          disabled={submitting}
        >
          {submitting ? t.sending : t.send}
        </button>
      </div>
    </form>
  )
}

const styles: Record<string, CSSProperties> = {
  pageForm: {
    margin: 0,
  },
  pageTitle: {
    margin: '0 0 8px',
    fontSize: 26,
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center',
  },
  pageDesc: {
    margin: '0 0 24px',
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  formRow: {
    marginBottom: 10,
  },
  formRowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8,
    marginBottom: 10,
  },
  label: {
    display: 'block',
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
  },
  required: {
    color: '#c00',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 16,
    boxSizing: 'border-box',
  },
  primaryBtn: {
    padding: '12px 24px',
    background: '#f97316',
    color: '#fff',
    borderRadius: 999,
    border: 'none',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 20px',
    background: '#fff',
    color: '#1a1a1a',
    borderRadius: 999,
    border: '1px solid #ddd',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
}
