import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSettings, updateSettings, uploadFile } from '../api'

const KEYS = ['MarketingBannerUrl', 'MarketingServices', 'MarketingPrice', 'MarketingVideoUrl'] as const

type GalleryItem = { url: string; title?: string | null }

export function MarketingSettings() {
  const { token } = useAuth()
  const [values, setValues] = useState<Record<string, string>>({})
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return
    fetchSettings(token)
      .then((s) => {
        setValues(s ?? {})
        const raw = (s?.MarketingGalleryJson as string | null) ?? '[]'
        try {
          const parsed = JSON.parse(raw) as GalleryItem[]
          setGallery(Array.isArray(parsed) ? parsed : [])
        } catch {
          setGallery([])
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setMessage('')
    const body: Record<string, string | null> = {}
    KEYS.forEach((k) => {
      const v = values[k] ?? ''
      body[k] = v.trim() || null
    })
    body.MarketingGalleryJson = gallery.length > 0 ? JSON.stringify(gallery) : '[]'
    updateSettings(token, body)
      .then(() => setMessage('Kaydedildi.'))
      .catch(() => setMessage('Hata oluştu.'))
      .finally(() => setSaving(false))
  }

  const handleBannerUpload = async (file: File) => {
    if (!token) return
    setUploadingBanner(true)
    setMessage('')
    try {
      const { url } = await uploadFile(token, file)
      setValues((v) => ({ ...v, MarketingBannerUrl: url }))
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Banner yüklenemedi.')
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleGalleryUpload = async (file: File) => {
    if (!token) return
    setUploadingImage(true)
    setMessage('')
    try {
      const { url } = await uploadFile(token, file)
      setGallery((g) => [...g, { url }])
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Görsel yüklenemedi.')
    } finally {
      setUploadingImage(false)
    }
  }

  const moveGalleryItem = (index: number, delta: number) => {
    setGallery((prev) => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      const tmp = next[index]
      next[index] = next[target]
      next[target] = tmp
      return next
    })
  }

  const removeGalleryItem = (index: number) => {
    setGallery((prev) => prev.filter((_, i) => i !== index))
  }

  if (loading) return <p>Yükleniyor...</p>

  return (
    <div>
      <h1 className="page-title">Pazarlama Ayarları</h1>
      <form onSubmit={handleSave} style={{ maxWidth: 720 }}>
        <div className="form-group">
          <label>Ana Banner Görseli</label>
          {values.MarketingBannerUrl && (
            <div style={{ marginBottom: 8 }}>
              <img
                src={values.MarketingBannerUrl}
                alt="Ana banner"
                style={{ maxWidth: '100%', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="file"
              accept="image/*"
              disabled={uploadingBanner}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleBannerUpload(file)
                e.target.value = ''
              }}
            />
            {values.MarketingBannerUrl && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setValues((v) => ({ ...v, MarketingBannerUrl: '' }))}
              >
                Bannerı Kaldır
              </button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Hizmetler</label>
          <textarea
            value={values.MarketingServices ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingServices: e.target.value }))}
            rows={4}
            placeholder="Tura dahil hizmetleri yazın..."
          />
        </div>

        <div className="form-group">
          <label>Tur Fiyatı</label>
          <textarea
            value={values.MarketingPrice ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingPrice: e.target.value }))}
            rows={3}
            placeholder="Örn: Yetişkin 40€, Çocuk 25€..."
          />
        </div>

        <div className="form-group">
          <label>Tur Videosu URL</label>
          <input
            value={values.MarketingVideoUrl ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingVideoUrl: e.target.value }))}
            placeholder="YouTube linki veya mp4 URL"
          />
        </div>

        <div className="form-group">
          <label>Tur Görselleri</label>
          <div style={{ marginBottom: 8 }}>
            <input
              type="file"
              accept="image/*"
              disabled={uploadingImage}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleGalleryUpload(file)
                e.target.value = ''
              }}
            />
          </div>
          {gallery.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Henüz görsel eklenmedi. Dosya seçerek yeni görseller yükleyebilirsiniz.
            </p>
          )}
          {gallery.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gallery.map((item, index) => (
                <div
                  key={index}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 8,
                  }}
                >
                  <img
                    src={item.url}
                    alt={item.title ?? `Görsel ${index + 1}`}
                    style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      value={item.title ?? ''}
                      onChange={(e) =>
                        setGallery((prev) =>
                          prev.map((g, i) => (i === index ? { ...g, title: e.target.value || null } : g)),
                        )
                      }
                      placeholder="Başlık (isteğe bağlı)"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => moveGalleryItem(index, -1)}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => moveGalleryItem(index, 1)}
                      disabled={index === gallery.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeGalleryItem(index)}
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {message && <p className={message.includes('Hata') ? 'msg-error' : 'msg-success'}>{message}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>
    </div>
  )
}

