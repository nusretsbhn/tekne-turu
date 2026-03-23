import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSurveyReports, type SurveyRecentResponse } from '../api'

function parseAnswers(json: string): string[] {
  try {
    const arr = JSON.parse(json) as string[]
    return Array.isArray(arr) ? arr.filter(Boolean) : []
  } catch {
    return []
  }
}

export function SurveyReports() {
  const { token } = useAuth()
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<{
    totalResponses: number
    byDate: { date: string; count: number }[]
    topAnswers: { answer: string; count: number }[]
    recent: SurveyRecentResponse[]
  } | null>(null)

  const load = () => {
    if (!token) return
    setLoading(true)
    setError('')
    fetchSurveyReports(token, {
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  const totalAnswers = useMemo(
    () => (data?.topAnswers ?? []).reduce((sum, x) => sum + x.count, 0),
    [data],
  )

  return (
    <div>
      <h1 className="page-title">Anket Raporları</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
        /landing/thanks anket yanıtlarının genel özeti.
      </p>

      <div className="toolbar">
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} aria-label="Başlangıç" />
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} aria-label="Bitiş" />
        <button type="button" onClick={load} disabled={loading} className="btn btn-primary">
          {loading ? 'Yükleniyor...' : 'Listele'}
        </button>
      </div>

      {error && <p className="msg-error">{error}</p>}
      {loading && <p>Yükleniyor...</p>}

      {!loading && data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="card card-md"><strong>Toplam yanıt</strong><div style={{ marginTop: 6, fontSize: 24 }}>{data.totalResponses}</div></div>
            <div className="card card-md"><strong>Toplam seçilen cevap</strong><div style={{ marginTop: 6, fontSize: 24 }}>{totalAnswers}</div></div>
            <div className="card card-md"><strong>Farklı cevap metni</strong><div style={{ marginTop: 6, fontSize: 24 }}>{data.topAnswers.length}</div></div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Güne göre yanıt adedi</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Tarih</th><th>Adet</th></tr></thead>
                <tbody>
                  {data.byDate.map((x) => (
                    <tr key={x.date}>
                      <td>{new Date(x.date + 'T12:00:00').toLocaleDateString('tr-TR')}</td>
                      <td>{x.count}</td>
                    </tr>
                  ))}
                  {data.byDate.length === 0 && <tr><td colSpan={2}>Kayıt yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>En çok seçilen cevaplar</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Cevap</th><th>Seçilme</th></tr></thead>
                <tbody>
                  {data.topAnswers.map((x, i) => (
                    <tr key={`${x.answer}-${i}`}>
                      <td>{x.answer}</td>
                      <td>{x.count}</td>
                    </tr>
                  ))}
                  {data.topAnswers.length === 0 && <tr><td colSpan={2}>Kayıt yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Son yanıtlar (ham)</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Tarih</th><th>Cevaplar</th></tr></thead>
                <tbody>
                  {data.recent.map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.createdAt).toLocaleString('tr-TR')}</td>
                      <td>{parseAnswers(r.answersJson).join(' | ') || '—'}</td>
                    </tr>
                  ))}
                  {data.recent.length === 0 && <tr><td colSpan={2}>Kayıt yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

