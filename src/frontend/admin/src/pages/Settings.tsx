import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSettings, updateSettings, fetchDocuments, updateDocument, uploadFile, type DocumentItem } from '../api'

const KEYS = [
  'InstagramUrl',
  'GoogleReviewsUrl',
  'TripAdvisorUrl',
  'YoutubeUrl',
  'LandingBaseUrl',
  'ThanksPageUrl',
  'ShortLinkBaseUrl',
  'DeskAcentaBaseUrl',
] as const
const THANKS_DESC_KEY = 'ThanksPageDescription'
const THANKS_SURVEY_KEY = 'ThanksSurveyJson'

type ThanksSurveyQuestion = {
  question: string
  options: [string, string, string, string]
}

const EMPTY_SURVEY: ThanksSurveyQuestion[] = Array.from({ length: 5 }, () => ({
  question: '',
  options: ['', '', '', ''],
}))

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
  const [thanksSurvey, setThanksSurvey] = useState<ThanksSurveyQuestion[]>(EMPTY_SURVEY)
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
      const raw = s ?? {}
      setValues(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v ?? ''])) as Record<string, string>)
      setThanksDesc(raw?.ThanksPageDescription ?? '')
      try {
        const parsed = JSON.parse(raw?.ThanksSurveyJson ?? '[]') as Partial<ThanksSurveyQuestion>[]
        const normalized = EMPTY_SURVEY.map((q, i) => {
          const src = parsed[i]
          const opts = Array.isArray(src?.options) ? src!.options as string[] : []
          return {
            question: src?.question ?? q.question,
            options: [
              opts[0] ?? '',
              opts[1] ?? '',
              opts[2] ?? '',
              opts[3] ?? '',
            ] as [string, string, string, string],
          }
        })
        setThanksSurvey(normalized)
      } catch {
        setThanksSurvey(EMPTY_SURVEY)
      }
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

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!token) return
          setSaving(true)
          setMessage('')
          const compact = thanksSurvey.reduce<Array<{ question: string; options: string[] }>>((acc, q) => {
            const question = q.question.trim()
            if (!question) return acc
            const raw = q.options.map((o) => o.trim())
            // Admin tüm 4 şıkkı doldurmasa bile akış bozulmasın: eksikleri varsayılan metinle tamamla.
            const options = [0, 1, 2, 3].map((i) => raw[i] || `Seçenek ${i + 1}`)
            acc.push({ question, options })
            return acc
          }, [])
          updateSettings(token, { [THANKS_SURVEY_KEY]: JSON.stringify(compact) })
            .then(() => setMessage('Anket kaydedildi.'))
            .catch(() => setMessage('Anket kaydedilemedi.'))
            .finally(() => setSaving(false))
        }}
        style={{ maxWidth: 760, marginBottom: 32 }}
      >
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>Teşekkür sayfası anketi (5 soru)</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 12 }}>
          Her soru için 4 cevap girin. Sayfada soru soru ilerler; son sorudan sonra teşekkür ve Google yönlendirmesi gösterilir.
        </p>
        {thanksSurvey.map((q, i) => (
          <div key={i} className="card card-md" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label>Soru {i + 1}</label>
              <input
                value={q.question}
                onChange={(e) => setThanksSurvey((prev) => prev.map((x, idx) => (idx === i ? { ...x, question: e.target.value } : x)))}
                placeholder={`Soru ${i + 1}`}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {q.options.map((opt, j) => (
                <div className="form-group" key={j} style={{ marginBottom: 0 }}>
                  <label>Cevap {j + 1}</label>
                  <input
                    value={opt}
                    onChange={(e) =>
                      setThanksSurvey((prev) =>
                        prev.map((x, idx) => (idx === i
                          ? { ...x, options: x.options.map((o, oi) => (oi === j ? e.target.value : o)) as [string, string, string, string] }
                          : x)),
                      )}
                    placeholder={`Cevap ${j + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Kaydediliyor...' : 'Anketi Kaydet'}</button>
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
