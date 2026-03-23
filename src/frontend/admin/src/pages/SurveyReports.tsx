import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSurveyReports, type SurveyQuestionBreakdown, type SurveyRecentResponse } from '../api'

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
    questionBreakdown: SurveyQuestionBreakdown[]
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

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Soru bazlı yüzde dağılımı</h2>
            {(data.questionBreakdown ?? []).map((q) => (
              <div key={q.questionIndex} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {q.questionIndex}. {q.question}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  Yanıtlayan: {q.answeredCount}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Cevap</th><th>Adet</th><th>Yüzde</th></tr></thead>
                    <tbody>
                      {q.options.map((opt, i) => (
                        <tr key={`${q.questionIndex}-${i}-${opt.answer}`}>
                          <td>{opt.answer}</td>
                          <td>{opt.count}</td>
                          <td>%{opt.percentage.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                        </tr>
                      ))}
                      {q.options.length === 0 && <tr><td colSpan={3}>Bu soru için kayıt yok.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {(data.questionBreakdown ?? []).length === 0 && <p>Kayıt yok.</p>}
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

