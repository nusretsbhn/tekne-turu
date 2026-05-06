import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSettings, updateSettings, uploadFile } from '../api'

const KEYS = [
  'MarketingBannerUrl',
  'MarketingServices',
  'MarketingServicesEn',
  'MarketingServicesNote',
  'MarketingServicesNoteEn',
  'MarketingPriceAdult',
  'MarketingPriceChild',
  'MarketingPriceBaby',
  'MarketingPriceValidFrom',
  'MarketingPriceValidTo',
  'MarketingVideoUrl',
  'MarketingGoogleReviewsUrl',
  'MarketingLocationMapUrl',
  'MarketingLocationMapEmbedUrl',
  'MarketingServiceLocationMapUrl',
  'MarketingServiceLocationMapEmbedUrl',
  'MarketingRedbookUrl',
  'MarketingCompanyName',
  'MarketingCompanyIban',
] as const

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
        const raw = s ?? {}
        setValues(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v ?? ''])) as Record<string, string>)
        const galleryJson = (raw?.MarketingGalleryJson as string | null) ?? '[]'
        try {
          const parsed = JSON.parse(galleryJson) as GalleryItem[]
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
          <label style={{ marginTop: 10, display: 'block' }}>Hizmetler notu (Türkçe)</label>
          <textarea
            value={values.MarketingServicesNote ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingServicesNote: e.target.value }))}
            rows={2}
            placeholder="Örn: Fiyatlar kişi başıdır. Transfer ek ücrete tabidir."
          />
        </div>

        <div className="form-group">
          <label>Hizmetler (İngilizce)</label>
          <textarea
            value={values.MarketingServicesEn ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingServicesEn: e.target.value }))}
            rows={4}
            placeholder="English text for the Services section on the English landing page..."
          />
          <label style={{ marginTop: 10, display: 'block' }}>Hizmetler notu (İngilizce)</label>
          <textarea
            value={values.MarketingServicesNoteEn ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingServicesNoteEn: e.target.value }))}
            rows={2}
            placeholder="Example: Prices are per person. Transfer is subject to an extra fee."
          />
        </div>

        <div className="form-group">
          <label>Tur fiyatları (tanıtım sayfası)</label>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 10 }}>
            Yetişkin, çocuk ve bebek için ayrı fiyat girin. Geçerlilik aralığı boş bırakılırsa fiyatlar süresiz gösterilir; doluysa yalnızca bu tarihler (Türkiye saati) arasında
            tanıtım sayfasında listelenir.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13 }}>Yetişkin</label>
              <input
                value={values.MarketingPriceAdult ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, MarketingPriceAdult: e.target.value }))}
                placeholder="Örn: 1250₺"
              />
            </div>
            <div>
              <label style={{ fontSize: 13 }}>Çocuk</label>
              <input
                value={values.MarketingPriceChild ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, MarketingPriceChild: e.target.value }))}
                placeholder="Örn: 750₺"
              />
            </div>
            <div>
              <label style={{ fontSize: 13 }}>Bebek</label>
              <input
                value={values.MarketingPriceBaby ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, MarketingPriceBaby: e.target.value }))}
                placeholder="Örn: 0₺"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 13 }}>Geçerlilik — başlangıç</label>
              <input
                type="date"
                value={values.MarketingPriceValidFrom ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, MarketingPriceValidFrom: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 13 }}>Geçerlilik — bitiş</label>
              <input
                type="date"
                value={values.MarketingPriceValidTo ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, MarketingPriceValidTo: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Şirket hesap bilgileri</label>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 10 }}>
            Bu alanlar `/landing/tanitim` sayfasında fiyat kutularının altında “Hesap bilgileri” başlığı ile görünür.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13 }}>Firma adı</label>
              <input
                value={values.MarketingCompanyName ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, MarketingCompanyName: e.target.value }))}
                placeholder="Örn: Viking Ölüdeniz Turizm"
              />
            </div>
            <div>
              <label style={{ fontSize: 13 }}>IBAN</label>
              <input
                value={values.MarketingCompanyIban ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, MarketingCompanyIban: e.target.value }))}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Tur videosu (YouTube linki)</label>
          <input
            value={values.MarketingVideoUrl ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingVideoUrl: e.target.value }))}
            placeholder="https://www.youtube.com/watch?v=... veya https://youtu.be/..."
          />
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Tanıtım sayfasında gömülü oynatıcı olarak gösterilir.
          </p>
        </div>

        <div className="form-group">
          <label>Google&apos;da yorumlar (link)</label>
          <input
            value={values.MarketingGoogleReviewsUrl ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingGoogleReviewsUrl: e.target.value }))}
            placeholder="Google arama / işletme yorumları sayfası URL’si"
          />
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Boşsa, genel ayarlardaki Google yorumları linki kullanılır (varsa).
          </p>
        </div>

        <div className="form-group">
          <label>Konum — haritayı aç (Google Maps linki)</label>
          <input
            value={values.MarketingLocationMapUrl ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingLocationMapUrl: e.target.value }))}
            placeholder="https://maps.app.goo.gl/... veya maps.google.com linki"
          />
        </div>

        <div className="form-group">
          <label>Konum — harita yerleştirme (embed URL, isteğe bağlı)</label>
          <input
            value={values.MarketingLocationMapEmbedUrl ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingLocationMapEmbedUrl: e.target.value }))}
            placeholder="Google Maps → Paylaş → Harita yerleştir → HTML’deki src=... URL’si"
          />
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Sayfada harita kutusu göstermek için; sadece kısa link verdiyseniz bu alanı da doldurmanız gerekir.
          </p>
        </div>

        <div className="form-group">
          <label>Servis konumu — haritayı aç (Google Maps linki)</label>
          <input
            value={values.MarketingServiceLocationMapUrl ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingServiceLocationMapUrl: e.target.value }))}
            placeholder="Çin misafir tanıtım sayfası için servis buluşma noktası"
          />
        </div>

        <div className="form-group">
          <label>Servis konumu — embed URL (isteğe bağlı)</label>
          <input
            value={values.MarketingServiceLocationMapEmbedUrl ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingServiceLocationMapEmbedUrl: e.target.value }))}
            placeholder="Harita yerleştirme src URL’si"
          />
        </div>

        <div className="form-group">
          <label>小紅書 (Redbook) profil veya gönderi linki</label>
          <input
            value={values.MarketingRedbookUrl ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, MarketingRedbookUrl: e.target.value }))}
            placeholder="https://..."
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

