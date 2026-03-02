import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSettings, updateSettings, fetchDocuments, updateDocument, uploadFile, type DocumentItem } from '../api'

const KEYS = ['InstagramUrl', 'GoogleReviewsUrl', 'TripAdvisorUrl', 'LandingBaseUrl', 'ThanksPageUrl', 'ShortLinkBaseUrl'] as const
const THANKS_DESC_KEY = 'ThanksPageDescription'

const DOC_ENTRIES = [
  { docType: 'menu' as const, language: 'TR' as const, label: 'Bar menüsü (TR)' },
  { docType: 'menu' as const, language: 'EN' as const, label: 'Bar menüsü (EN)' },
  { docType: 'rules' as const, language: 'TR' as const, label: 'Tekne kuralları (TR)' },
  { docType: 'rules' as const, language: 'EN' as const, label: 'Tekne kuralları (EN)' },
]

function getDocUrl(docs: DocumentItem[], docType: string, language: string): string | null {
  return docs.find((d) => d.docType === docType && d.language === language)?.fileUrl ?? null
}

export function Settings() {
  const { token } = useAuth()
  const [values, setValues] = useState<Record<string, string>>({})
  const [thanksDesc, setThanksDesc] = useState('')
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [docLoading, setDocLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [docMessage, setDocMessage] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetchSettings(token).then((s) => {
      setValues(s ?? {})
      setThanksDesc(s?.ThanksPageDescription ?? '')
    }).finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    fetchDocuments(token).then(setDocs).finally(() => setDocLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setMessage('')
    const body: Record<string, string | null> = {}
    KEYS.forEach((k) => { body[k] = values[k]?.trim() || null })
    body[THANKS_DESC_KEY] = thanksDesc?.trim() || null
    updateSettings(token, body)
      .then(() => setMessage('Kaydedildi.'))
      .catch(() => setMessage('Hata oluştu.'))
      .finally(() => setSaving(false))
  }

  const handlePdfUpload = async (docType: string, language: string, file: File) => {
    if (!token) return
    const key = `${docType}-${language}`
    setUploading(key)
    setDocMessage('')
    try {
      const { url } = await uploadFile(token, file)
      await updateDocument(token, { docType, language, fileUrl: url })
      setDocs((prev) => {
        const rest = prev.filter((d) => !(d.docType === docType && d.language === language))
        return [...rest, { docType, language, fileUrl: url }]
      })
      setDocMessage('PDF yüklendi.')
    } catch (e) {
      setDocMessage(e instanceof Error ? e.message : 'Yüklenemedi.')
    } finally {
      setUploading(null)
    }
  }

  const handlePdfRemove = async (docType: string, language: string) => {
    if (!token) return
    setDocMessage('')
    try {
      await updateDocument(token, { docType, language, fileUrl: null })
      setDocs((prev) => prev.filter((d) => !(d.docType === docType && d.language === language)))
      setDocMessage('PDF kaldırıldı.')
    } catch (e) {
      setDocMessage(e instanceof Error ? e.message : 'Kaldırılamadı.')
    }
  }

  if (loading) return <p>Yükleniyor...</p>

  return (
    <div>
      <h1 className="page-title">Ayarlar</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: 500, marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>Genel linkler</h2>
        {KEYS.map((key) => (
          <div key={key} className="form-group">
            <label>{key.replace(/([A-Z])/g, ' $1').trim()}</label>
            <input
              value={values[key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        ))}
        {message && <p className={message.includes('Hata') ? 'msg-error' : 'msg-success'}>{message}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
      </form>

      <form onSubmit={async (e) => { e.preventDefault(); if (!token) return; setSaving(true); setMessage(''); updateSettings(token, { [THANKS_DESC_KEY]: thanksDesc?.trim() || null }).then(() => setMessage('Kaydedildi.')).catch(() => setMessage('Hata oluştu.')).finally(() => setSaving(false)); }} style={{ maxWidth: 560, marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>Teşekkür sayfası açıklaması</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 8 }}>Landing /thanks sayfasında hero bölümünde görünecek metin.</p>
        <div className="form-group">
          <textarea
            value={thanksDesc}
            onChange={(e) => setThanksDesc(e.target.value)}
            rows={4}
            placeholder="Deneyiminizi paylaşın..."
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
      </form>

      <section style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>Bar menüsü & Tekne kuralları (PDF)</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 16 }}>Müşteri landing sayfasında bu PDF’ler popup içinde gösterilir. TR/EN dil seçimine göre ilgili dosya kullanılır.</p>
        {docLoading && <p>Yükleniyor...</p>}
        {!docLoading &&
          DOC_ENTRIES.map(({ docType, language, label }) => {
            const fileUrl = getDocUrl(docs, docType, language)
            const key = `${docType}-${language}`
            const isUploading = uploading === key
            return (
              <div key={key} className="card card-md" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                  <strong style={{ minWidth: 160 }}>{label}</strong>
                  {fileUrl && (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14 }}>Mevcut PDF</a>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      disabled={isUploading}
                      style={{ minHeight: 'auto', width: 'auto' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePdfUpload(docType, language, file)
                        e.target.value = ''
                      }}
                    />
                    <span style={{ fontSize: 14 }}>{isUploading ? 'Yükleniyor...' : fileUrl ? 'Yeni PDF yükle' : 'PDF yükle'}</span>
                  </label>
                  {fileUrl && (
                    <button type="button" onClick={() => handlePdfRemove(docType, language)} className="btn btn-secondary btn-sm">Kaldır</button>
                  )}
                </div>
              </div>
            )
          })}
        {docMessage && <p className={docMessage.includes('yüklendi') || docMessage.includes('kaldırıldı') ? 'msg-success' : 'msg-error'}>{docMessage}</p>}
      </section>
    </div>
  )
}
