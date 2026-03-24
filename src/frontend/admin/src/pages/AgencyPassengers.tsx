import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { deleteAcentaPassenger, fetchAcentaPassengers, updateAcentaPassenger, type AcentaPassengerRow } from '../api'

function todayStr() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

export function AgencyPassengers() {
  const { token } = useAuth()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [service, setService] = useState<'all' | 'with' | 'without'>('all')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AcentaPassengerRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<AcentaPassengerRow | null>(null)

  const load = () => {
    if (!token) return
    setLoading(true); setError('')
    fetchAcentaPassengers(token, {
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      useShuttle: service === 'all' ? undefined : service === 'with',
      page,
      limit: 25,
    }).then((r) => {
      setRows(r.items); setTotal(r.total)
    }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token, search, dateFrom, dateTo, service, page])
  const maxPage = useMemo(() => Math.max(1, Math.ceil(total / 25)), [total])

  const canEdit = (tourDate: string) => tourDate >= todayStr()
  const rowBg = (r: AcentaPassengerRow) => (r.tourDate > todayStr() ? '#fff' : r.checkedIn ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)')

  return (
    <div>
      <h1 className="page-title">Yolcular</h1>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="toolbar">
          <input placeholder="Ad, telefon, otel (içeren)" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} />
          <input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value) }} />
          <input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value) }} />
          <select value={service} onChange={(e) => { setPage(1); setService(e.target.value as 'all' | 'with' | 'without') }}>
            <option value="all">Servis: Tümü</option><option value="with">Servisli</option><option value="without">Servissiz</option>
          </select>
        </div>
      </div>
      {error && <p className="msg-error">{error}</p>}
      {loading ? <p>Yükleniyor...</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tur tarihi</th><th>Ad-Soyad</th><th>Telefon</th><th>Kişi Türü</th><th>Otel</th><th>Servis</th><th>Durum</th><th>İşlemler</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ backgroundColor: rowBg(r) }}>
                  <td>{r.tourDate}</td><td>{r.fullName}</td><td>{r.phone ?? '-'}</td><td>{r.ageCategory}</td><td>{r.hotel ?? '-'}</td><td>{r.useShuttle ? 'Var' : 'Yok'}</td><td>{r.checkedIn ? 'Bindi' : 'Binmedi'}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" disabled={!canEdit(r.tourDate)} onClick={() => setEditing(r)}>Düzenle</button>{' '}
                    <button className="btn btn-secondary btn-sm" disabled={!canEdit(r.tourDate)} onClick={async () => { if (!token || !confirm('Silinsin mi?')) return; await deleteAcentaPassenger(token, r.id); load() }}>Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Önceki</button>
        <span>{page} / {maxPage}</span>
        <button className="btn btn-secondary btn-sm" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>Sonraki</button>
      </div>

      {editing && (
        <div className="modal-backdrop">
          <div className="modal-box card">
            <h3 style={{ marginTop: 0 }}>Yolcu Düzenle</h3>
            <div className="form-row">
              <div className="form-group"><label>Tur Tarihi</label><input type="date" value={editing.tourDate} onChange={(e) => setEditing({ ...editing, tourDate: e.target.value })} /></div>
              <div className="form-group"><label>Ad Soyad</label><input value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} /></div>
              <div className="form-group"><label>Telefon</label><input value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div className="form-group"><label>Otel</label><input value={editing.hotel ?? ''} onChange={(e) => setEditing({ ...editing, hotel: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Vazgeç</button>
              <button className="btn btn-primary" onClick={async () => {
                if (!token) return
                await updateAcentaPassenger(token, editing.id, {
                  tourDate: editing.tourDate,
                  fullName: editing.fullName,
                  idNumber: editing.idNumber,
                  nationality: editing.nationality,
                  birthDate: editing.birthDate,
                  ageCategory: editing.ageCategory,
                  phone: editing.phone,
                  email: editing.email,
                  accommodationPlace: editing.hotel,
                  kvkkConsent: editing.kvkkConsent,
                  smsConsent: editing.smsConsent,
                  useShuttle: editing.useShuttle,
                })
                setEditing(null); load()
              }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
