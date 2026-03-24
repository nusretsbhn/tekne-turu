import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { fetchMarketingLandingData, type MarketingLandingData } from '../api'
import { toYoutubeEmbedUrl } from '../utils/youtubeEmbed'

type Lang = 'en' | 'zh-TW'

type Copy = {
  loading: string
  loadError: string
  otherLangLabel: string
  departure: string
  ret: string
  departurePoint: string
  viewMap: string
  stops: string
  gallery: string
  video: string
  barMenu: string
  boatRules: string
  openPdf: string
  docHint: string
  boatLocation: string
  serviceLocation: string
  directions: string
  followUs: string
  googleReviews: string
  instagram: string
  redbook: string
  tripAdvisor: string
}

const COPY: Record<Lang, Copy> = {
  en: {
    loading: 'Loading...',
    loadError: 'Could not load the page.',
    otherLangLabel: '繁體中文',
    departure: 'Departure',
    ret: 'Return',
    departurePoint: 'Departure point',
    viewMap: 'View on map',
    stops: 'Stops',
    gallery: 'Tour photos',
    video: 'Tour video',
    barMenu: 'Bar menu',
    boatRules: 'Boat rules',
    openPdf: 'Open PDF',
    docHint: 'Same PDF files as uploaded in the admin panel (opens in a new tab).',
    boatLocation: 'Boat location',
    serviceLocation: 'Shuttle / pick-up location',
    directions: 'Directions',
    followUs: 'Follow us',
    googleReviews: 'Google Reviews',
    instagram: 'Instagram',
    redbook: 'Redbook',
    tripAdvisor: 'TripAdvisor',
  },
  'zh-TW': {
    loading: '載入中…',
    loadError: '無法載入頁面。',
    otherLangLabel: 'English',
    departure: '出發',
    ret: '返回',
    departurePoint: '出發地點',
    viewMap: '查看地圖',
    stops: '停靠站',
    gallery: '行程照片',
    video: '行程影片',
    barMenu: '酒吧菜單',
    boatRules: '船上規定',
    openPdf: '開啟 PDF',
    docHint: '與後台系統上傳的 PDF 相同（於新分頁開啟）。',
    boatLocation: '乘船地點',
    serviceLocation: '接駁／服務地點',
    directions: '路線導航',
    followUs: '追蹤我們',
    googleReviews: 'Google 評論',
    instagram: 'Instagram',
    redbook: '小紅書',
    tripAdvisor: 'TripAdvisor',
  },
}

function extractEmbedSrc(input: string | null | undefined): string | null {
  if (!input?.trim()) return null
  const raw = input.trim()
  if (!raw.includes('<iframe')) return raw
  const m = /src\s*=\s*["']([^"']+)["']/i.exec(raw)
  return m?.[1] ?? null
}

function buildMapEmbed(
  locationMapUrl: string | null | undefined,
  locationMapEmbedUrl: string | null | undefined,
  fallbackQuery: string,
): string | null {
  const embedInput = extractEmbedSrc(locationMapEmbedUrl)
  if (embedInput) return embedInput
  const placeIdMatch = /placeid=([A-Za-z0-9_-]+)/i.exec(locationMapUrl ?? '')
  const placeId = placeIdMatch?.[1] ?? null
  const coordMatch = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(locationMapUrl ?? '')
  const latLng = coordMatch ? `${coordMatch[1]},${coordMatch[2]}` : null
  if (placeId) return `https://www.google.com/maps?q=place_id:${placeId}&output=embed`
  if (latLng) return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(latLng)}&z=15`
  if (fallbackQuery.trim()) return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(fallbackQuery)}&z=15`
  return null
}

function buildDirectionsUrl(locationMapUrl: string | null | undefined, fallbackQuery: string): string | null {
  const placeIdMatch = /placeid=([A-Za-z0-9_-]+)/i.exec(locationMapUrl ?? '')
  const placeId = placeIdMatch?.[1] ?? null
  const coordMatch = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(locationMapUrl ?? '')
  const latLng = coordMatch ? `${coordMatch[1]},${coordMatch[2]}` : null
  if (placeId) return `https://www.google.com/maps/dir/?api=1&destination_place_id=${placeId}&travelmode=driving`
  if (latLng) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(latLng)}&travelmode=driving`
  if (locationMapUrl?.trim()) return locationMapUrl
  if (fallbackQuery.trim()) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallbackQuery)}&travelmode=driving`
  return null
}

export function ChinaGuestPage() {
  const [lang, setLang] = useState<Lang>('en')
  const t = COPY[lang]

  const [data, setData] = useState<MarketingLandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchMarketingLandingData()
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = 'noto-sans-tc-landing'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;600;700&display=swap'
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant'
  }, [lang])

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const resolveUrl = (url: string | null | undefined): string => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const origin = apiBase || window.location.origin
    return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`
  }

  const mapBoat = useMemo(() => {
    if (!data) return { embed: null as string | null, directions: null as string | null }
    const q = [data.tourTitle, data.departurePoint].filter(Boolean).join(' ').trim()
    return {
      embed: buildMapEmbed(data.locationMapUrl, data.locationMapEmbedUrl, q),
      directions: buildDirectionsUrl(data.locationMapUrl, q),
    }
  }, [data])

  const mapService = useMemo(() => {
    if (!data) return { embed: null as string | null, directions: null as string | null }
    const q = `${data.tourTitle ?? ''} shuttle`.trim()
    return {
      embed: buildMapEmbed(data.serviceLocationMapUrl, data.serviceLocationMapEmbedUrl, q),
      directions: buildDirectionsUrl(data.serviceLocationMapUrl, q),
    }
  }, [data])

  const videoEmbedSrc = data?.videoUrl ? toYoutubeEmbedUrl(data.videoUrl) : null
  const bannerUrl = data ? resolveUrl(data.bannerUrl) || `${window.location.origin}/banner.jpg` : ''

  const pageFont =
    lang === 'zh-TW'
      ? '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif'
      : 'system-ui, -apple-system, Segoe UI, sans-serif'

  if (loading) {
    return (
      <div style={{ ...styles.page, fontFamily: pageFont }}>
        <p style={{ textAlign: 'center', padding: '3rem' }}>{t.loading}</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ ...styles.page, fontFamily: pageFont }}>
        <p style={{ textAlign: 'center', padding: '3rem', color: '#c00' }}>{error ?? t.loadError}</p>
      </div>
    )
  }

  const toggleLang = () => setLang((l) => (l === 'en' ? 'zh-TW' : 'en'))

  return (
    <div style={{ ...styles.page, fontFamily: pageFont }}>
      <div style={styles.langBar}>
        <button type="button" style={styles.langBtn} onClick={toggleLang} aria-label="Switch language">
          {t.otherLangLabel}
        </button>
      </div>

      <header style={{ ...styles.banner, backgroundImage: `url(${bannerUrl})` }}>
        <div style={styles.bannerOverlay} />
        <div style={styles.bannerContent}>
          <h1 style={styles.bannerTitle}>{data.tourTitle}</h1>
          {(data.startTime || data.endTime) && (
            <p style={styles.bannerSub}>
              {data.startTime && data.endTime
                ? `${t.departure} ${data.startTime} · ${t.ret} ${data.endTime}`
                : data.startTime
                  ? `${t.departure} ${data.startTime}`
                  : `${t.ret} ${data.endTime}`}
            </p>
          )}
          {data.departurePoint && (
            <p style={styles.bannerSub}>
              {t.departurePoint}: {data.departurePoint}{' '}
              {data.departureMapUrl && (
                <a href={resolveUrl(data.departureMapUrl)} target="_blank" rel="noopener noreferrer" style={styles.linkInline}>
                  ({t.viewMap})
                </a>
              )}
            </p>
          )}
        </div>
      </header>

      <main style={styles.main}>
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
                  <img src={resolveUrl(g.url)} alt={g.title ?? `Photo ${i + 1}`} style={styles.galleryImg} loading="lazy" />
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
                  title={t.video}
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

        {(data.barMenuPdfUrl || data.rulesPdfUrl) && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              {t.barMenu} / {t.boatRules}
            </h2>
            <p style={{ ...styles.text, marginBottom: 12, fontSize: 14, color: '#666' }}>{t.docHint}</p>
            <div style={styles.twoCol}>
              {data.barMenuPdfUrl && (
                <div style={styles.docCard}>
                  <h3 style={styles.docCardTitle}>{t.barMenu}</h3>
                  <a
                    href={resolveUrl(data.barMenuPdfUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.pdfLink}
                  >
                    {t.openPdf}
                  </a>
                </div>
              )}
              {data.rulesPdfUrl && (
                <div style={styles.docCard}>
                  <h3 style={styles.docCardTitle}>{t.boatRules}</h3>
                  <a
                    href={resolveUrl(data.rulesPdfUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.pdfLink}
                  >
                    {t.openPdf}
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {(mapBoat.embed || mapService.embed || data.locationMapUrl || data.serviceLocationMapUrl) && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              {t.boatLocation} / {t.serviceLocation}
            </h2>
            <div style={styles.twoCol}>
              {(mapBoat.embed || data.locationMapUrl) && (
                <div style={styles.mapBlock}>
                  <h3 style={styles.subTitle}>{t.boatLocation}</h3>
                  {mapBoat.embed && (
                    <div style={styles.mapWrap}>
                      <iframe
                        src={mapBoat.embed}
                        title={t.boatLocation}
                        style={styles.mapIframe}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  )}
                  {mapBoat.directions && (
                    <p style={{ marginTop: 8, marginBottom: 0 }}>
                      <a href={mapBoat.directions} target="_blank" rel="noopener noreferrer" style={styles.linkMap}>
                        {t.directions}
                      </a>
                    </p>
                  )}
                </div>
              )}
              {(mapService.embed || data.serviceLocationMapUrl) && (
                <div style={styles.mapBlock}>
                  <h3 style={styles.subTitle}>{t.serviceLocation}</h3>
                  {mapService.embed && (
                    <div style={styles.mapWrap}>
                      <iframe
                        src={mapService.embed}
                        title={t.serviceLocation}
                        style={styles.mapIframe}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  )}
                  {mapService.directions && (
                    <p style={{ marginTop: 8, marginBottom: 0 }}>
                      <a href={mapService.directions} target="_blank" rel="noopener noreferrer" style={styles.linkMap}>
                        {t.directions}
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {(data.googleReviewsUrl || data.instagramUrl || data.redbookUrl || data.tripAdvisorUrl) && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{t.followUs}</h2>
            <div style={styles.socialRow}>
              {data.googleReviewsUrl && (
                <a href={data.googleReviewsUrl} target="_blank" rel="noopener noreferrer" style={styles.socialBtn}>
                  {t.googleReviews}
                </a>
              )}
              {data.instagramUrl && (
                <a href={data.instagramUrl} target="_blank" rel="noopener noreferrer" style={styles.socialBtn}>
                  {t.instagram}
                </a>
              )}
              {data.redbookUrl && (
                <a href={data.redbookUrl} target="_blank" rel="noopener noreferrer" style={styles.socialBtn}>
                  {t.redbook}
                </a>
              )}
              {data.tripAdvisorUrl && (
                <a href={data.tripAdvisorUrl} target="_blank" rel="noopener noreferrer" style={styles.socialBtn}>
                  {t.tripAdvisor}
                </a>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: '#f5f5f5' },
  langBar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: '#fff',
    borderBottom: '1px solid #e5e5e5',
    padding: '10px 16px',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  langBtn: {
    padding: '8px 16px',
    borderRadius: 999,
    border: '1px solid #1a1a1a',
    background: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  banner: {
    position: 'relative',
    minHeight: 280,
    padding: '48px 24px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
    textAlign: 'left' as const,
  },
  bannerOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.25))',
  },
  bannerContent: { position: 'relative', zIndex: 1, maxWidth: 640 },
  bannerTitle: { margin: 0, fontSize: 32, fontWeight: 700, textShadow: '0 2px 6px rgba(0,0,0,0.6)' },
  bannerSub: { marginTop: 8, fontSize: 16, textShadow: '0 1px 3px rgba(0,0,0,0.5)' },
  linkInline: { color: '#ffd966', textDecoration: 'underline', fontSize: 14 },
  main: { maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' },
  section: { marginBottom: 28 },
  sectionTitle: { margin: '0 0 12px', fontSize: 22, fontWeight: 600, color: '#1a1a1a' },
  subTitle: { margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#333' },
  text: { margin: 0, fontSize: 15, color: '#444', whiteSpace: 'pre-line' as const },
  stopsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  stopCard: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  stopImg: { width: '100%', height: 140, objectFit: 'cover' },
  stopName: { margin: 0, padding: '10px 12px', fontSize: 16, fontWeight: 600 },
  stopDesc: { margin: 0, padding: '0 12px 12px', fontSize: 14, color: '#555' },
  galleryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  galleryItem: { margin: 0, background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  galleryImg: { width: '100%', height: 150, objectFit: 'cover', display: 'block' },
  galleryCaption: { margin: 0, padding: '6px 10px 10px', fontSize: 13, color: '#444' },
  videoWrap: { position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  videoIframe: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
    alignItems: 'stretch',
  },
  docCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  docCardTitle: { margin: '0 0 12px', fontSize: 17, fontWeight: 600 },
  pdfLink: {
    display: 'inline-block',
    marginTop: 0,
    padding: '12px 24px',
    background: '#f97316',
    color: '#fff',
    borderRadius: 999,
    border: 'none',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
  },
  mapBlock: { minWidth: 0 },
  mapWrap: {
    position: 'relative',
    paddingBottom: '56.25%',
    height: 0,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e8eaed',
    background: '#e8eaed',
  },
  mapIframe: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' },
  linkMap: { color: '#1a73e8', fontWeight: 600, textDecoration: 'underline' },
  socialRow: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  socialBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 18px',
    background: '#fff',
    color: '#1a1a1a',
    border: '1px solid #dadce0',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
    boxShadow: '0 1px 2px rgba(60,64,67,.12)',
  },
}
