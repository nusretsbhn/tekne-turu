import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSettings, createAgency, fetchAgencies, type AgencyItem } from '../api'

export function AcentaKaydi() {
  const { token } = useAuth()
  const [form, setForm] = useState({
    name: '',
    contactFullName: '',
    phone: '',
    email: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [agencies, setAgencies] = useState<AgencyItem[]>([])
  const [agenciesLoading, setAgenciesLoading] = useState(false)
  const [agenciesError, setAgenciesError] = useState('')
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

  const loadAgencies = () => {
    if (!token) return
    setAgenciesLoading(true)
    setAgenciesError('')
    fetchAgencies(token)
      .then(setAgencies)
      .catch((e: Error) => setAgenciesError(e.message))
      .finally(() => setAgenciesLoading(false))
  }

  useEffect(() => {
    loadAgencies()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!form.name.trim()) {
      setMessage('Acenta adı giriniz.')
      return
    }
    if (!form.contactFullName.trim()) {
      setMessage('Yetkili ad soyad giriniz.')
      return
    }
    if (!form.phone.trim()) {
      setMessage('Telefon giriniz.')
      return
    }
    setSubmitting(true)
    setMessage('')
    setCreatedLink(null)
    try {
      const res = await createAgency(token, {
        name: form.name.trim(),
        contactFullName: form.contactFullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
      })
      const link = `${baseUrl.replace(/\/?$/, '')}/?agency=${res.shortCode}`
      setCreatedLink(link)
      setMessage('Acenta kaydedildi. Aşağıdaki linki acentaya gönderin; bu linkten girenler Acenta Adı alanını değiştiremez.')
      setForm({ name: '', contactFullName: '', phone: '', email: '' })
      loadAgencies()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Kayıt yapılamadı.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyLink = () => {
    if (!createdLink) return
    navigator.clipboard.writeText(createdLink).then(() => {
      setMessage('Link kopyalandı.')
    }).catch(() => {})
  }

  const getLink = (shortCode: string) => `${baseUrl.replace(/\/?$/, '')}/?agency=${shortCode}`

  const copyAgencyLink = (shortCode: string) => {
    navigator.clipboard.writeText(getLink(shortCode)).then(() => {
      setMessage('Link kopyalandı.')
    }).catch(() => {})
  }

  return (
    <div>
      <h1 className="page-title">Acenta Kaydı</h1>
      <p style={{ marginBottom: 16, color: 'var(--color-text-muted)' }}>
        Yeni acenta ekleyin. Kayıt sonrası oluşan linki acentaya verin; bu linkten Desk-Acenta sayfasına girildiğinde acenta adı otomatik dolar ve değiştirilemez.
      </p>
      <div className="card card-md" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
          <div className="form-group">
            <label>Acenta Adı *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Acenta veya şirket adı"
              required
            />
          </div>
          <div className="form-group">
            <label>Yetkili Kişi Ad-Soyad *</label>
            <input
              value={form.contactFullName}
              onChange={(e) => setForm((f) => ({ ...f, contactFullName: e.target.value }))}
              placeholder="Ad Soyad"
              required
            />
          </div>
          <div className="form-group">
            <label>Telefon *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="5xx xxx xx xx"
              required
            />
          </div>
          <div className="form-group">
            <label>E-posta</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="ornek@acenta.com"
            />
          </div>
          {message && (
            <p className={createdLink ? 'msg-success' : 'msg-error'} style={{ marginBottom: 12 }}>
              {message}
            </p>
          )}
          {createdLink && (
            <div className="card" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Desk-Acenta linki</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  readOnly
                  value={createdLink}
                  style={{ flex: 1, minWidth: 200, fontSize: 13 }}
                />
                <button type="button" className="btn btn-secondary" onClick={copyLink}>
                  Kopyala
                </button>
              </div>
            </div>
          )}
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Kaydediliyor...' : 'Acenta Kaydet'}
          </button>
        </form>
      </div>

      <div className="card card-md">
        <h2 className="page-title" style={{ fontSize: 20, marginBottom: 12 }}>Acentalar</h2>
        <p style={{ marginBottom: 16, color: 'var(--color-text-muted)' }}>
          Kayıtlı acentalar ve Desk-Acenta linkleri. Linki kopyalayıp acentaya gönderin.
        </p>
        {agenciesError && <p className="msg-error">{agenciesError}</p>}
        {agenciesLoading && <p>Yükleniyor...</p>}
        {!agenciesLoading && agencies.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)' }}>Henüz acenta kaydı yok.</p>
        )}
        {!agenciesLoading && agencies.length > 0 && (
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
                {agencies.map((a) => (
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
                          onClick={() => copyAgencyLink(a.shortCode)}
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
        )}
      </div>
    </div>
  )
}
