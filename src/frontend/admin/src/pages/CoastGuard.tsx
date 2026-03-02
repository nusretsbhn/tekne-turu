import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchCoastGuard, type CoastGuardRow } from '../api'

function todayStr() {
  const t = new Date()
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

export function CoastGuard() {
  const { token } = useAuth()
  const [date, setDate] = useState(todayStr())
  const [list, setList] = useState<CoastGuardRow[]>([])
  const [error, setError] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) return
    setError('')
    fetchCoastGuard(token, date).then(setList).catch(() => setError('Liste alınamadı.'))
  }, [token, date])

  const handlePrint = () => {
    if (!printRef.current) return
    const w = window.open('', '_blank')
    if (!w) return
    const title = `${new Date(date).toLocaleDateString('tr-TR')} tarihli Viking Ölüdeniz Yolcu Listesi`
    w.document.write(`
      <!DOCTYPE html><html><head><title>${title}</title>
      <style>body{font-family:system-ui;padding:24px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #000;padding:8px;text-align:left;} th{background:#f0f0f0;}</style>
      </head><body>
      <h1>${title}</h1>
      <table><thead><tr><th>Ad Soyad</th><th>Telefon</th><th>Uyruk</th><th>TC/Pasaport</th><th>Doğum Tarihi</th></tr></thead><tbody>
      ${list.map((r) => `<tr><td>${r.fullName}</td><td>${r.phone ?? '—'}</td><td>${r.nationality}</td><td>${r.idNumber}</td><td>${r.birthDate ? new Date(r.birthDate).toLocaleDateString('tr-TR') : '—'}</td></tr>`).join('')}
      </tbody></table></body></html>`)
    w.document.close()
    w.print()
    w.close()
  }

  return (
    <div>
      <h1 className="page-title">Sahil Güvenlik Listesi</h1>
      <div className="toolbar">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="cg-date">Tarih</label>
          <input id="cg-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto', minWidth: 140 }} />
        </div>
        <button type="button" onClick={handlePrint} className="btn btn-primary">Yazdır / PDF</button>
      </div>
      {error && <p className="msg-error">{error}</p>}
      <p style={{ marginBottom: 8, color: 'var(--color-text-muted)' }}>İlk 115 kişi (kayıt sırasına göre)</p>
      <div className="table-wrap" ref={printRef}>
        <table>
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Telefon</th>
              <th>Uyruk</th>
              <th>TC/Pasaport</th>
              <th>Doğum Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={i}>
                <td>{r.fullName}</td>
                <td>{r.phone ?? '—'}</td>
                <td>{r.nationality}</td>
                <td>{r.idNumber}</td>
                <td>{r.birthDate ? new Date(r.birthDate).toLocaleDateString('tr-TR') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && !error && <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Kayıt yok.</p>}
    </div>
  )
}
