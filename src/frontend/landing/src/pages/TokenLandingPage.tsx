import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchLandingData, submitFeedback, type LandingData } from '../api'

const LANG_KEY = 'tekne_landing_lang'
type Lang = 'tr' | 'en'

const FEEDBACK_TYPES = [
  { value: 'Dilek', labelTr: 'Dilek', labelEn: 'Wish' },
  { value: 'İstek', labelTr: 'İstek', labelEn: 'Request' },
  { value: 'Şikayet', labelTr: 'Şikayet', labelEn: 'Complaint' },
] as const

function FeedbackForm({ token, lang }: { token: string; lang: Lang }) {
  const t = lang === 'tr'
  const [type, setType] = useState('Dilek')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [statusText, setStatusText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setStatus('idle')
    try {
      await submitFeedback(token, type, message.trim())
      setStatus('ok')
      setStatusText(t ? 'Gönderildi, teşekkür ederiz.' : 'Sent, thank you.')
      setMessage('')
    } catch (err) {
      setStatus('err')
      setStatusText(err instanceof Error ? err.message : (t ? 'Gönderilemedi.' : 'Send failed.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>{t ? 'Dilek / İstek / Şikayet' : 'Feedback'}</h2>
      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>{t ? 'Tür' : 'Type'}</label>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: '1px solid #ddd' }}>
            {FEEDBACK_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{t ? opt.labelTr : opt.labelEn}</option>
            ))}
          </select>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>{t ? 'Mesajınız' : 'Your message'}</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }} placeholder={t ? 'Dilek, istek veya şikayetinizi yazın...' : 'Write your feedback...'} />
          <button type="submit" disabled={sending} style={{ ...styles.linkBtn, border: 0, cursor: sending ? 'wait' : 'pointer' }}>{sending ? (t ? 'Gönderiliyor...' : 'Sending...') : (t ? 'Gönder' : 'Send')}</button>
        </form>
        {status === 'ok' && <p style={{ marginTop: 12, color: '#0a0' }}>{statusText}</p>}
        {status === 'err' && <p style={{ marginTop: 12, color: '#c00' }}>{statusText}</p>}
      </div>
    </section>
  )
}

function useToken(): string | null {
  const [search] = useSearchParams()
  return search.get('token')
}

/** Göreli /uploads yolları ve API'nin http döndürmesi (HTTPS sayfa + iframe karışık içerik). */
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

type PdfPopup = 'menu' | 'rules' | null

export function TokenLandingPage() {
  const token = useToken()
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || 'tr')
  const [data, setData] = useState<LandingData | null>(null)
  const [loading, setLoading] = useState(!!token)
  const [error, setError] = useState<string | null>(null)
  const [pdfPopup, setPdfPopup] = useState<PdfPopup>(null)

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang)
  }, [lang])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    setError(null)
    fetchLandingData(token)
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) {
    return (
      <div style={styles.page}>
        <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Geçerli bir link ile erişin.</p>
      </div>
    )
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
        <p style={{ textAlign: 'center', padding: '3rem', color: '#c00' }}>{error ?? 'Bu link artık aktif değil.'}</p>
      </div>
    )
  }

  const t = lang === 'tr'
  const menuPdf = t ? data.menuPdfTr : data.menuPdfEn
  const rulesPdf = t ? data.rulesPdfTr : data.rulesPdfEn
  const menuPdfUrl = resolveAssetUrl(menuPdf)
  const rulesPdfUrl = resolveAssetUrl(rulesPdf)
  const heroStyle = data.tour?.imageUrl
    ? { ...styles.hero, backgroundImage: `url(${data.tour.imageUrl})` }
    : styles.hero

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

      <section style={heroStyle}>
        <div style={styles.heroOverlay} aria-hidden />
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>{data.tour?.title ?? (t ? 'Tekne Turu' : 'Boat Tour')}</h1>
          {data.tourDate && (
            <p style={styles.heroSub}>
              {new Date(data.tourDate + 'T12:00:00').toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
          {data.customerName && <p style={styles.heroName}>{t ? 'Hoş geldiniz,' : 'Welcome,'} {data.customerName}</p>}
        </div>
      </section>

      {data.tour && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t ? 'Tur bilgileri' : 'Tour info'}</h2>
          <div style={styles.card}>
            {data.tour.departurePoint && <p><strong>{t ? 'Kalkış' : 'Departure'}:</strong> {data.tour.departurePoint}</p>}
            {data.tour.startTime && <p><strong>{t ? 'Saat' : 'Time'}:</strong> {data.tour.startTime}</p>}
            {data.tour.durationMinutes != null && <p><strong>{t ? 'Süre' : 'Duration'}:</strong> {Math.floor(data.tour.durationMinutes / 60)} {t ? 'saat' : 'h'}</p>}
            {data.tour.description && <p style={{ marginTop: 8 }}>{data.tour.description}</p>}
          </div>
        </section>
      )}

      {data.stops.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t ? 'Duraklar' : 'Stops'}</h2>
          <div style={styles.stopsGrid}>
            {data.stops.map((stop, i) => (
              <div key={i} style={styles.stopCard}>
                {stop.imageUrl && <img src={stop.imageUrl} alt={stop.name} style={styles.stopImg} />}
                <h3 style={styles.stopName}>{stop.name}</h3>
                {stop.description && <p style={styles.stopDesc}>{stop.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t ? 'Bar menüsü' : 'Bar menu'}</h2>
        {menuPdfUrl ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button type="button" onClick={() => setPdfPopup('menu')} style={styles.linkBtn}>{t ? 'Menüyü görüntüle' : 'View menu'}</button>
            <button
              type="button"
              onClick={() => window.open(menuPdfUrl, '_blank', 'noopener,noreferrer')}
              style={styles.linkBtnSecondary}
            >
              {t ? 'Yeni sekmede aç' : 'Open in new tab'}
            </button>
          </div>
        ) : (
          <p style={styles.muted}>{t ? 'Menü yüklenmedi.' : 'Menu not available.'}</p>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t ? 'Tekne kuralları' : 'Boat rules'}</h2>
        {rulesPdfUrl ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button type="button" onClick={() => setPdfPopup('rules')} style={styles.linkBtn}>{t ? 'Kuralları görüntüle' : 'View rules'}</button>
            <button
              type="button"
              onClick={() => window.open(rulesPdfUrl, '_blank', 'noopener,noreferrer')}
              style={styles.linkBtnSecondary}
            >
              {t ? 'Yeni sekmede aç' : 'Open in new tab'}
            </button>
          </div>
        ) : (
          <p style={styles.muted}>{t ? 'Kurallar yüklenmedi.' : 'Rules not available.'}</p>
        )}
      </section>

      {pdfPopup && (pdfPopup === 'menu' ? menuPdfUrl : rulesPdfUrl) && (
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
          onClick={() => setPdfPopup(null)}
          role="dialog"
          aria-modal="true"
          aria-label={pdfPopup === 'menu' ? (t ? 'Bar menüsü' : 'Bar menu') : (t ? 'Tekne kuralları' : 'Boat rules')}
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
              <strong>{pdfPopup === 'menu' ? (t ? 'Bar menüsü' : 'Bar menu') : (t ? 'Tekne kuralları' : 'Boat rules')}</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => window.open(pdfPopup === 'menu' ? menuPdfUrl : rulesPdfUrl, '_blank', 'noopener,noreferrer')}
                  style={{ padding: '6px 14px', border: '1px solid #ccc', background: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                >
                  {t ? 'Yeni sekmede aç' : 'Open in new tab'}
                </button>
                <button type="button" onClick={() => setPdfPopup(null)} style={{ padding: '6px 14px', border: '1px solid #ccc', background: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>{t ? 'Kapat' : 'Close'}</button>
              </div>
            </div>
            <iframe
              title={pdfPopup === 'menu' ? (t ? 'Bar menüsü PDF' : 'Bar menu PDF') : (t ? 'Tekne kuralları PDF' : 'Boat rules PDF')}
              src={pdfPopup === 'menu' ? menuPdfUrl : rulesPdfUrl}
              style={{ flex: 1, width: '100%', border: 'none', minHeight: 400 }}
            />
          </div>
        </div>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t ? 'Bizi takip edin' : 'Follow us'}</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {data.instagramUrl && <a href={data.instagramUrl} target="_blank" rel="noopener noreferrer" style={styles.linkBtn}>Instagram</a>}
          {data.googleReviewsUrl && <a href={data.googleReviewsUrl} target="_blank" rel="noopener noreferrer" style={styles.linkBtn}>{t ? 'Google\'da değerlendir' : 'Rate on Google'}</a>}
          {data.tripAdvisorUrl && <a href={data.tripAdvisorUrl} target="_blank" rel="noopener noreferrer" style={styles.linkBtn}>TripAdvisor</a>}
        </div>
      </section>

      <FeedbackForm token={token} lang={lang} />

      <footer style={{ padding: 24, textAlign: 'center', color: '#666', fontSize: 14 }}>
        {t ? 'İyi eğlenceler!' : 'Have fun!'}
      </footer>
      </div>
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
    padding: '48px 24px',
    textAlign: 'center',
    color: '#fff',
    backgroundImage: 'url(/banner.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#1a1a2e',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    pointerEvents: 'none',
  },
  heroContent: { position: 'relative', zIndex: 1 },
  heroTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
  },
  heroSub: {
    margin: '8px 0 0',
    opacity: 0.95,
    fontSize: 16,
    textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.7)',
  },
  heroName: {
    margin: '16px 0 0',
    fontSize: 18,
    textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.7)',
  },
  section: { padding: '32px 24px', maxWidth: 800, margin: '0 auto' },
  sectionTitle: { margin: '0 0 16px', fontSize: 20, color: '#1a1a1a' },
  card: { background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
  stopsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  stopCard: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
  stopImg: { width: '100%', height: 140, objectFit: 'cover' },
  stopName: { margin: 0, padding: 12, fontSize: 16 },
  stopDesc: { margin: 0, padding: '0 12px 12px', fontSize: 14, color: '#555' },
  linkBtn: { display: 'inline-block', padding: '10px 20px', background: '#1a1a1a', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 500 },
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
