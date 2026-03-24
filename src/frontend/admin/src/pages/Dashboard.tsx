import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchDashboard, fetchServiceList, type DashboardStats, type ServiceListItem } from '../api'
import jsPDF from 'jspdf'

function todayStr() {
  const t = new Date()
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

export function Dashboard() {
  const { token } = useAuth()
  const [date, setDate] = useState(todayStr)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [serviceListDate, setServiceListDate] = useState(todayStr)
  const [serviceList, setServiceList] = useState<ServiceListItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setError('')
    fetchDashboard(token, date).then(setStats).catch(() => setError('Veriler alınamadı.'))
  }, [token, date])

  useEffect(() => {
    if (!token) return
    fetchServiceList(token, serviceListDate).then(setServiceList).catch(() => setServiceList([]))
  }, [token, serviceListDate])

  const isToday = date === todayStr()
  useEffect(() => {
    if (!token || !isToday) return
    const t = setInterval(() => {
      fetchDashboard(token, date).then(setStats).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [token, date, isToday])

  const exportServiceListPdf = () => {
    if (serviceList.length === 0) return
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const margin = 10
    let y = 14

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Servis Listesi', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Tarih: ${new Date(serviceListDate + 'T12:00:00').toLocaleDateString('tr-TR')}`, margin, y + 6)
    y += 14

    const headers = ['Ad Soyad', 'Telefon', 'Otel', 'Kisi', 'Alinis Saati']
    const colWidths = [70, 45, 90, 20, 45]
    const rowHeight = 8

    let x = margin
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    headers.forEach((h, i) => {
      doc.rect(x, y, colWidths[i], rowHeight)
      doc.text(h, x + 2, y + 5.5)
      x += colWidths[i]
    })
    y += rowHeight

    doc.setFont('helvetica', 'normal')
    serviceList.forEach((row) => {
      if (y + rowHeight > 200) {
        doc.addPage()
        y = 14
      }
      const values = [
        row.fullName || '—',
        row.phone || '—',
        row.hotel || '—',
        String(row.personCount ?? 0),
        row.pickupTime || '—',
      ]
      let cellX = margin
      values.forEach((val, i) => {
        doc.rect(cellX, y, colWidths[i], rowHeight)
        const maxLen = i === 2 ? 35 : 22
        const text = val.length > maxLen ? `${val.slice(0, maxLen - 1)}…` : val
        doc.text(text, cellX + 2, y + 5.5)
        cellX += colWidths[i]
      })
      y += rowHeight
    })

    const safeDate = serviceListDate.replace(/-/g, '')
    doc.save(`servis-listesi-${safeDate}.pdf`)
  }

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

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
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
            <div>
              <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Servis listesi</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 8, flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="service-list-date">Tarih</label>
                  <input
                    id="service-list-date"
                    type="date"
                    value={serviceListDate}
                    onChange={(e) => setServiceListDate(e.target.value)}
                    style={{ width: 'auto', minWidth: 140 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={exportServiceListPdf}
                  disabled={serviceList.length === 0}
                  className="btn btn-sm"
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: '1px solid #b91c1c',
                    minWidth: 80,
                    height: 40,
                    opacity: serviceList.length === 0 ? 0.6 : 1,
                    cursor: serviceList.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  PDF
                </button>
              </div>
              <div className="table-wrap" style={{ maxWidth: 520 }}>
                <table style={{ minWidth: 0 }}>
                  <thead>
                    <tr>
                      <th>Ad Soyad</th>
                      <th>Telefon</th>
                      <th>Otel</th>
                      <th style={{ textAlign: 'right' }}>Kişi</th>
                      <th>Alınış Saati</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceList.map((row, i) => (
                      <tr key={i}>
                        <td>{row.fullName}</td>
                        <td>{row.phone ?? '—'}</td>
                        <td>{row.hotel ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>{row.personCount}</td>
                        <td>{row.pickupTime ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {serviceList.length === 0 && <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Bu tarihte servis kaydı yok.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
