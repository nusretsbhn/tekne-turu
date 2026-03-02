import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchTickets,
  fetchTicket,
  updateTicket,
  ticketFileUrl,
  type TicketListItem,
  type TicketDetail,
} from '../api'

function headers(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export function Biletler() {
  const { token } = useAuth()
  const [ticketNo, setTicketNo] = useState('')
  const [fullName, setFullName] = useState('')
  const [tourDateFrom, setTourDateFrom] = useState('')
  const [tourDateTo, setTourDateTo] = useState('')
  const [status, setStatus] = useState('')
  const [items, setItems] = useState<TicketListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [editId, setEditId] = useState<number | null>(null)
  const [editDetail, setEditDetail] = useState<TicketDetail | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const load = () => {
    if (!token) return
    setLoading(true)
    setError('')
    fetchTickets(token, {
      ticketNo: ticketNo.trim() || undefined,
      fullName: fullName.trim() || undefined,
      tourDateFrom: tourDateFrom || undefined,
      tourDateTo: tourDateTo || undefined,
      status: status || undefined,
      limit: 100,
      offset: 0,
    })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!token) return
    load()
  }, [token])

  useEffect(() => {
    if (!token || editId == null) {
      setEditDetail(null)
      return
    }
    setEditLoading(true)
    fetchTicket(token, editId)
      .then(setEditDetail)
      .catch(() => setEditDetail(null))
      .finally(() => setEditLoading(false))
  }, [token, editId])

  const openEdit = (id: number) => setEditId(id)
  const closeEdit = () => {
    setEditId(null)
    setEditDetail(null)
  }

  const handleDownload = async (id: number, ticketNumber: string) => {
    if (!token) return
    try {
      const res = await fetch(ticketFileUrl(id), { headers: headers(token) })
      if (!res.ok) throw new Error('Dosya alınamadı')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bilet-${ticketNumber}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'İndirilemedi')
    }
  }

  const handleShare = async (id: number) => {
    if (!token) return
    try {
      const res = await fetch(ticketFileUrl(id), { headers: headers(token) })
      if (!res.ok) throw new Error('Dosya alınamadı')
      const blob = await res.blob()
      const file = new File([blob], `bilet-${id}.jpg`, { type: 'image/jpeg' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Bilet',
          files: [file],
        })
      } else {
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      }
    } catch (e) {
      const res = await fetch(ticketFileUrl(id), { headers: headers(token) })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      } else {
        alert(e instanceof Error ? e.message : 'Paylaşılamadı')
      }
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || editId == null || !editDetail) return
    setEditSaving(true)
    try {
      await updateTicket(token, editId, {
        fullName: editDetail.fullName,
        phone: editDetail.phone,
        tourDate: editDetail.tourDate.slice(0, 10),
        adultCount: editDetail.adultCount,
        childCount: editDetail.childCount,
        babyCount: editDetail.babyCount,
        hotel: editDetail.hotel,
        note: editDetail.note,
        hasService: editDetail.hasService,
        paymentType: editDetail.paymentType,
        status: editDetail.status as 'Aktif' | 'İptal',
      })
      closeEdit()
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Güncellenemedi')
    } finally {
      setEditSaving(false)
    }
  }

  const formatDate = (s: string) => (s ? new Date(s).toLocaleDateString('tr-TR') : '')

  return (
    <div>
      <h1 className="page-title">Biletler</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Bilet No</label>
            <input
              type="text"
              value={ticketNo}
              onChange={(e) => setTicketNo(e.target.value)}
              placeholder="000001"
              style={{ width: 100 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Ad Soyad</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ara..."
              style={{ width: 160 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Tur Tarihi (başlangıç)</label>
            <input type="date" value={tourDateFrom} onChange={(e) => setTourDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Tur Tarihi (bitiş)</label>
            <input type="date" value={tourDateTo} onChange={(e) => setTourDateTo(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Durum</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ minWidth: 100 }}>
              <option value="">Tümü</option>
              <option value="Aktif">Aktif</option>
              <option value="İptal">İptal</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Yükleniyor...' : 'Filtrele'}
          </button>
        </div>
      </div>

      {error && <p className="msg-error">{error}</p>}

      <div className="card">
        <p style={{ marginBottom: 12 }}>
          Toplam <strong>{total}</strong> bilet.
        </p>
        {items.length === 0 && !loading && <p style={{ color: 'var(--color-text-muted)' }}>Kayıt yok.</p>}
        {items.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Bilet No</th>
                  <th>Ad Soyad</th>
                  <th>Telefon</th>
                  <th>Tur Tarihi</th>
                  <th>Kişi</th>
                  <th>Ödeme</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td>{t.ticketNumber}</td>
                    <td>{t.fullName}</td>
                    <td>{t.phone}</td>
                    <td>{formatDate(t.tourDate)}</td>
                    <td>{t.adultCount} / {t.childCount} / {t.babyCount}</td>
                    <td>{t.paymentType}</td>
                    <td>{t.status}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {t.filePath && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDownload(t.id, t.ticketNumber)}
                          >
                            İndir
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleShare(t.id)}
                        >
                          Paylaş
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(t.id)}>
                          Düzenle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editId != null && (
        <div className="modal-backdrop" onClick={closeEdit} role="presentation">
          <div className="card modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 style={{ marginTop: 0 }}>Bilet Düzenle</h2>
            {editLoading && <p>Yükleniyor...</p>}
            {editDetail && !editLoading && (
              <form onSubmit={handleSaveEdit}>
                <div className="form-group">
                  <label>Bilet No</label>
                  <input type="text" value={editDetail.ticketNumber} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>Ad Soyad *</label>
                  <input
                    value={editDetail.fullName}
                    onChange={(e) => setEditDetail((d) => d ? { ...d, fullName: e.target.value } : d)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Telefon *</label>
                  <input
                    value={editDetail.phone}
                    onChange={(e) => setEditDetail((d) => d ? { ...d, phone: e.target.value } : d)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tur Tarihi</label>
                  <input
                    type="date"
                    value={editDetail.tourDate.slice(0, 10)}
                    onChange={(e) => setEditDetail((d) => d ? { ...d, tourDate: e.target.value + (d.tourDate.slice(10) || '') } : d)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div className="form-group">
                    <label>Yetişkin</label>
                    <input
                      type="number"
                      min={0}
                      value={editDetail.adultCount}
                      onChange={(e) => setEditDetail((d) => d ? { ...d, adultCount: Number(e.target.value) || 0 } : d)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Çocuk</label>
                    <input
                      type="number"
                      min={0}
                      value={editDetail.childCount}
                      onChange={(e) => setEditDetail((d) => d ? { ...d, childCount: Number(e.target.value) || 0 } : d)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Bebek</label>
                    <input
                      type="number"
                      min={0}
                      value={editDetail.babyCount}
                      onChange={(e) => setEditDetail((d) => d ? { ...d, babyCount: Number(e.target.value) || 0 } : d)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Otel</label>
                  <input
                    value={editDetail.hotel ?? ''}
                    onChange={(e) => setEditDetail((d) => d ? { ...d, hotel: e.target.value || null } : d)}
                  />
                </div>
                <div className="form-group">
                  <label>Not</label>
                  <textarea
                    value={editDetail.note ?? ''}
                    onChange={(e) => setEditDetail((d) => d ? { ...d, note: e.target.value || null } : d)}
                    rows={2}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    id="editHasService"
                    type="checkbox"
                    checked={editDetail.hasService}
                    onChange={(e) => setEditDetail((d) => d ? { ...d, hasService: e.target.checked } : d)}
                  />
                  <label htmlFor="editHasService" style={{ marginBottom: 0 }}>Servis var</label>
                </div>
                <div className="form-group">
                  <label>Ödeme Tipi</label>
                  <select
                    value={editDetail.paymentType}
                    onChange={(e) => setEditDetail((d) => d ? { ...d, paymentType: e.target.value } : d)}
                  >
                    <option value="ToPay">To Pay</option>
                    <option value="FullPaid">Full Paid</option>
                    <option value="Free">Free</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Bilet Durumu</label>
                  <select
                    value={editDetail.status}
                    onChange={(e) => setEditDetail((d) => d ? { ...d, status: e.target.value } : d)}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="İptal">İptal</option>
                  </select>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Kaydettiğinizde bilet görseli yeniden oluşturulur.
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={closeEdit}>
                    İptal
                  </button>
                  <button type="submit" disabled={editSaving} className="btn btn-primary">
                    {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
