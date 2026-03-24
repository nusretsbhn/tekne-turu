import { useEffect, useState, type CSSProperties } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchAgencies, fetchAgencyRegistrations, type AgencyItem, type AgencyRegistrationRow } from '../api'

export function Acentalar() {
  const { token } = useAuth()
  const [list, setList] = useState<AgencyItem[]>([])
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | ''>('')
  const [regRows, setRegRows] = useState<AgencyRegistrationRow[]>([])
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [filters, setFilters] = useState({
    search: '',
    tourDate: '',
    service: 'all' as 'all' | 'with' | 'without',
  })

  const load = () => {
    if (!token) return
    fetchAgencies(token)
      .then(setList)
      .catch(() => setList([]))
  }

  useEffect(() => {
    load()
  }, [token])

  useEffect(() => {
    if (!token || selectedAgencyId === '') {
      setRegRows([])
      setRegError('')
      return
    }
    setRegLoading(true)
    setRegError('')
    fetchAgencyRegistrations(token, selectedAgencyId as number)
      .then(setRegRows)
      .catch((e: Error) => {
        setRegRows([])
        setRegError(e.message)
      })
      .finally(() => setRegLoading(false))
  }, [token, selectedAgencyId])

  const normalizedSearch = filters.search.trim().toLowerCase()
  const filteredRows = regRows.filter((r) => {
    if (filters.tourDate && r.tourDate !== filters.tourDate) return false
    if (filters.service === 'with' && !r.useShuttle) return false
    if (filters.service === 'without' && r.useShuttle) return false
    if (!normalizedSearch) return true
    const haystack = `${r.fullName ?? ''} ${r.phone ?? ''} ${r.hotel ?? ''}`.toLowerCase()
    return haystack.includes(normalizedSearch)
  })

  return (
    <div>
      <h1 className="page-title">Acenta Desk Kayıtları</h1>
      <p style={{ marginBottom: 16, color: 'var(--color-text-muted)' }}>
        Acentayı seçin; Desk-Acenta üzerinden bu acenta adıyla yapılan tüm kayıtlar (kişi satırları) listelenir.
      </p>

      <section style={{ marginTop: 8 }}>
        <div className="form-group" style={{ maxWidth: 400 }}>
          <label htmlFor="agency-pick">Acenta seçin</label>
          <select
            id="agency-pick"
            value={selectedAgencyId === '' ? '' : String(selectedAgencyId)}
            onChange={(e) => setSelectedAgencyId(e.target.value === '' ? '' : Number(e.target.value))}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--color-border, #ccc)' }}
          >
            <option value="">— Acenta seçin —</option>
            {list.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {regError && <p className="msg-error">{regError}</p>}
        {selectedAgencyId !== '' && regLoading && <p>Yükleniyor...</p>}
        {selectedAgencyId !== '' && !regLoading && !regError && (
          <>
            {regRows.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', marginTop: 12 }}>Bu acenta için kayıt bulunamadı.</p>
            ) : (
              <div className="card" style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="search">Kelime ara</label>
                    <input
                      id="search"
                      value={filters.search}
                      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                      placeholder="Ad, telefon, otel (içeren)"
                      style={{ minWidth: 220 }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="tour-date">Tur tarihi</label>
                    <input
                      id="tour-date"
                      type="date"
                      value={filters.tourDate}
                      onChange={(e) => setFilters((f) => ({ ...f, tourDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="service-filter">Servis</label>
                    <select
                      id="service-filter"
                      value={filters.service}
                      onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value as 'all' | 'with' | 'without' }))}
                    >
                      <option value="all">Tümü</option>
                      <option value="with">Servisli</option>
                      <option value="without">Servissiz</option>
                    </select>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      fontSize: 15,
                    }}
                  >
                  <thead>
                    <tr>
                      <th style={thStyle}>Tur tarihi</th>
                      <th style={thStyle}>Ad Soyad</th>
                      <th style={thStyle}>Telefon</th>
                      <th style={thStyle}>Kişi sayısı</th>
                      <th style={thStyle}>Otel</th>
                      <th style={thStyle}>Servis</th>
                      <th style={thStyle}>Oluşturma tarihi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, i) => (
                      <tr key={`${r.registrationDate}-${r.tourDate}-${i}`}>
                        <td style={tdStyle}>
                          {r.tourDate
                            ? new Date(r.tourDate + 'T12:00:00').toLocaleDateString('tr-TR')
                            : '—'}
                        </td>
                        <td style={tdStyle}>{r.fullName}</td>
                        <td style={tdStyle}>{r.phone ?? '—'}</td>
                        <td style={tdStyle}>{r.personCount}</td>
                        <td style={tdStyle}>{r.hotel ?? '—'}</td>
                        <td style={tdStyle}>{r.useShuttle ? 'Var' : 'Yok'}</td>
                        <td style={tdStyle}>
                          {r.registrationDate
                            ? new Date(r.registrationDate).toLocaleString('tr-TR')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                {filteredRows.length === 0 && (
                  <p style={{ color: 'var(--color-text-muted)', marginTop: 12 }}>
                    Filtreye uygun kayıt bulunamadı.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

const thStyle: CSSProperties = {
  border: '1px solid #d1d5db',
  padding: '10px 8px',
  textAlign: 'left',
  background: '#f3f4f6',
  fontWeight: 700,
}

const tdStyle: CSSProperties = {
  border: '1px solid #d1d5db',
  padding: '8px',
}
