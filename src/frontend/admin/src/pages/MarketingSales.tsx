import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchPreReservations, type PreReservationItem } from '../api'

export function MarketingSales() {
  const { token } = useAuth()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [list, setList] = useState<PreReservationItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    if (!token) return
    setLoading(true)
    setError('')
    fetchPreReservations(token, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: 'Satış Yapıldı',
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

  const formatDate = (s: string) => new Date(s).toLocaleString('tr-TR')

  return (
    <div>
      <h1 className="page-title">Pazarlama Satışları</h1>
      <div className="toolbar">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Başlangıç" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Bitiş" />
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
        Toplam {total} satış
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Satış Tarihi (Talep)</th>
              <th>Ad Soyad</th>
              <th>Telefon</th>
              <th>Otel</th>
              <th>Tur Tarihi</th>
              <th>Kişi</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && !loading && (
        <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Kayıt yok.</p>
      )}
    </div>
  )
}

