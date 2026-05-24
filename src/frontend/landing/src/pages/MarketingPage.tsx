import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { fetchMarketingLandingData, submitPreReservation, type MarketingLandingData } from '../api'
import { toYoutubeEmbedUrl } from '../utils/youtubeEmbed'

type Screen = 'idle' | 'success' | 'error'
type Lang = 'tr' | 'en'
const MARKETING_STATIC_GOOGLE_REVIEWS_URL = 'https://www.google.com/search?sca_esv=ab7f61c36d6d1228&sxsrf=ANbL-n7dlpH9UBw4cmPqGk6RneLb6TnuBA:1774610025487&q=viking+%C3%B6l%C3%BCdeniz+tekne+turu&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOfOhJhUgwsNaI_QFa_833vXpQA55CZRoUMgsTNFR7bo-rzmdEje5VreP5sx6tJXOy3b1ju8%3D&uds=ALYpb_l6DyU7gEufbC-T-1UgqmR0JAkPPHYZ9DDWKcNgfeGaoBLt3PjEvRIy9hi_WUS6w3E1PCpVud2JKkTGOm5ZbkRlvQj3xfFDNPoUnxJL2uQFGl4qZgaJdHnsf4_riZItDcn7tWYb&sa=X&ved=2ahUKEwjzkrzB-b-TAxX8RvEDHd_hHUcQ3PALegQIGRAE&biw=1440&bih=778&dpr=2'

/** 0535 403 38 69 — tel: ve wa.me için uluslararası format */
const MARKETING_CONTACT_PHONE_E164 = '905354033869'
const MARKETING_TEL_HREF = `tel:+${MARKETING_CONTACT_PHONE_E164}`
const MARKETING_WHATSAPP_HREF = `https://wa.me/${MARKETING_CONTACT_PHONE_E164}`

const I18N = {
  tr: {
    loading: 'Yükleniyor...',
    pageError: 'Sayfa yüklenemedi.',
    reserveNow: 'Ön Rezervasyon Yap',
    callNow: 'Ara',
    whatsappChat: 'WhatsApp',
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
    accountInfoTitle: 'Hesap bilgileri',
    companyName: 'Firma adı',
    iban: 'IBAN',
    copy: 'Kopyala',
    copied: 'Kopyalandı',
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
    callNow: 'Call',
    whatsappChat: 'WhatsApp',
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
    accountInfoTitle: 'Account details',
    companyName: 'Company name',
    iban: 'IBAN',
    copy: 'Copy',
    copied: 'Copied',
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
  const [copiedField, setCopiedField] = useState<'companyName' | 'iban' | null>(null)

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
  const servicesNoteText = lang === 'en' ? (data.servicesNoteEn?.trim() || data.servicesNote?.trim()) : data.servicesNote?.trim()
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

  const copyText = async (key: 'companyName' | 'iban', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(key)
      window.setTimeout(() => setCopiedField((prev) => (prev === key ? null : prev)), 1400)
    } catch {
      setCopiedField(null)
    }
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
  const companyName = data.companyName?.trim() ?? ''
  const companyIban = data.companyIban?.trim() ?? ''
  const showAccountInfo = companyName.length > 0 || companyIban.length > 0

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
          <div style={styles.heroContactRow}>
            <a href={MARKETING_TEL_HREF} style={{ ...styles.heroContactBtn, ...styles.heroContactBtnPhone }} aria-label={t.callNow}>
              <PhoneIcon />
              <span>{t.callNow}</span>
            </a>
            <a
              href={MARKETING_WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.heroContactBtn, ...styles.heroContactBtnWhatsapp }}
              aria-label={t.whatsappChat}
            >
              <WhatsAppIcon />
              <span>{t.whatsappChat}</span>
            </a>
          </div>
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
                <GoogleIcon />
                <span>{t.googleReviews}</span>
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

        {(servicesText || servicesNoteText) && (
          <section style={styles.section}>
            {servicesText && (
              <>
                <h2 style={styles.sectionTitle}>{t.services}</h2>
                <p style={styles.text}>{servicesText}</p>
              </>
            )}
            {servicesNoteText && <p style={{ ...styles.servicesNote, marginTop: servicesText ? 12 : 0 }}>{servicesNoteText}</p>}
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

        {showAccountInfo && (
          <section style={styles.section}>
            <div style={styles.accountInfoWrap}>
              <h3 style={styles.accountInfoTitle}>{t.accountInfoTitle}</h3>
              {companyName && (
                <div style={styles.accountInfoRow}>
                  <div>
                    <div style={styles.accountInfoLabel}>{t.companyName}</div>
                    <div style={styles.accountInfoValue}>{companyName}</div>
                  </div>
                  <button type="button" style={styles.accountCopyBtn} onClick={() => copyText('companyName', companyName)}>
                    {copiedField === 'companyName' ? t.copied : t.copy}
                  </button>
                </div>
              )}
              {companyIban && (
                <div style={styles.accountInfoRow}>
                  <div>
                    <div style={styles.accountInfoLabel}>{t.iban}</div>
                    <div style={styles.accountInfoValue}>{companyIban}</div>
                  </div>
                  <button type="button" style={styles.accountCopyBtn} onClick={() => copyText('iban', companyIban)}>
                    {copiedField === 'iban' ? t.copied : t.copy}
                  </button>
                </div>
              )}
            </div>
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

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
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
  heroContactRow: {
    marginTop: 14,
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContactBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 22px',
    borderRadius: 999,
    fontSize: 16,
    fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
  },
  heroContactBtnPhone: {
    background: '#fff',
    color: '#1a1a1a',
  },
  heroContactBtnWhatsapp: {
    background: '#25D366',
    color: '#fff',
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
  accountInfoWrap: {
    marginTop: 14,
    background: '#fff',
    borderRadius: 12,
    padding: '14px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  accountInfoTitle: {
    margin: '0 0 10px',
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  accountInfoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '8px 0',
    borderTop: '1px solid #f1f5f9',
  },
  accountInfoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  },
  accountInfoValue: {
    fontSize: 15,
    fontWeight: 600,
    color: '#111827',
    wordBreak: 'break-word' as const,
  },
  accountCopyBtn: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
    cursor: 'pointer',
    flexShrink: 0,
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
  servicesNote: {
    margin: '0 0 8px',
    fontSize: 14,
    color: '#c1121f',
    fontStyle: 'italic',
    fontWeight: 600,
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
    gap: 10,
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

