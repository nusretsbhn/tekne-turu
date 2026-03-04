import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchAgencies, fetchSettings, type AgencyItem } from '../api'

export function Acentalar() {
  const { token } = useAuth()
  const [list, setList] = useState<AgencyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

  const getLink = (shortCode: string) => `${baseUrl.replace(/\/$/, '')}?agency=${shortCode}`

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
    </div>
  )
}
