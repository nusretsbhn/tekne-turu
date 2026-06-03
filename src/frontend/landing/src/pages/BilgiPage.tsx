import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { fetchBilgiLandingData, type BilgiLandingData } from '../api'

const LANG_KEY = 'tekne_bilgi_lang'
type Lang = 'tr' | 'en'

const C = {
  navy: '#1a2744',
  gold: '#c9a45c',
  goldMuted: 'rgba(201, 164, 92, 0.35)',
  textMuted: '#6b7280',
}

function resolveAssetUrl(url: string | null | undefined): string {
  if (!url?.trim()) return ''
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  let s = url.trim()
  if (!s.startsWith('http://') && !s.startsWith('https://')) {
    const origin = apiBase || window.location.origin
    s = s.startsWith('/') ? `${origin}${s}` : `${origin}/${s}`
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && s.startsWith('http://')) {
    s = `https://${s.slice('http://'.length)}`
  }
  return s
}

type MenuPopup = 'tr' | 'en' | null

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function ClocheIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M8 22h32l-4 14H12L8 22z" stroke={C.gold} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 22c0-6 4.5-10 10-10s10 4 10 10" stroke={C.gold} strokeWidth="1.8" />
      <circle cx="24" cy="12" r="2" fill={C.gold} />
    </svg>
  )
}

function MenuBookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" aria-hidden>
      <path d="M4 6h8v14H4V6zm12 0h4v14h-4V6z" />
      <path d="M12 6v14" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  )
}

function StarOutlineIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M24 8l3.2 9.8H38l-8 6.2 3.2 9.8L24 26.6 14.8 34l3.2-9.8-8-6.2h10.8L24 8z"
        stroke={C.gold}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ReviewsDecor() {
  return (
    <svg width="72" height="56" viewBox="0 0 72 56" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M8 12h44a6 6 0 016 6v16a6 6 0 01-6 6H20L8 44V12z" stroke={C.goldMuted} strokeWidth="1.2" fill="rgba(201,164,92,0.08)" />
      {[14, 22, 30, 38, 46].map((x, i) => (
        <path
          key={i}
          d={`M${x} 26l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.3-1.2-2.3 1.2.5-2.6-1.9-1.8 2.6-.4L${x} 26z`}
          fill={C.gold}
          opacity={0.85}
        />
      ))}
    </svg>
  )
}

function GoldSparkLine() {
  return (
    <div style={styles.sparkLineWrap} aria-hidden>
      <span style={styles.sparkLine} />
      <span style={styles.sparkStar}>✦</span>
    </div>
  )
}

function CardHeader({
  icon,
  title,
  subtitle,
  decor,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  decor?: ReactNode
}) {
  return (
    <div style={styles.cardHeader}>
      <div style={styles.cardHeaderIcon}>{icon}</div>
      <div style={styles.cardHeaderText}>
        <h2 style={styles.cardTitle}>{title}</h2>
        <p style={styles.cardSubtitle}>{subtitle}</p>
      </div>
      {decor ?? <GoldSparkLine />}
    </div>
  )
}

export function BilgiPage() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || 'tr')
  const [data, setData] = useState<BilgiLandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menuPopup, setMenuPopup] = useState<MenuPopup>(null)

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang)
  }, [lang])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchBilgiLandingData()
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const t = lang === 'tr'
  const menuPdfTr = resolveAssetUrl(data?.barMenuPdfUrlTr)
  const menuPdfEn = resolveAssetUrl(data?.barMenuPdfUrlEn)
  const menuPdfActive = menuPopup === 'tr' ? menuPdfTr : menuPopup === 'en' ? menuPdfEn : ''
  const heroImageSrc = resolveAssetUrl(data?.bannerUrl)

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ textAlign: 'center', padding: '3rem' }}>{t ? 'Yükleniyor...' : 'Loading...'}</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={styles.page}>
        <p style={{ textAlign: 'center', padding: '3rem', color: '#c00' }}>{error ?? (t ? 'Sayfa yüklenemedi.' : 'Page could not be loaded.')}</p>
      </div>
    )
  }

  return (
    <div style={styles.pageWrap}>
      <div style={styles.pageOverlay} aria-hidden />
      <div style={styles.pageContent}>
        <header style={styles.langBar}>
          <span />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setLang('tr')} style={{ ...styles.langBtn, ...(lang === 'tr' ? styles.langBtnActive : {}) }}>🇹🇷 Türkçe</button>
            <button type="button" onClick={() => setLang('en')} style={{ ...styles.langBtn, ...(lang === 'en' ? styles.langBtnActive : {}) }}>🇬🇧 English</button>
          </div>
        </header>

        <section style={styles.hero}>
          {heroImageSrc ? <img src={heroImageSrc} alt="" style={styles.heroBgImg} aria-hidden /> : null}
          <div style={styles.heroOverlay} aria-hidden />
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>{data.tourTitle}</h1>
          </div>
        </section>

        <div style={styles.cardsArea}>
          <article style={styles.premiumCard}>
            <CardHeader
              icon={<ClocheIcon />}
              title={t ? 'Bar menüsü' : 'Bar menu'}
              subtitle={t ? 'Dilediğiniz dilde menüyü inceleyin.' : 'Browse the menu in your preferred language.'}
            />
            {menuPdfTr || menuPdfEn ? (
              <div style={styles.menuActions}>
                {menuPdfTr ? (
                  <button type="button" onClick={() => setMenuPopup('tr')} style={styles.menuBtnPrimary}>
                    <MenuBookIcon />
                    <span style={styles.menuBtnLabel}>{t ? 'Menüyü görüntüle (Türkçe)' : 'View menu (Turkish)'}</span>
                    <span style={styles.menuBtnChevron}><ChevronRight /></span>
                  </button>
                ) : null}
                {menuPdfEn ? (
                  <button type="button" onClick={() => setMenuPopup('en')} style={styles.menuBtnSecondary}>
                    <GlobeIcon />
                    <span style={styles.menuBtnLabelSecondary}>{t ? 'Menüyü görüntüle (İngilizce)' : 'View menu (English)'}</span>
                    <span style={styles.menuBtnChevron}><ChevronRight /></span>
                  </button>
                ) : null}
              </div>
            ) : (
              <p style={styles.muted}>{t ? 'Menü yüklenmedi.' : 'Menu not available.'}</p>
            )}
          </article>

          {data.googleReviewsUrl ? (
            <article style={styles.premiumCard}>
              <CardHeader
                icon={<StarOutlineIcon />}
                title={t ? 'Google yorumları' : 'Google reviews'}
                subtitle={
                  t
                    ? 'Deneyiminizi paylaşın, diğer misafirlere yardımcı olun.'
                    : 'Share your experience and help other guests.'
                }
                decor={<ReviewsDecor />}
              />
              <a href={data.googleReviewsUrl} target="_blank" rel="noopener noreferrer" style={styles.googleActionBtn}>
                <GoogleIcon />
                <span style={styles.googleActionLabel}>{t ? "Google'da değerlendir" : 'Rate on Google'}</span>
                <span style={styles.menuBtnChevron}><ChevronRight /></span>
              </a>
            </article>
          ) : null}
        </div>

        <footer style={styles.footer}>
          <div style={styles.footerDivider} aria-hidden>
            <span style={styles.footerLine} />
            <span style={styles.footerAnchor} aria-hidden>⚓</span>
            <span style={styles.footerLine} />
          </div>
          <p style={styles.footerGreeting}>{t ? 'İyi eğlenceler!' : 'Have fun!'}</p>
        </footer>
      </div>

      {menuPopup && menuPdfActive ? (
        <div style={styles.modalBackdrop} onClick={() => setMenuPopup(null)} role="dialog" aria-modal="true" aria-label={t ? 'Bar menüsü' : 'Bar menu'}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <strong>
                {menuPopup === 'tr'
                  ? t
                    ? 'Bar menüsü (Türkçe)'
                    : 'Bar menu (Turkish)'
                  : t
                    ? 'Bar menüsü (İngilizce)'
                    : 'Bar menu (English)'}
              </strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => window.open(menuPdfActive, '_blank', 'noopener,noreferrer')}
                  style={styles.modalHeaderBtn}
                >
                  {t ? 'Yeni sekmede aç' : 'Open in new tab'}
                </button>
                <button type="button" onClick={() => setMenuPopup(null)} style={styles.modalHeaderBtn}>
                  {t ? 'Kapat' : 'Close'}
                </button>
              </div>
            </div>
            <iframe title={t ? 'Bar menüsü PDF' : 'Bar menu PDF'} src={menuPdfActive} style={styles.modalIframe} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  pageWrap: {
    position: 'relative',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    backgroundImage: 'url(/background.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#eef1f5',
  },
  pageOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(238, 241, 245, 0.82)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  pageContent: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
  },
  page: { minHeight: '100vh', background: '#eef1f5', fontFamily: 'system-ui, sans-serif' },
  langBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#fff',
    borderBottom: '1px solid #eee',
  },
  langBtn: { padding: '6px 12px', border: '1px solid #ccc', background: '#fff', borderRadius: 6, cursor: 'pointer' },
  langBtnActive: { background: C.navy, color: '#fff', borderColor: C.navy },
  hero: {
    position: 'relative',
    padding: '56px 24px',
    textAlign: 'center',
    color: '#fff',
    backgroundColor: C.navy,
    minHeight: 220,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroBgImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    zIndex: 0,
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  heroContent: { position: 'relative', zIndex: 2, width: '100%' },
  heroTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)',
  },
  cardsArea: {
    padding: '20px 16px 8px',
    maxWidth: 520,
    margin: '0 auto',
  },
  premiumCard: {
    background: '#fff',
    borderRadius: 20,
    padding: '22px 20px 24px',
    marginBottom: 18,
    boxShadow: '0 8px 32px rgba(26, 39, 68, 0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  cardHeaderIcon: { flexShrink: 0, lineHeight: 0 },
  cardHeaderText: { flex: 1, minWidth: 0 },
  cardTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: C.navy,
    lineHeight: 1.25,
  },
  cardSubtitle: {
    margin: '6px 0 0',
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 1.4,
  },
  sparkLineWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    paddingTop: 4,
  },
  sparkLine: {
    display: 'block',
    width: 48,
    height: 2,
    background: `linear-gradient(90deg, ${C.gold}, transparent)`,
    borderRadius: 1,
  },
  sparkStar: { color: C.gold, fontSize: 14, lineHeight: 1 },
  menuActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  menuBtnPrimary: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    borderRadius: 999,
    border: `2px solid ${C.gold}`,
    background: C.navy,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    boxSizing: 'border-box',
  },
  menuBtnSecondary: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    borderRadius: 999,
    border: `2px solid ${C.gold}`,
    background: '#fff',
    color: C.navy,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    boxSizing: 'border-box',
  },
  menuBtnLabel: { flex: 1, textAlign: 'left' },
  menuBtnLabelSecondary: { flex: 1, textAlign: 'left', color: C.navy },
  menuBtnChevron: { display: 'flex', alignItems: 'center', marginLeft: 'auto' },
  googleActionBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    background: '#fff',
    textDecoration: 'none',
    boxSizing: 'border-box',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  googleActionLabel: {
    flex: 1,
    textAlign: 'left',
    fontSize: 15,
    fontWeight: 600,
    color: C.navy,
  },
  footer: {
    padding: '8px 24px 40px',
    textAlign: 'center',
    maxWidth: 520,
    margin: '0 auto',
  },
  footerDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  footerLine: {
    flex: 1,
    height: 1,
    background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
  },
  footerAnchor: {
    color: C.gold,
    fontSize: 18,
    lineHeight: 1,
  },
  footerGreeting: {
    margin: 0,
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: 600,
    color: C.navy,
  },
  muted: { color: C.textMuted, margin: 0, fontSize: 14 },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    boxSizing: 'border-box',
  },
  modalBox: {
    background: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: '100%',
    maxHeight: '100%',
    width: 900,
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    padding: '12px 16px',
    background: '#f5f5f5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalHeaderBtn: {
    padding: '6px 14px',
    border: '1px solid #ccc',
    background: '#fff',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
  },
  modalIframe: { flex: 1, width: '100%', border: 'none', minHeight: 400 },
}
