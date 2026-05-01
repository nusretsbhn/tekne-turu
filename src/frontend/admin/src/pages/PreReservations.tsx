import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchPreReservations,
  fetchPreReservation,
  updatePreReservation,
  deletePreReservation,
  type PreReservationItem,
  type PreReservationDetail,
} from '../api'

type FilterStatus = '' | 'Yeni' | 'Satış Yapıldı' | 'İptal'

export function PreReservations() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState<FilterStatus>('Yeni')
  const [search, setSearch] = useState('')
  const [list, setList] = useState<PreReservationItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<PreReservationDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [savingDetail, setSavingDetail] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = () => {
    if (!token) return
    setLoading(true)
    setError('')
    fetchPreReservations(token, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: status || undefined,
      search: search || undefined,
      limit: 200,
      offset: 0,
    })
      .then((res) => {
        setList(res.list)
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
    if (!token || detailId == null) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    fetchPreReservation(token, detailId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [token, detailId])

  const openDetail = (id: number) => setDetailId(id)
  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
  }

  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || detailId == null || !detail) return
    setSavingDetail(true)
    try {
      await updatePreReservation(token, detailId, {
        fullName: detail.fullName,
        phone: detail.phone,
        email: detail.email,
        hotelName: detail.hotelName,
        notes: detail.notes,
        status: detail.status,
        tourDate: detail.tourDate.slice(0, 10),
      })
      closeDetail()
      load()
    } catch (err) {
      // basit hata gösterimi
      alert(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSavingDetail(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!token) return
    const ok = window.confirm('Bu ön rezervasyon talebini silmek istediğinize emin misiniz?')
    if (!ok) return
    setDeletingId(id)
    try {
      await deletePreReservation(token, id)
      if (detailId === id) closeDetail()
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silinemedi.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (s: string) => new Date(s).toLocaleString('tr-TR')

  return (
    <div>
      <h1 className="page-title">Ön Rezervasyon Talepleri</h1>
      <div className="toolbar">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Başlangıç" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Bitiş" />
        <select value={status} onChange={(e) => setStatus(e.target.value as FilterStatus)}>
          <option value="">Tümü</option>
          <option value="Yeni">Yeni</option>
          <option value="Satış Yapıldı">Satış Yapıldı</option>
          <option value="İptal">İptal</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ad, telefon, otel, e-posta..."
          aria-label="Ara"
        />
        <button type="button" onClick={load} disabled={loading} className="btn btn-primary">
          {loading ? 'Yükleniyor...' : 'Listele'}
        </button>
      </div>
      {error && <p className="msg-error">{error}</p>}
      <p style={{ marginTop: 4, marginBottom: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
        Toplam {total} kayıt
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Oluşturma</th>
              <th>Ad Soyad</th>
              <th>Telefon</th>
              <th>Otel</th>
              <th>Tur Tarihi</th>
              <th>Kişi</th>
              <th>Durum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{formatDate(p.createdAt)}</td>
                <td>{p.fullName}</td>
                <td>{p.phone}</td>
                <td>{p.hotelName ?? '—'}</td>
                <td>{p.tourDate ? new Date(p.tourDate).toLocaleDateString('tr-TR') : '—'}</td>
                <td>
                  {p.adultCount} Y · {p.childCount} Ç · {p.babyCount} B
                </td>
                <td>{p.status}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => navigate('/bilet-kes', { state: { fromPreReservation: p } })}
                    className="btn btn-primary btn-sm"
                  >
                    Bilet oluştur
                  </button>
                  <button type="button" onClick={() => openDetail(p.id)} className="btn btn-secondary btn-sm">
                    Detay
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="btn btn-secondary btn-sm"
                    disabled={deletingId === p.id}
                  >
                    {deletingId === p.id ? 'Siliniyor...' : 'Sil'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && !loading && (
        <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Kayıt yok.</p>
      )}

      {detailId != null && (
        <div className="modal-backdrop" onClick={closeDetail}>
          <div className="modal-box card-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 className="page-title" style={{ marginTop: 0 }}>
              Talep Detayı
            </h2>
            {detailLoading && <p>Yükleniyor...</p>}
            {!detailLoading && detail && (
              <form onSubmit={handleSaveDetail}>
                <div className="form-group">
                  <label>Ad Soyad</label>
                  <input
                    value={detail.fullName}
                    onChange={(e) => setDetail((d) => (d ? { ...d, fullName: e.target.value } : d))}
                  />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input
                    value={detail.phone}
                    onChange={(e) => setDetail((d) => (d ? { ...d, phone: e.target.value } : d))}
                  />
                </div>
                <div className="form-group">
                  <label>E-posta</label>
                  <input
                    type="email"
                    value={detail.email ?? ''}
                    onChange={(e) =>
                      setDetail((d) => (d ? { ...d, email: e.target.value || null } : d))
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Otel</label>
                  <input
                    value={detail.hotelName ?? ''}
                    onChange={(e) =>
                      setDetail((d) => (d ? { ...d, hotelName: e.target.value || null } : d))
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Tur Tarihi</label>
                  <input
                    type="date"
                    value={detail.tourDate.slice(0, 10)}
                    onChange={(e) =>
                      setDetail((d) => (d ? { ...d, tourDate: e.target.value } : d))
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Durum</label>
                  <select
                    value={detail.status}
                    onChange={(e) =>
                      setDetail((d) => (d ? { ...d, status: e.target.value } : d))
                    }
                  >
                    <option value="Yeni">Yeni</option>
                    <option value="Satış Yapıldı">Satış Yapıldı</option>
                    <option value="İptal">İptal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Not</label>
                  <textarea
                    value={detail.notes ?? ''}
                    onChange={(e) =>
                      setDetail((d) => (d ? { ...d, notes: e.target.value || null } : d))
                    }
                    rows={3}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <button type="submit" disabled={savingDetail} className="btn btn-primary">
                    {savingDetail ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="btn btn-secondary"
                  >
                    Kapat
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

