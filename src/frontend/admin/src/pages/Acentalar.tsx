import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchAgencies, fetchAgencyRegistrations, fetchSettings, type AgencyItem, type AgencyRegistrationRow } from '../api'

export function Acentalar() {
  const { token } = useAuth()
  const [list, setList] = useState<AgencyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | ''>('')
  const [regRows, setRegRows] = useState<AgencyRegistrationRow[]>([])
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [baseUrl, setBaseUrl] = useState(
    import.meta.env.PROD ? '/acenta/' : 'http://localhost:5176',
  )

  useEffect(() => {
    if (!token) return
    fetchSettings(token)
      .then((s) => {
        const url = s?.DeskAcentaBaseUrl?.trim()
        if (url) setBaseUrl(url)
      })
      .catch(() => {})
  }, [token])

  const load = () => {
    if (!token) return
    setLoading(true)
    setError('')
    fetchAgencies(token)
      .then(setList)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
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

  const getLink = (shortCode: string) => `${baseUrl.replace(/\/?$/, '')}/?agency=${shortCode}`

  const copyLink = (shortCode: string) => {
    navigator.clipboard.writeText(getLink(shortCode)).then(() => {
      // optional: toast
    }).catch(() => {})
  }

  return (
    <div>
      <h1 className="page-title">Acentalar</h1>
      <p style={{ marginBottom: 16, color: 'var(--color-text-muted)' }}>
        Kayıtlı acentalar ve Desk-Acenta linkleri. Linki kopyalayıp acentaya gönderin.
      </p>
      {error && <p className="msg-error">{error}</p>}
      {loading && <p>Yükleniyor...</p>}
      {!loading && list.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Henüz acenta kaydı yok. Acenta Kaydı sekmesinden ekleyebilirsiniz.</p>}
      {!loading && list.length > 0 && (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Acenta Adı</th>
                  <th>Yetkili</th>
                  <th>Telefon</th>
                  <th>E-posta</th>
                  <th>Desk-Acenta linki</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.contactFullName}</td>
                    <td>{a.phone}</td>
                    <td>{a.email ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          readOnly
                          value={getLink(a.shortCode)}
                          style={{ width: 220, fontSize: 12 }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => copyLink(a.shortCode)}
                        >
                          Kopyala
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section style={{ marginTop: 40 }}>
        <h2 className="page-title" style={{ fontSize: 20, marginBottom: 12 }}>
          Acenta desk kayıtları
        </h2>
        <p style={{ marginBottom: 16, color: 'var(--color-text-muted)', fontSize: 14 }}>
          Acentayı seçin; Desk-Acenta üzerinden bu acenta adıyla yapılan tüm kayıtlar (kişi satırları) listelenir.
        </p>
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
              <div className="card" style={{ marginTop: 16, overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ad Soyad</th>
                      <th>TC / Pasaport</th>
                      <th>Telefon</th>
                      <th>Tur tarihi</th>
                      <th>Kişi sayısı</th>
                      <th>Kayıt tarihi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regRows.map((r, i) => (
                      <tr key={`${r.idNumber}-${r.tourDate}-${i}`}>
                        <td>{r.fullName}</td>
                        <td>{r.idNumber}</td>
                        <td>{r.phone ?? '—'}</td>
                        <td>
                          {r.tourDate
                            ? new Date(r.tourDate + 'T12:00:00').toLocaleDateString('tr-TR')
                            : '—'}
                        </td>
                        <td>{r.personCount}</td>
                        <td>
                          {r.registrationDate
                            ? new Date(r.registrationDate).toLocaleString('tr-TR')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
