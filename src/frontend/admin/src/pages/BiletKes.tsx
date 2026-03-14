import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchTour, fetchTicketNextNumber, createTicket } from '../api'
import type { PreReservationItem } from '../api'

function todayStr() {
  const t = new Date()
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

function formFromPreReservation(pr: PreReservationItem | null | undefined) {
  if (!pr) return null
  return {
    fullName: pr.fullName ?? '',
    phone: pr.phone ?? '',
    tourDate: pr.tourDate?.slice(0, 10) ?? todayStr(),
    adultCount: pr.adultCount ?? 2,
    childCount: pr.childCount ?? 0,
    babyCount: pr.babyCount ?? 0,
    hotel: pr.hotelName ?? '',
    note: '',
    hasService: false,
    paymentType: 'ToPay' as const,
  }
}

export function BiletKes() {
  const { token } = useAuth()
  const location = useLocation()
  const [nextNumber, setNextNumber] = useState<string>('')
  const [tourStart, setTourStart] = useState<string>('')
  const [tourEnd, setTourEnd] = useState<string>('')
  const [form, setForm] = useState(() => {
    const pr = (location.state as { fromPreReservation?: PreReservationItem } | null)?.fromPreReservation
    return formFromPreReservation(pr) ?? {
      fullName: '',
      phone: '',
      tourDate: todayStr(),
      adultCount: 2,
      childCount: 0,
      babyCount: 0,
      hotel: '',
      note: '',
      hasService: false,
      paymentType: 'ToPay' as 'ToPay' | 'FullPaid' | 'Free',
    }
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return
    fetchTicketNextNumber(token).then((r) => setNextNumber(r.ticketNumber)).catch(() => {})
    fetchTour(token).then((t) => {
      if (t?.startTime) setTourStart(t.startTime)
      if (t?.endTime) setTourEnd(t.endTime)
    }).catch(() => {})
  }, [token])

  useEffect(() => {
    const pr = (location.state as { fromPreReservation?: PreReservationItem } | null)?.fromPreReservation
    const next = formFromPreReservation(pr)
    if (next) setForm((f) => ({ ...f, ...next }))
  }, [location.state])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!form.fullName.trim()) {
      setMessage('Ad soyad giriniz.')
      return
    }
    if (!form.phone.trim()) {
      setMessage('Telefon giriniz.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      const res = await createTicket(token, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        tourDate: form.tourDate,
        adultCount: form.adultCount,
        childCount: form.childCount,
        babyCount: form.babyCount,
        hotel: form.hotel.trim() || undefined,
        note: form.note.trim() || undefined,
        hasService: form.hasService,
        paymentType: form.paymentType,
      })
      setMessage(`Bilet kesildi: ${res.ticketNumber}. Biletler sekmesinden indirebilirsiniz.`)
      setForm((f) => ({
        ...f,
        fullName: '',
        phone: '',
        hotel: '',
        note: '',
        adultCount: 2,
        childCount: 0,
        babyCount: 0,
      }))
      fetchTicketNextNumber(token).then((r) => setNextNumber(r.ticketNumber)).catch(() => {})
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Bilet kesilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">Bilet Kes</h1>
      <p style={{ marginBottom: 16, color: 'var(--color-text-muted)' }}>
        Bilgileri doldurup <strong>Bilet Kes</strong> butonuna basın. Oluşan bilet JPG dosyası Biletler sekmesinde kayıt altına alınır.
      </p>
      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <div className="form-group">
          <label>Bilet No (otomatik)</label>
          <input type="text" value={nextNumber} readOnly style={{ background: '#f5f5f5', cursor: 'default' }} />
        </div>
        <div className="form-group">
          <label>Ad Soyad *</label>
          <input
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Ad Soyad"
            required
          />
        </div>
        <div className="form-group">
          <label>Telefon *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="5xx xxx xx xx"
            required
          />
        </div>
        <div className="form-group">
          <label>Tur Tarihi *</label>
          <input
            type="date"
            value={form.tourDate}
            onChange={(e) => setForm((f) => ({ ...f, tourDate: e.target.value }))}
            required
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Yetişkin</label>
            <input
              type="number"
              min={0}
              value={form.adultCount}
              onChange={(e) => setForm((f) => ({ ...f, adultCount: Number(e.target.value) || 0 }))}
            />
          </div>
          <div className="form-group">
            <label>Çocuk</label>
            <input
              type="number"
              min={0}
              value={form.childCount}
              onChange={(e) => setForm((f) => ({ ...f, childCount: Number(e.target.value) || 0 }))}
            />
          </div>
          <div className="form-group">
            <label>Bebek</label>
            <input
              type="number"
              min={0}
              value={form.babyCount}
              onChange={(e) => setForm((f) => ({ ...f, babyCount: Number(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Otel</label>
          <input
            value={form.hotel}
            onChange={(e) => setForm((f) => ({ ...f, hotel: e.target.value }))}
            placeholder="Otel adı"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Tur Başlangıç (otomatik)</label>
            <input type="text" value={tourStart} readOnly style={{ background: '#f5f5f5', cursor: 'default' }} />
          </div>
          <div className="form-group">
            <label>Tur Bitiş (otomatik)</label>
            <input type="text" value={tourEnd} readOnly style={{ background: '#f5f5f5', cursor: 'default' }} />
          </div>
        </div>
        <div className="form-group">
          <label>Not</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            rows={2}
            placeholder="İsteğe bağlı not"
          />
        </div>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="hasService"
            type="checkbox"
            checked={form.hasService}
            onChange={(e) => setForm((f) => ({ ...f, hasService: e.target.checked }))}
          />
          <label htmlFor="hasService" style={{ marginBottom: 0 }}>Servis var</label>
        </div>
        <div className="form-group">
          <label>Ödeme Tipi</label>
          <select
            value={form.paymentType}
            onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value as 'ToPay' | 'FullPaid' | 'Free' }))}
          >
            <option value="ToPay">To Pay</option>
            <option value="FullPaid">Full Paid</option>
            <option value="Free">Free</option>
          </select>
        </div>
        {message && (
          <p className={message.includes('kesildi') ? 'msg-success' : 'msg-error'} style={{ marginBottom: 12 }}>
            {message}
          </p>
        )}
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Kesiliyor...' : 'Bilet Kes'}
        </button>
      </form>
    </div>
  )
}
