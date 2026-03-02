import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchDashboard, type DashboardStats } from '../api'

function todayStr() {
  const t = new Date()
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

export function Dashboard() {
  const { token } = useAuth()
  const [date, setDate] = useState(todayStr)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setError('')
    fetchDashboard(token, date).then(setStats).catch(() => setError('Veriler alınamadı.'))
  }, [token, date])

  const isToday = date === todayStr()
  useEffect(() => {
    if (!token || !isToday) return
    const t = setInterval(() => {
      fetchDashboard(token, date).then(setStats).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [token, date, isToday])

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="toolbar">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="dashboard-date">Tarih</label>
          <input id="dashboard-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto', minWidth: 140 }} />
        </div>
      </div>
      {error && <p className="msg-error">{error}</p>}
      {stats && (
        <>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div className="card" style={{ minWidth: 120 }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Toplam kayıtlı</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalRegistered}</div>
            </div>
            <div className="card" style={{ minWidth: 120 }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Binen</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{stats.totalCheckedIn}</div>
            </div>
            <div className="card" style={{ minWidth: 120 }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Yetişkin</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stats.adultCheckedIn} / {stats.adultTotal}</div>
            </div>
            <div className="card" style={{ minWidth: 120 }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Çocuk</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stats.childCheckedIn} / {stats.childTotal}</div>
            </div>
            <div className="card" style={{ minWidth: 120 }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Bebek</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stats.babyCheckedIn} / {stats.babyTotal}</div>
            </div>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Bu günün anlık müşteri listesi</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ad Soyad</th>
                    <th>Telefon</th>
                    <th>Acenta</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.todayCustomers ?? []).map((c, i) => (
                    <tr key={i}>
                      <td>{c.fullName}</td>
                      <td>{c.phone ?? '—'}</td>
                      <td>{c.agencyName ?? '—'}</td>
                      <td>{c.checkedIn ? 'Bindi' : 'Bekliyor'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(stats.todayCustomers ?? []).length === 0 && <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Bu tarihte kayıt yok.</p>}
          </div>

          <div>
            <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Son 7 gün</h2>
            <div className="table-wrap" style={{ maxWidth: 400 }}>
              <table style={{ minWidth: 0 }}>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th style={{ textAlign: 'right' }}>Kayıt</th>
                    <th style={{ textAlign: 'right' }}>Binen</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.last7Days.map((d) => (
                    <tr key={d.date}>
                      <td>{new Date(d.date).toLocaleDateString('tr-TR')}</td>
                      <td style={{ textAlign: 'right' }}>{d.total}</td>
                      <td style={{ textAlign: 'right' }}>{d.checkedIn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
