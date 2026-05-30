import { useEffect, useState } from 'react'
import { fetchBilgiLandingData, type BilgiLandingData } from '../api'

const LANG_KEY = 'tekne_bilgi_lang'
type Lang = 'tr' | 'en'

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
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
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
          {heroImageSrc ? (
            <img src={heroImageSrc} alt="" style={styles.heroBgImg} aria-hidden />
          ) : null}
          <div style={styles.heroOverlay} aria-hidden />
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>{data.tourTitle}</h1>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t ? 'Bar menüsü' : 'Bar menu'}</h2>
          {menuPdfTr || menuPdfEn ? (
            <div style={styles.menuBtnRow}>
              {menuPdfTr ? (
                <button type="button" onClick={() => setMenuPopup('tr')} style={{ ...styles.linkBtn, ...styles.menuBtnItem }}>
                  {t ? 'Menüyü görüntüle (Türkçe)' : 'View menu (Turkish)'}
                </button>
              ) : null}
              {menuPdfEn ? (
                <button type="button" onClick={() => setMenuPopup('en')} style={{ ...styles.linkBtnSecondary, ...styles.menuBtnItem }}>
                  {t ? 'Menüyü görüntüle (İngilizce)' : 'View menu (English)'}
                </button>
              ) : null}
            </div>
          ) : (
            <p style={styles.muted}>{t ? 'Menü yüklenmedi.' : 'Menu not available.'}</p>
          )}
        </section>

        {data.googleReviewsUrl && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{t ? 'Google yorumları' : 'Google reviews'}</h2>
            <a
              href={data.googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.googleReviewsBtn}
            >
              <GoogleIcon />
              <span>{t ? 'Google\'da değerlendir' : 'Rate on Google'}</span>
            </a>
          </section>
        )}

        <footer style={{ padding: 24, textAlign: 'center', color: '#666', fontSize: 14 }}>
          {t ? 'İyi eğlenceler!' : 'Have fun!'}
        </footer>
      </div>

      {menuPopup && menuPdfActive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
          onClick={() => setMenuPopup(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t ? 'Bar menüsü' : 'Bar menu'}
        >
          <div
            style={{
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '12px 16px', background: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <strong>{menuPopup === 'tr' ? (t ? 'Bar menüsü (Türkçe)' : 'Bar menu (Turkish)') : (t ? 'Bar menüsü (İngilizce)' : 'Bar menu (English)')}</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => window.open(menuPdfActive, '_blank', 'noopener,noreferrer')}
                  style={{ padding: '6px 14px', border: '1px solid #ccc', background: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                >
                  {t ? 'Yeni sekmede aç' : 'Open in new tab'}
                </button>
                <button type="button" onClick={() => setMenuPopup(null)} style={{ padding: '6px 14px', border: '1px solid #ccc', background: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                  {t ? 'Kapat' : 'Close'}
                </button>
              </div>
            </div>
            <iframe
              title={t ? 'Bar menüsü PDF' : 'Bar menu PDF'}
              src={menuPdfActive}
              style={{ flex: 1, width: '100%', border: 'none', minHeight: 400 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  pageWrap: {
    position: 'relative',
    minHeight: '100vh',
    fontFamily: 'system-ui, sans-serif',
    backgroundImage: 'url(/background.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#f8f8f8',
  },
  pageOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  pageContent: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
  },
  page: { minHeight: '100vh', background: '#f8f8f8', fontFamily: 'system-ui, sans-serif' },
  langBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #eee' },
  langBtn: { padding: '6px 12px', border: '1px solid #ccc', background: '#fff', borderRadius: 6, cursor: 'pointer' },
  langBtnActive: { background: '#1a1a1a', color: '#fff', borderColor: '#1a1a1a' },
  hero: {
    position: 'relative',
    padding: '56px 24px',
    textAlign: 'center',
    color: '#fff',
    backgroundColor: '#1a1a2e',
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
    textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
  },
  section: { padding: '32px 24px', maxWidth: 800, margin: '0 auto' },
  sectionTitle: { margin: '0 0 16px', fontSize: 20, color: '#1a1a1a' },
  menuBtnRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 10,
    width: '100%',
    alignItems: 'stretch',
  },
  menuBtnItem: {
    flex: '1 1 0',
    minWidth: 0,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 1.3,
    padding: '12px 10px',
  },
  linkBtn: { display: 'inline-block', padding: '10px 20px', background: '#1a1a1a', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 500, border: 'none', cursor: 'pointer' },
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
  linkBtnSecondary: {
    display: 'inline-block',
    padding: '10px 20px',
    background: '#fff',
    color: '#1a1a1a',
    border: '1px solid #1a1a1a',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 500,
    cursor: 'pointer',
  },
  muted: { color: '#888', margin: 0 },
}
