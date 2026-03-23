import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { fetchMarketingLandingData, submitPreReservation, type MarketingLandingData } from '../api'
import { toYoutubeEmbedUrl } from '../utils/youtubeEmbed'

type Screen = 'idle' | 'success' | 'error'

export function MarketingPage() {
  const [data, setData] = useState<MarketingLandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [menuPopupOpen, setMenuPopupOpen] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    hotelName: '',
    adultCount: 2,
    childCount: 0,
    babyCount: 0,
    tourDate: '',
    useShuttle: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<Screen>('idle')
  const [submitMessage, setSubmitMessage] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchMarketingLandingData()
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.phone.trim() || !form.tourDate) return
    setSubmitting(true)
    setSubmitStatus('idle')
    setSubmitMessage('')
    try {
      await submitPreReservation({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        hotelName: form.hotelName.trim() || undefined,
        adultCount: Number(form.adultCount) || 0,
        childCount: Number(form.childCount) || 0,
        babyCount: Number(form.babyCount) || 0,
        tourDate: form.tourDate,
        useShuttle: form.useShuttle,
      })
      setSubmitStatus('success')
      setSubmitMessage('Talebiniz alındı, en kısa sürede dönüş yapacağız.')
      setForm((f) => ({ ...f, fullName: '', phone: '', email: '', hotelName: '' }))
    } catch (err) {
      setSubmitStatus('error')
      setSubmitMessage(err instanceof Error ? err.message : 'Talebiniz kaydedilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={styles.page}>
        <p style={{ textAlign: 'center', padding: '3rem', color: '#c00' }}>{error ?? 'Sayfa yüklenemedi.'}</p>
      </div>
    )
  }

  // Göreli /uploads vb. — API ile landing farklı domaindeyse VITE_API_BASE_URL kullanın
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const resolveUrl = (url: string | null | undefined): string => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const origin = apiBase || window.location.origin
    return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`
  }
  const bannerUrl = resolveUrl(data.bannerUrl) || `${window.location.origin}/banner.jpg`

  // Fiyat metninden Yetişkin/Çocuk/Bebek fiyatlarını çıkar (örn: "Yetişkin 2000₺, Çocuk 1000₺, Bebek 0₺")
  const videoEmbedSrc = data.videoUrl ? toYoutubeEmbedUrl(data.videoUrl) : null
  const placeIdSource = `${data.locationMapUrl ?? ''} ${data.googleReviewsUrl ?? ''}`
  const placeIdMatch = /placeid=([A-Za-z0-9_-]+)/i.exec(placeIdSource)
  const placeId = placeIdMatch?.[1] ?? null
  const mapEmbedSrc = data.locationMapEmbedUrl
    ? data.locationMapEmbedUrl
    : placeId
      ? `https://www.google.com/maps?q=place_id:${placeId}&output=embed`
      : data.locationMapUrl
        ? `https://www.google.com/maps?q=${encodeURIComponent(data.locationMapUrl)}&output=embed`
        : null
  const directionsUrl = placeId
    ? `https://www.google.com/maps/dir/?api=1&destination_place_id=${placeId}&travelmode=driving`
    : data.locationMapUrl

  const priceItems: { label: string; price: string }[] = []
  if (data.price) {
    const re = /(Yetişkin|Çocuk|Bebek)\s*[:\s]*([^,]+)/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(data.price)) !== null) {
      priceItems.push({ label: m[1], price: m[2].trim().replace(/\s+/g, ' ') })
    }
    if (priceItems.length === 0) priceItems.push({ label: 'Fiyat', price: data.price })
  }

  return (
    <div style={styles.page}>
      <header style={{ ...styles.banner, backgroundImage: `url(${bannerUrl})` }}>
        <div style={styles.bannerOverlay} />
        <div style={styles.bannerContent}>
          <h1 style={styles.bannerTitle}>{data.tourTitle}</h1>
          {(data.startTime || data.endTime) && (
            <p style={styles.bannerSub}>
              {data.startTime && data.endTime
                ? `Kalkış ${data.startTime} · Dönüş ${data.endTime}`
                : data.startTime
                  ? `Kalkış ${data.startTime}`
                  : `Bitiş ${data.endTime}`}
            </p>
          )}
          {data.departurePoint && (
            <p style={styles.bannerSub}>
              Kalkış: {data.departurePoint}{' '}
              {data.departureMapUrl && (
                <a href={data.departureMapUrl} target="_blank" rel="noopener noreferrer" style={styles.linkInline}>
                  (Haritada Gör)
                </a>
              )}
            </p>
          )}
          <button type="button" style={styles.primaryBtn} onClick={() => setModalOpen(true)}>
            Ön Rezervasyon Yap
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {(data.googleReviewsUrl || data.locationMapUrl || data.locationMapEmbedUrl) && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Yorumlar ve konum</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              {data.googleReviewsUrl && (
                <a
                  href={data.googleReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.googleReviewsBtn}
                >
                  Google&apos;da yorumları gör
                </a>
              )}
            </div>
            {(mapEmbedSrc || data.locationMapUrl) && (
              <div>
                {mapEmbedSrc && (
                  <div style={styles.mapWrap}>
                    <iframe
                      src={mapEmbedSrc}
                      title="Konum haritası"
                      style={styles.mapIframe}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
                {directionsUrl && (
                  <p style={{ marginTop: 12, marginBottom: 0, fontSize: 15 }}>
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer" style={styles.linkMap}>
                      Yol tarifi al
                    </a>
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {data.services && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Hizmetler</h2>
            <p style={styles.text}>{data.services}</p>
          </section>
        )}

        {data.price && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Tur Fiyatı</h2>
            {priceItems.length > 1 ? (
              <div style={styles.priceGrid}>
                {priceItems.map((item, i) => (
                  <div key={i} style={styles.priceCard}>
                    <span style={styles.priceLabel}>{item.label}</span>
                    <span style={styles.priceValue}>{item.price}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.priceCardSingle}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{data.price}</p>
              </div>
            )}
          </section>
        )}

        {data.stops.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Duraklar</h2>
            <div style={styles.stopsGrid}>
              {data.stops.map((stop, i) => (
                <div key={i} style={styles.stopCard}>
                  {stop.imageUrl && <img src={resolveUrl(stop.imageUrl)} alt={stop.name} style={styles.stopImg} />}
                  <h3 style={styles.stopName}>{stop.name}</h3>
                  {stop.description && <p style={styles.stopDesc}>{stop.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {data.gallery.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Tur Görselleri</h2>
            <div style={styles.galleryGrid}>
              {data.gallery.map((g, i) => (
                <figure key={i} style={styles.galleryItem}>
                  <img
                    src={resolveUrl(g.url)}
                    alt={g.title ?? `Görsel ${i + 1}`}
                    style={styles.galleryImg}
                    loading="lazy"
                  />
                  {g.title && <figcaption style={styles.galleryCaption}>{g.title}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        {data.videoUrl && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Tur videosu</h2>
            <div style={styles.videoWrap}>
              {videoEmbedSrc ? (
                <iframe
                  src={videoEmbedSrc}
                  title="Tur videosu"
                  style={styles.videoIframe}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video src={resolveUrl(data.videoUrl)} style={styles.videoIframe} controls />
              )}
            </div>
          </section>
        )}

        {data.barMenuPdfUrl && (
          <section style={styles.section}>
            <h2 style={{ ...styles.sectionTitle, marginBottom: 16 }}>Bar Menüsü</h2>
            <div style={styles.barMenuCard}>
              <p style={{ margin: 0, marginBottom: 12, fontSize: 15, color: '#555' }}>
                İçecek ve atıştırmalık listesini aşağıdaki butondan açabilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => setMenuPopupOpen(true)}
                style={{ ...styles.primaryBtn, marginTop: 0, textDecoration: 'none' }}
              >
                Bar Menüsünü Gör
              </button>
            </div>
          </section>
        )}

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Bizi Takip Edin</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {data.instagramUrl && (
              <a href={data.instagramUrl} target="_blank" rel="noopener noreferrer" style={styles.secondaryBtn}>
                Instagram
              </a>
            )}
            {data.tripAdvisorUrl && (
              <a href={data.tripAdvisorUrl} target="_blank" rel="noopener noreferrer" style={styles.secondaryBtn}>
                TripAdvisor
              </a>
            )}
          </div>
        </section>
      </main>

      {menuPopupOpen && data.barMenuPdfUrl && (
        <div style={styles.modalBackdrop} onClick={() => setMenuPopupOpen(false)} role="dialog" aria-modal="true" aria-label="Bar menüsü">
          <div style={styles.menuPopup} onClick={(e) => e.stopPropagation()}>
            <div style={styles.menuPopupHeader}>
              <strong>Bar Menüsü</strong>
              <button type="button" onClick={() => setMenuPopupOpen(false)} style={styles.popupCloseBtn}>
                Kapat
              </button>
            </div>
            <iframe
              title="Bar menüsü PDF"
              src={resolveUrl(data.barMenuPdfUrl)}
              style={styles.menuPopupIframe}
            />
          </div>
        </div>
      )}

      {modalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Ön Rezervasyon</h2>
            <p style={{ marginTop: 0, marginBottom: 16, fontSize: 14, color: '#555' }}>
              Talebinizi bırakın, sizi en kısa sürede arayalım.
            </p>
            <form onSubmit={handleSubmit}>
              <div style={styles.formRow}>
                <label style={styles.label}>Ad Soyad *</label>
                <input
                  style={styles.input}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  required
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Telefon *</label>
                <input
                  style={styles.input}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>E-posta</label>
                <input
                  type="email"
                  style={styles.input}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Otel Adı</label>
                <input
                  style={styles.input}
                  value={form.hotelName}
                  onChange={(e) => setForm((f) => ({ ...f, hotelName: e.target.value }))}
                />
              </div>
              <div style={styles.formRowGrid}>
                <div>
                  <label style={styles.label}>Yetişkin</label>
                  <input
                    type="number"
                    min={0}
                    style={styles.input}
                    value={form.adultCount}
                    onChange={(e) => setForm((f) => ({ ...f, adultCount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label style={styles.label}>Çocuk</label>
                  <input
                    type="number"
                    min={0}
                    style={styles.input}
                    value={form.childCount}
                    onChange={(e) => setForm((f) => ({ ...f, childCount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label style={styles.label}>Bebek</label>
                  <input
                    type="number"
                    min={0}
                    style={styles.input}
                    value={form.babyCount}
                    onChange={(e) => setForm((f) => ({ ...f, babyCount: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Tur Tarihi *</label>
                <input
                  type="date"
                  style={styles.input}
                  value={form.tourDate}
                  onChange={(e) => setForm((f) => ({ ...f, tourDate: e.target.value }))}
                  required
                />
              </div>
              <div style={{ ...styles.formRow, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="useShuttle"
                  type="checkbox"
                  checked={form.useShuttle}
                  onChange={(e) => setForm((f) => ({ ...f, useShuttle: e.target.checked }))}
                />
                <label htmlFor="useShuttle" style={{ ...styles.label, marginBottom: 0 }}>
                  Servis kullanılacak mı?
                </label>
              </div>
              {submitStatus !== 'idle' && (
                <p
                  style={{
                    marginTop: 8,
                    marginBottom: 0,
                    fontSize: 14,
                    color: submitStatus === 'success' ? '#0a0' : '#c00',
                  }}
                >
                  {submitMessage}
                </p>
              )}
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={() => setModalOpen(false)}
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.primaryBtn,
                    opacity: submitting ? 0.7 : 1,
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                  disabled={submitting}
                >
                  {submitting ? 'Gönderiliyor...' : 'Talep Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f5f5f5',
    fontFamily: 'system-ui, sans-serif',
  },
  banner: {
    position: 'relative',
    minHeight: 260,
    padding: '48px 24px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
    textAlign: 'left' as const,
  },
  bannerOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, rgba(0,0,0,0.7), rgba(0,0,0,0.2))',
  },
  bannerContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 640,
  },
  bannerTitle: {
    margin: 0,
    fontSize: 32,
    fontWeight: 700,
    textShadow: '0 2px 6px rgba(0,0,0,0.6)',
  },
  bannerSub: {
    marginTop: 8,
    fontSize: 16,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  linkInline: {
    color: '#ffd966',
    textDecoration: 'underline',
    fontSize: 14,
  },
  primaryBtn: {
    marginTop: 16,
    padding: '12px 24px',
    background: '#f97316',
    color: '#fff',
    borderRadius: 999,
    border: 'none',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 20px',
    background: '#fff',
    color: '#1a1a1a',
    borderRadius: 999,
    border: '1px solid #ddd',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  main: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px 40px',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    margin: '0 0 8px',
    fontSize: 20,
    fontWeight: 600,
    color: '#1a1a1a',
  },
  priceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
  },
  priceCard: {
    background: 'linear-gradient(145deg, #fff 0%, #f8f9fa 100%)',
    borderRadius: 12,
    padding: '16px 20px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  priceLabel: {
    display: 'block',
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  priceValue: {
    display: 'block',
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
  },
  priceCardSingle: {
    background: 'linear-gradient(145deg, #fff 0%, #f8f9fa 100%)',
    borderRadius: 12,
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  barMenuCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  menuPopup: {
    background: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: '95vw',
    width: 900,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
  },
  menuPopupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f5f5f5',
    borderBottom: '1px solid #eee',
  },
  popupCloseBtn: {
    padding: '8px 16px',
    border: '1px solid #ccc',
    background: '#fff',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 14,
  },
  menuPopupIframe: {
    flex: 1,
    width: '100%',
    minHeight: 400,
    border: 'none',
  },
  text: {
    margin: 0,
    fontSize: 15,
    color: '#444',
    whiteSpace: 'pre-line',
  },
  stopsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
  },
  stopCard: {
    background: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  stopImg: {
    width: '100%',
    height: 140,
    objectFit: 'cover',
  },
  stopName: {
    margin: 0,
    padding: '10px 12px',
    fontSize: 16,
    fontWeight: 600,
  },
  stopDesc: {
    margin: 0,
    padding: '0 12px 12px',
    fontSize: 14,
    color: '#555',
  },
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  galleryItem: {
    margin: 0,
    background: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  galleryImg: {
    width: '100%',
    height: 150,
    objectFit: 'cover',
    display: 'block',
  },
  galleryCaption: {
    margin: 0,
    padding: '6px 10px 10px',
    fontSize: 13,
    color: '#444',
  },
  videoWrap: {
    position: 'relative',
    paddingBottom: '56.25%',
    height: 0,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  videoIframe: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  googleReviewsBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 20px',
    background: '#fff',
    color: '#1a1a1a',
    border: '1px solid #dadce0',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    textDecoration: 'none',
    boxShadow: '0 1px 2px rgba(60,64,67,.15)',
  },
  mapWrap: {
    position: 'relative',
    paddingBottom: '56.25%',
    height: 0,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e8eaed',
    background: '#e8eaed',
  },
  mapIframe: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  linkMap: {
    color: '#1a73e8',
    fontWeight: 600,
    textDecoration: 'underline',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
  },
  formRow: {
    marginBottom: 10,
  },
  formRowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8,
    marginBottom: 10,
  },
  label: {
    display: 'block',
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 14,
    boxSizing: 'border-box' as const,
  },
}

