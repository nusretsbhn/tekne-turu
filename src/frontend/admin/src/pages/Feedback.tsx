import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ContactActionButtons } from '../components/ContactActionButtons'
import { fetchFeedbackList, fetchFeedback, markFeedbackProcessed, type FeedbackItem } from '../api'

export function Feedback() {
  const { token } = useAuth()
  const [list, setList] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', type: '' })
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<FeedbackItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [marking, setMarking] = useState(false)

  const load = () => {
    if (!token) return
    setLoading(true)
    fetchFeedbackList(token, {
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      type: filters.type || undefined,
    })
      .then(setList)
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
    fetchFeedback(token, detailId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [token, detailId])

  const openDetail = (id: number) => setDetailId(id)
  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
  }

  const handleMarkProcessed = async () => {
    if (!token || detailId == null) return
    setMarking(true)
    try {
      await markFeedbackProcessed(token, detailId)
      setList((prev) => prev.map((f) => (f.id === detailId ? { ...f, status: 'İşleme alındı', processedAt: new Date().toISOString() } : f)))
      closeDetail()
    } finally {
      setMarking(false)
    }
  }

  const rowBg = (status: string) =>
    status === 'Yeni' ? { background: 'rgba(0, 128, 0, 0.12)' } : { background: 'rgba(200, 0, 0, 0.08)' }

  return (
    <div>
      <h1 className="page-title">Dilek / İstek / Şikayet</h1>
      <div className="toolbar">
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} aria-label="Başlangıç" />
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} aria-label="Bitiş" />
        <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
          <option value="">Tümü</option>
          <option value="Dilek">Dilek</option>
          <option value="İstek">İstek</option>
          <option value="Şikayet">Şikayet</option>
        </select>
        <button type="button" onClick={load} disabled={loading} className="btn btn-primary">
          {loading ? 'Yükleniyor...' : 'Listele'}
        </button>
      </div>

      <div className="table-wrap">
        <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Tür</th>
            <th>Telefon</th>
            <th>Mesaj (özet)</th>
            <th>Durum</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((f) => (
            <tr key={f.id} style={rowBg(f.status)}>
              <td>{new Date(f.createdAt).toLocaleString('tr-TR')}</td>
              <td>{f.type}</td>
              <td>{f.customerPhone ?? '—'}</td>
              <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.message}>{f.message}</td>
              <td>{f.status}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => openDetail(f.id)} className="btn btn-secondary btn-sm">İncele</button>
                  <ContactActionButtons phone={f.customerPhone} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      {list.length === 0 && !loading && <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Kayıt yok.</p>}

      {detailId != null && (
        <div className="modal-backdrop" onClick={closeDetail}>
          <div className="modal-box card-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2 className="page-title" style={{ marginTop: 0 }}>Kayıt detayı</h2>
            {detailLoading && <p>Yükleniyor...</p>}
            {!detailLoading && detail && (
              <>
                <p><strong>Tarih:</strong> {new Date(detail.createdAt).toLocaleString('tr-TR')}</p>
                <p><strong>Tür:</strong> {detail.type}</p>
                <p><strong>Durum:</strong> {detail.status}</p>
                {(detail.customerName ?? detail.customerId != null) && (
                  <p>
                    <strong>Müşteri:</strong> {detail.customerName ?? `#${detail.customerId}`}
                    {detail.customerPhone && (
                      <>
                        {' '}
                        <strong>Telefon:</strong> {detail.customerPhone}
                      </>
                    )}
                  </p>
                )}
                <p><strong>Mesaj:</strong></p>
                <div style={{ whiteSpace: 'pre-wrap', padding: 12, background: 'var(--color-bg)', borderRadius: 'var(--radius)', marginBottom: 16 }}>{detail.message}</div>
                {detail.status === 'Yeni' && (
                  <button type="button" onClick={handleMarkProcessed} disabled={marking} className="btn btn-primary">
                    {marking ? 'Kaydediliyor...' : 'İşleme alındı olarak işaretle'}
                  </button>
                )}
              </>
            )}
            <button type="button" onClick={closeDetail} className="btn btn-secondary" style={{ marginTop: 16, marginLeft: 8 }}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  )
}
