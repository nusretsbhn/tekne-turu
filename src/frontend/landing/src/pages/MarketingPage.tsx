import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { fetchMarketingLandingData, submitPreReservation, type MarketingLandingData } from '../api'
import { toYoutubeEmbedUrl } from '../utils/youtubeEmbed'

type Screen = 'idle' | 'success' | 'error'
type Lang = 'tr' | 'en'
const MARKETING_STATIC_GOOGLE_REVIEWS_URL = 'https://www.google.com/search?sca_esv=ab7f61c36d6d1228&sxsrf=ANbL-n7dlpH9UBw4cmPqGk6RneLb6TnuBA:1774610025487&q=viking+%C3%B6l%C3%BCdeniz+tekne+turu&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOfOhJhUgwsNaI_QFa_833vXpQA55CZRoUMgsTNFR7bo-rzmdEje5VreP5sx6tJXOy3b1ju8%3D&uds=ALYpb_l6DyU7gEufbC-T-1UgqmR0JAkPPHYZ9DDWKcNgfeGaoBLt3PjEvRIy9hi_WUS6w3E1PCpVud2JKkTGOm5ZbkRlvQj3xfFDNPoUnxJL2uQFGl4qZgaJdHnsf4_riZItDcn7tWYb&sa=X&ved=2ahUKEwjzkrzB-b-TAxX8RvEDHd_hHUcQ3PALegQIGRAE&biw=1440&bih=778&dpr=2'

const I18N = {
  tr: {
    loading: 'Yükleniyor...',
    pageError: 'Sayfa yüklenemedi.',
    reserveNow: 'Ön Rezervasyon Yap',
    reviewsAndLocation: 'Yorumlar ve konum',
    googleReviews: "Google'da yorumları gör",
    directions: 'Yol tarifi al',
    services: 'Hizmetler',
    price: 'Tur Fiyatı',
    priceAdult: 'Yetişkin',
    priceChild: 'Çocuk',
    priceChildNote: '(6-12 yaş)',
    priceBaby: 'Bebek',
    priceBabyNote: '(0-3 ücretsiz)',
    priceValidityFromTo: 'Bu fiyatlar {from} – {to} tarihleri arasında geçerlidir.',
    priceValidityFrom: '{from} tarihinden itibaren geçerlidir.',
    priceValidityTo: '{to} tarihine kadar geçerlidir.',
    stops: 'Duraklar',
    gallery: 'Tur Görselleri',
    video: 'Tur videosu',
    docsTitle: 'Dokümanlar',
    docsDesc: 'Bar menüsü ve fiyatları ile tekne kuralları dökümanlarına aşağıdan ulaşabilirsiniz.',
    barMenu: 'Bar Menüsü ve Fiyatlarımız',
    rules: 'Tekne Kuralları',
    openPdf: 'PDF Aç',
    socialsTitle: 'Sosyal Medyada Biz',
    preReservationTitle: 'Ön Rezervasyon',
    preReservationDesc: 'Talebinizi bırakın, sizi en kısa sürede arayalım.',
    close: 'Kapat',
    send: 'Talep Gönder',
    sending: 'Gönderiliyor...',
    requestReceived: 'Talebiniz alındı, en kısa sürede dönüş yapacağız.',
    requestFailed: 'Talebiniz kaydedilemedi.',
  },
  en: {
    loading: 'Loading...',
    pageError: 'Page could not be loaded.',
    reserveNow: 'Make Pre-Reservation',
    reviewsAndLocation: 'Reviews & location',
    googleReviews: 'See reviews on Google',
    directions: 'Get directions',
    services: 'Services',
    price: 'Tour Price',
    priceAdult: 'Adult',
    priceChild: 'Child',
    priceChildNote: '(ages 6–12)',
    priceBaby: 'Baby',
    priceBabyNote: '(0–3 free)',
    priceValidityFromTo: 'These rates are valid from {from} to {to}.',
    priceValidityFrom: 'Valid from {from}.',
    priceValidityTo: 'Valid through {to}.',
    stops: 'Stops',
    gallery: 'Tour Gallery',
    video: 'Tour video',
    docsTitle: 'Documents',
    docsDesc: 'You can access the bar menu & prices and boat rules documents below.',
    barMenu: 'Bar menu & prices',
    rules: 'Boat Rules',
    openPdf: 'Open PDF',
    socialsTitle: 'Find Us on Social Media',
    preReservationTitle: 'Pre-Reservation',
    preReservationDesc: 'Leave your request and we will call you shortly.',
    close: 'Close',
    send: 'Send Request',
    sending: 'Sending...',
    requestReceived: 'Your request has been received. We will contact you soon.',
    requestFailed: 'Your request could not be saved.',
  },
} as const

function formatMarketingPriceValidity(
  validFrom: string | null | undefined,
  validTo: string | null | undefined,
  lang: Lang,
): string | null {
  const vf = validFrom?.trim()
  const vt = validTo?.trim()
  if (!vf && !vt) return null
  const locale = lang === 'tr' ? 'tr-TR' : 'en-GB'
  const fmt = (iso: string) => {
    const d = new Date(`${iso.trim()}T12:00:00`)
    return Number.isNaN(d.getTime()) ? iso.trim() : d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const f = vf ? fmt(vf) : null
  const t = vt ? fmt(vt) : null
  const copy = I18N[lang]
  if (f && t) return copy.priceValidityFromTo.replace('{from}', f).replace('{to}', t)
  if (f) return copy.priceValidityFrom.replace('{from}', f)
  if (t) return copy.priceValidityTo.replace('{to}', t)
  return null
}

/** Admin alanına iframe HTML yapıştırılırsa src URL'sini çıkarır. */
function extractEmbedSrc(input: string | null | undefined): string | null {
  if (!input?.trim()) return null
  const raw = input.trim()
  if (!raw.includes('<iframe')) return raw
  const m = /src\s*=\s*["']([^"']+)["']/i.exec(raw)
  return m?.[1] ?? null
}

export function MarketingPage() {
  const [data, setData] = useState<MarketingLandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>('tr')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    hotelName: '',
    adultCount: 2,
    childCount: 0,
    babyCount: 0,
    tourDate: '',
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
      })
      setSubmitStatus('success')
      setSubmitMessage(I18N[lang].requestReceived)
      setForm((f) => ({ ...f, fullName: '', phone: '', email: '', hotelName: '' }))
    } catch (err) {
      setSubmitStatus('error')
      setSubmitMessage(err instanceof Error ? err.message : I18N[lang].requestFailed)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ textAlign: 'center', padding: '3rem' }}>{I18N[lang].loading}</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={styles.page}>
        <p style={{ textAlign: 'center', padding: '3rem', color: '#c00' }}>{error ?? I18N[lang].pageError}</p>
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
  const t = I18N[lang]
  const servicesText = lang === 'en' ? (data.servicesEn?.trim() || data.services) : data.services
  const barPdfUrl = lang === 'en' ? (resolveUrl(data.barMenuPdfUrlEn) || resolveUrl(data.barMenuPdfUrl)) : resolveUrl(data.barMenuPdfUrl)
  const rulesPdfUrl = lang === 'en' ? (resolveUrl(data.rulesPdfUrlEn) || resolveUrl(data.rulesPdfUrl)) : resolveUrl(data.rulesPdfUrl)
  const socialLinks = [
    { key: 'instagram', href: data.instagramUrl, label: 'Instagram', logoUrl: 'https://cdn.simpleicons.org/instagram' },
    { key: 'tripadvisor', href: data.tripAdvisorUrl, label: 'TripAdvisor', logoUrl: 'https://cdn.simpleicons.org/tripadvisor' },
    { key: 'youtube', href: data.youtubeUrl, label: 'YouTube', logoUrl: 'https://cdn.simpleicons.org/youtube' },
  ].filter((s) => !!s.href) as Array<{ key: string; href: string; label: string; logoUrl: string }>

  const openPdf = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const videoEmbedSrc = data.videoUrl ? toYoutubeEmbedUrl(data.videoUrl) : null
  const placeIdSource = `${data.locationMapUrl ?? ''} ${data.googleReviewsUrl ?? ''}`
  const placeIdMatch = /placeid=([A-Za-z0-9_-]+)/i.exec(placeIdSource)
  const placeId = placeIdMatch?.[1] ?? null
  const coordMatch = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(data.locationMapUrl ?? '')
  const latLng = coordMatch ? `${coordMatch[1]},${coordMatch[2]}` : null
  const businessQuery = [data.tourTitle, data.departurePoint].filter(Boolean).join(' ').trim()
  const embedInput = extractEmbedSrc(data.locationMapEmbedUrl)
  const mapEmbedSrc = embedInput
    ? embedInput
    : placeId
      ? `https://www.google.com/maps?q=place_id:${placeId}&output=embed`
      : latLng
        ? `https://www.google.com/maps?output=embed&q=${encodeURIComponent(latLng)}&z=15`
        : businessQuery
          ? `https://www.google.com/maps?output=embed&q=${encodeURIComponent(businessQuery)}&z=15`
          : null
  const directionsUrl = placeId
    ? `https://www.google.com/maps/dir/?api=1&destination_place_id=${placeId}&travelmode=driving`
    : latLng
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(latLng)}&travelmode=driving`
      : data.locationMapUrl
        ? data.locationMapUrl
        : businessQuery
          ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(businessQuery)}&travelmode=driving`
          : null

  const p = data.pricing
  const structuredPriceRows = p
    ? (
        [
          { label: t.priceAdult, note: null as string | null, value: p.adult },
          { label: t.priceChild, note: t.priceChildNote, value: p.child },
          { label: t.priceBaby, note: t.priceBabyNote, value: p.baby },
        ] as const
      )
        .map((row) => ({ ...row, value: row.value?.trim() || '' }))
        .filter((row) => row.value.length > 0)
    : []

  const priceValidityText =
    structuredPriceRows.length > 0 && p ? formatMarketingPriceValidity(p.validFrom, p.validTo, lang) : null

  const priceItems: { label: string; price: string }[] = []
  if (structuredPriceRows.length === 0 && data.price) {
    const re = /(Yetişkin|Çocuk|Bebek|Adult|Child|Baby)\s*[:\s]*([^,]+)/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(data.price)) !== null) {
      priceItems.push({ label: m[1], price: m[2].trim().replace(/\s+/g, ' ') })
    }
    if (priceItems.length === 0) priceItems.push({ label: lang === 'en' ? 'Price' : 'Fiyat', price: data.price })
  }

  const showPriceSection = structuredPriceRows.length > 0 || !!data.price

  return (
    <div style={styles.page}>
      <header style={{ ...styles.banner, backgroundImage: `url(${bannerUrl})` }}>
        <div style={styles.bannerOverlay} />
        <div style={styles.bannerContent}>
          <div style={styles.langSwitch}>
            <button type="button" style={{ ...styles.langBtn, ...(lang === 'tr' ? styles.langBtnActive : {}) }} onClick={() => setLang('tr')}>
              TR
            </button>
            <button type="button" style={{ ...styles.langBtn, ...(lang === 'en' ? styles.langBtnActive : {}) }} onClick={() => setLang('en')}>
              EN
            </button>
          </div>
          <h1 style={styles.bannerTitle}>{data.tourTitle}</h1>
          {(data.startTime || data.endTime) && (
            <p style={styles.bannerSub}>
              {data.startTime && data.endTime
                ? (lang === 'en' ? `Departure ${data.startTime} · Return ${data.endTime}` : `Kalkış ${data.startTime} · Dönüş ${data.endTime}`)
                : data.startTime
                  ? (lang === 'en' ? `Departure ${data.startTime}` : `Kalkış ${data.startTime}`)
                  : (lang === 'en' ? `End ${data.endTime}` : `Bitiş ${data.endTime}`)}
            </p>
          )}
          {data.departurePoint && (
            <p style={styles.bannerSub}>
              {lang === 'en' ? 'Departure:' : 'Kalkış:'} {data.departurePoint}{' '}
              {data.departureMapUrl && (
                <a href={data.departureMapUrl} target="_blank" rel="noopener noreferrer" style={styles.linkInline}>
                  {lang === 'en' ? '(View on map)' : '(Haritada Gör)'}
                </a>
              )}
            </p>
          )}
          <button type="button" style={styles.heroCtaBtn} onClick={() => setModalOpen(true)}>
            {t.reserveNow}
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {(data.googleReviewsUrl || data.locationMapUrl || data.locationMapEmbedUrl) && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{t.reviewsAndLocation}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <a
                href={MARKETING_STATIC_GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.googleReviewsBtn}
              >
                {t.googleReviews}
              </a>
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
                      {t.directions}
                    </a>
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {servicesText && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{t.services}</h2>
            <p style={styles.text}>{servicesText}</p>
          </section>
        )}

        {showPriceSection && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{t.price}</h2>
            {structuredPriceRows.length > 0 ? (
              <>
                {priceValidityText && (
                  <p style={{ margin: '0 0 12px', fontSize: 14, color: '#475569', fontWeight: 500 }}>{priceValidityText}</p>
                )}
                <div style={styles.priceGrid}>
                  {structuredPriceRows.map((item, i) => (
                    <div key={i} style={styles.priceCard}>
                      <span style={styles.priceLabel}>{item.label}</span>
                      {item.note && <span style={styles.priceNote}>{item.note}</span>}
                      <span style={styles.priceValue}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : priceItems.length > 1 ? (
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
            <h2 style={styles.sectionTitle}>{t.stops}</h2>
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
            <h2 style={styles.sectionTitle}>{t.gallery}</h2>
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
            <h2 style={styles.sectionTitle}>{t.video}</h2>
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

        {(barPdfUrl || rulesPdfUrl) && (
          <section style={styles.section}>
            <h2 style={{ ...styles.sectionTitle, marginBottom: 16 }}>{t.docsTitle}</h2>
            <p style={{ marginTop: 0, marginBottom: 12, color: '#555', fontSize: 15 }}>{t.docsDesc}</p>
            <div style={styles.docsGrid}>
              {barPdfUrl && (
                <div style={styles.docCard}>
                  <strong style={styles.docTitle}>{t.barMenu}</strong>
                  <button type="button" onClick={() => openPdf(barPdfUrl)} style={styles.docBtn}>
                    {t.openPdf}
                  </button>
                </div>
              )}
              {rulesPdfUrl && (
                <div style={styles.docCard}>
                  <strong style={styles.docTitle}>{t.rules}</strong>
                  <button type="button" onClick={() => openPdf(rulesPdfUrl)} style={styles.docBtn}>
                    {t.openPdf}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t.socialsTitle}</h2>
          <div style={styles.socialIconRow}>
            {socialLinks.map((social) => (
              <a key={social.key} href={social.href} target="_blank" rel="noopener noreferrer" style={styles.socialIconLink} aria-label={social.label} title={social.label}>
                <span style={styles.socialIconCircle}>
                  <img src={social.logoUrl} alt={social.label} style={styles.socialIconImg} loading="lazy" />
                </span>
                <span style={styles.socialIconLabel}>{social.label}</span>
              </a>
            ))}
          </div>
        </section>
      </main>

      {modalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>{t.preReservationTitle}</h2>
            <p style={{ marginTop: 0, marginBottom: 16, fontSize: 14, color: '#555' }}>
              {t.preReservationDesc}
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
                  {t.close}
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
                  {submitting ? t.sending : t.send}
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
    maxWidth: 760,
    margin: '0 auto',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
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
  langSwitch: {
    display: 'inline-flex',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 12,
    background: 'rgba(0,0,0,0.2)',
  },
  langBtn: {
    border: 'none',
    background: 'transparent',
    color: '#fff',
    padding: '8px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  langBtnActive: {
    background: '#fff',
    color: '#111',
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
  heroCtaBtn: {
    marginTop: 22,
    padding: '16px 38px',
    background: '#f97316',
    color: '#fff',
    borderRadius: 999,
    border: 'none',
    fontSize: 20,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 22px rgba(0,0,0,0.35)',
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
  priceNote: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    marginBottom: 6,
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
  docsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },
  docCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 18,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  docTitle: {
    display: 'block',
    marginBottom: 12,
    fontSize: 16,
    color: '#111',
  },
  docBtn: {
    padding: '10px 16px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    cursor: 'pointer',
  },
  socialIconRow: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  },
  socialIconLink: {
    display: 'inline-flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    color: '#111',
    textDecoration: 'none',
  },
  socialIconCircle: {
    width: 78,
    height: 78,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    border: '1px solid #ddd',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontWeight: 800,
    fontSize: 22,
    padding: 18,
    boxSizing: 'border-box' as const,
  },
  socialIconImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },
  socialIconLabel: {
    fontSize: 14,
    fontWeight: 600,
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

