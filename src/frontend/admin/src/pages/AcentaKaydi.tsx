import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSettings, createAgency, fetchAgencies, updateAgency, deleteAgency, type AgencyItem } from '../api'

export function AcentaKaydi() {
  const { token } = useAuth()
  const [form, setForm] = useState({
    name: '',
    contactFullName: '',
    phone: '',
    email: '',
    username: '',
    password: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [agencies, setAgencies] = useState<AgencyItem[]>([])
  const [agenciesLoading, setAgenciesLoading] = useState(false)
  const [agenciesError, setAgenciesError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', contactFullName: '', phone: '', email: '' })
  const [rowBusyId, setRowBusyId] = useState<number | null>(null)
  const [listFilters, setListFilters] = useState({ name: '', contact: '', phone: '' })
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
    if (!form.username.trim()) {
      setMessage('Kullanıcı adı giriniz.')
      return
    }
    if (!form.password.trim() || form.password.trim().length < 6) {
      setMessage('Şifre en az 6 karakter olmalıdır.')
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
        username: form.username.trim(),
        password: form.password,
      })
      const link = `${baseUrl.replace(/\/?$/, '')}/?agency=${res.shortCode}`
      setCreatedLink(link)
      setMessage('Acenta kaydedildi. Aşağıdaki linki acentaya gönderin; bu linkten girenler Acenta Adı alanını değiştiremez.')
      setForm({ name: '', contactFullName: '', phone: '', email: '', username: '', password: '' })
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

  const startEdit = (a: AgencyItem) => {
    setEditingId(a.id)
    setEditForm({
      name: a.name ?? '',
      contactFullName: a.contactFullName ?? '',
      phone: a.phone ?? '',
      email: a.email ?? '',
    })
  }

  const saveEdit = async (id: number) => {
    if (!token) return
    if (!editForm.name.trim() || !editForm.contactFullName.trim() || !editForm.phone.trim()) {
      setMessage('Acenta adı, yetkili ve telefon zorunludur.')
      return
    }
    setRowBusyId(id)
    setMessage('')
    try {
      await updateAgency(token, id, {
        name: editForm.name.trim(),
        contactFullName: editForm.contactFullName.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || null,
      })
      setEditingId(null)
      setMessage('Acenta güncellendi.')
      loadAgencies()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Güncellenemedi.')
    } finally {
      setRowBusyId(null)
    }
  }

  const removeAgency = async (a: AgencyItem) => {
    if (!token) return
    if (!window.confirm(`"${a.name}" acentasını silmek istiyor musunuz?`)) return
    setRowBusyId(a.id)
    setMessage('')
    try {
      await deleteAgency(token, a.id)
      setMessage('Acenta silindi.')
      if (editingId === a.id) setEditingId(null)
      loadAgencies()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Silinemedi.')
    } finally {
      setRowBusyId(null)
    }
  }

  const filteredAgencies = agencies.filter((a) => {
    const nameOk = !listFilters.name.trim() || (a.name ?? '').toLowerCase().includes(listFilters.name.trim().toLowerCase())
    const contactOk = !listFilters.contact.trim() || (a.contactFullName ?? '').toLowerCase().includes(listFilters.contact.trim().toLowerCase())
    const phoneOk = !listFilters.phone.trim() || (a.phone ?? '').toLowerCase().includes(listFilters.phone.trim().toLowerCase())
    return nameOk && contactOk && phoneOk
  })

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
          <div className="form-group">
            <label>Kullanıcı Adı *</label>
            <input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="acenta.kullanici"
              required
            />
          </div>
          <div className="form-group">
            <label>Şifre *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="En az 6 karakter"
              required
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <input
                value={listFilters.name}
                onChange={(e) => setListFilters((f) => ({ ...f, name: e.target.value }))}
                placeholder="Acenta adı (içeren)"
                style={{ minWidth: 180 }}
              />
              <input
                value={listFilters.contact}
                onChange={(e) => setListFilters((f) => ({ ...f, contact: e.target.value }))}
                placeholder="Yetkili (içeren)"
                style={{ minWidth: 180 }}
              />
              <input
                value={listFilters.phone}
                onChange={(e) => setListFilters((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Telefon (içeren)"
                style={{ minWidth: 160 }}
              />
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Acenta Adı</th>
                  <th>Yetkili</th>
                  <th>Telefon</th>
                  <th>E-posta</th>
                  <th>Desk-Acenta linki</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgencies.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {editingId === a.id ? (
                        <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                      ) : a.name}
                    </td>
                    <td>
                      {editingId === a.id ? (
                        <input value={editForm.contactFullName} onChange={(e) => setEditForm((f) => ({ ...f, contactFullName: e.target.value }))} />
                      ) : a.contactFullName}
                    </td>
                    <td>
                      {editingId === a.id ? (
                        <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                      ) : a.phone}
                    </td>
                    <td>
                      {editingId === a.id ? (
                        <input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                      ) : (a.email ?? '—')}
                    </td>
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
                    <td>
                      {editingId === a.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={rowBusyId === a.id}
                            onClick={() => saveEdit(a.id)}
                          >
                            Kaydet
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                            İptal
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(a)}>
                            Düzenle
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ background: '#b91c1c', color: '#fff', borderColor: '#991b1b' }}
                            disabled={rowBusyId === a.id}
                            onClick={() => removeAgency(a)}
                          >
                            Sil
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAgencies.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', marginTop: 10 }}>Filtreye uygun acenta bulunamadı.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
