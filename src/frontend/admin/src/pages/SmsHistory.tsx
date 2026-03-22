import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ContactActionButtons } from '../components/ContactActionButtons'
import { fetchSmsLog, fetchSmsLogById, type SmsLogItem, type SmsLogDetail } from '../api'

export function SmsHistory() {
  const { token } = useAuth()
  const [list, setList] = useState<SmsLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [nameSearch, setNameSearch] = useState('')
  const [detail, setDetail] = useState<SmsLogDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = () => {
    if (!token) return
    setLoading(true)
    fetchSmsLog(token, { limit: 10, name: nameSearch.trim() || undefined })
      .then((r) => { setList(r.list); setTotal(r.total); })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  const openDetail = (id: string) => {
    if (!token) return
    setDetailLoading(true)
    setDetail(null)
    fetchSmsLogById(token, id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }

  const closeDetail = () => { setDetail(null) }

  return (
    <div>
      <h1 className="page-title">SMS Geçmişi</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 16, fontSize: 14 }}>Son 10 SMS. İsimle arayıp ilgili kayıtları görebilir, &quot;Görüntüle&quot; ile tüm log detayını açabilirsiniz.</p>
      <div className="toolbar">
        <input
          type="text"
          placeholder="Ad / soyad ile ara"
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          aria-label="Ad soyad ara"
        />
        <button type="button" onClick={load} disabled={loading} className="btn btn-primary">
          {loading ? 'Yükleniyor...' : 'Ara'}
        </button>
      </div>
      {loading && <p>Yükleniyor...</p>}
      {!loading && (
        <>
          <p style={{ marginBottom: 8, color: 'var(--color-text-muted)', fontSize: 14 }}>Toplam {total} kayıt (listede en fazla 10)</p>
          <div className="table-wrap">
            <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Telefon</th>
                <th>Ad Soyad</th>
                <th>Şablon</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id}>
                  <td>{l.sentAt ? new Date(l.sentAt).toLocaleString('tr-TR') : (l.createdAt ? new Date(l.createdAt).toLocaleString('tr-TR') : '—')}</td>
                  <td>{l.phone}</td>
                  <td>{l.customerFullName ?? '—'}</td>
                  <td>{l.templateKey}</td>
                  <td>{l.status}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => openDetail(l.id)} className="btn btn-secondary btn-sm">Görüntüle</button>
                      <ContactActionButtons phone={l.phone} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          {list.length === 0 && <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Kayıt yok.</p>}
        </>
      )}

      {/* Popup: tüm log kaydı */}
      {(detail != null || detailLoading) && (
        <div className="modal-backdrop" onClick={closeDetail} role="dialog" aria-modal="true">
          <div className="modal-box card-lg" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>SMS log detayı</strong>
              <button type="button" onClick={closeDetail} className="btn btn-secondary btn-sm">Kapat</button>
            </div>
            <div style={{ padding: 16 }}>
              {detailLoading && <p>Yükleniyor...</p>}
              {!detailLoading && detail && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666', width: 160 }}>Tarih (oluşturma)</td><td style={{ padding: '8px 0' }}>{new Date(detail.createdAt).toLocaleString('tr-TR')}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666' }}>Gönderim zamanı</td><td style={{ padding: '8px 0' }}>{detail.sentAt ? new Date(detail.sentAt).toLocaleString('tr-TR') : '—'}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666' }}>Telefon</td><td style={{ padding: '8px 0' }}>{detail.phone}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666' }}>Ad Soyad</td><td style={{ padding: '8px 0' }}>{detail.customerFullName ?? '—'}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666' }}>Şablon</td><td style={{ padding: '8px 0' }}>{detail.templateKey}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666' }}>Durum</td><td style={{ padding: '8px 0' }}>{detail.status}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666' }}>Netgsm kod (code)</td><td style={{ padding: '8px 0' }}>{detail.netgsmResponseCode ?? '—'}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666' }}>Netgsm mesaj ID (bulkid)</td><td style={{ padding: '8px 0' }}>{detail.netgsmMessageId ?? '—'}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666' }}>Teslimat raporu zamanı</td><td style={{ padding: '8px 0' }}>{detail.deliveryReportAt ? new Date(detail.deliveryReportAt).toLocaleString('tr-TR') : '—'}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666' }}>Hata kodu</td><td style={{ padding: '8px 0' }}>{detail.errorCode ?? '—'}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666' }}>Hata mesajı</td><td style={{ padding: '8px 0' }}>{detail.errorMessage ?? '—'}</td></tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 0', color: '#666', verticalAlign: 'top' }}>Mesaj içeriği</td><td style={{ padding: '8px 0', wordBreak: 'break-word' }}>{detail.messageContent || '—'}</td></tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
