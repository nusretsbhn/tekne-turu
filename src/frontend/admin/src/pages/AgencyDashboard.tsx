import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchAcentaDashboard, type AcentaDashboardResult } from '../api'

function todayStr() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

export function AgencyDashboard() {
  const { token } = useAuth()
  const [date, setDate] = useState(todayStr())
  const [data, setData] = useState<AcentaDashboardResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')
    fetchAcentaDashboard(token, date).then(setData).catch((e: Error) => setError(e.message)).finally(() => setLoading(false))
  }, [token, date])

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="toolbar">
        <div className="form-group">
          <label>Tarih</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      {error && <p className="msg-error">{error}</p>}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Toplam girilen yolcu</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{data?.totalPassengerCount ?? 0}</div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Seçili tarih yolcu listesi</h3>
        {loading && <p>Yükleniyor...</p>}
        {!loading && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Telefon</th>
                  <th>Otel</th>
                  <th>Servis</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {(data?.list ?? []).map((r) => (
                  <tr key={r.id}>
                    <td>{r.fullName}</td>
                    <td>{r.phone ?? '-'}</td>
                    <td>{r.hotel ?? '-'}</td>
                    <td>{r.useShuttle ? 'Var' : 'Yok'}</td>
                    <td>{r.checkedIn ? 'Bindi' : 'Binmedi'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
