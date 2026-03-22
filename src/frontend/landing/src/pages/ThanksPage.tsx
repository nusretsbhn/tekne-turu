import { useState, useEffect } from 'react'
import { fetchThanksSettings, type ThanksSettings } from '../api'

/** Teşekkür sayfası — Google yorum butonu sabit adres (ayarlardan okunmaz). */
const GOOGLE_REVIEW_BUTTON_URL = 'https://vikingoludeniz.xyz/landing/thanks'

export function ThanksPage() {
  const [settings, setSettings] = useState<ThanksSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchThanksSettings()
      .then(setSettings)
      .catch(() => setError('Sayfa yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.page}>
        <p style={{ textAlign: 'center', padding: '3rem', color: '#c00' }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>Viking Ölüdeniz Tekne Turu</h1>
        <p style={styles.heroSub}>Bizi tercih ettiğiniz için teşekkür ederiz</p>
        <p style={styles.heroText}>
          {settings?.thanksPageDescription ?? 'Deneyiminizi paylaşın — Google, Instagram ve TripAdvisor üzerinden bizi puanlamayı ve takip etmeyi unutmayın.'}
        </p>
      </section>

      <section style={styles.section}>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Bizi değerlendirin</h2>
          <div style={styles.buttons}>
            <a
              href={GOOGLE_REVIEW_BUTTON_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.btn}
            >
              <span style={styles.btnIcon}>⭐</span>
              Google'dan yorum yap
            </a>
            {settings?.instagramUrl && (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.btn}
              >
                <span style={styles.btnIcon}>📷</span>
                Instagram'dan takip et
              </a>
            )}
            {settings?.tripAdvisorUrl && (
              <a
                href={settings.tripAdvisorUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.btn}
              >
                <span style={styles.btnIcon}>🌍</span>
                TripAdvisor'dan puanla
              </a>
            )}
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        İyi günler dileriz — Viking Ölüdeniz Tekne Turu
      </footer>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f3460 0%, #16213e 50%, #1a1a2e 100%)',
    fontFamily: 'system-ui, sans-serif',
    color: '#fff',
  },
  hero: {
    padding: '56px 24px 48px',
    textAlign: 'center',
  },
  heroTitle: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  heroSub: {
    margin: '12px 0 0',
    fontSize: 20,
    opacity: 0.95,
  },
  heroText: {
    margin: '20px 24px 0',
    maxWidth: 420,
    marginLeft: 'auto',
    marginRight: 'auto',
    fontSize: 15,
    lineHeight: 1.5,
    opacity: 0.9,
  },
  section: {
    padding: '0 24px 48px',
    maxWidth: 420,
    margin: '0 auto',
  },
  card: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    borderRadius: 16,
    padding: 28,
    border: '1px solid rgba(255,255,255,0.12)',
  },
  sectionTitle: {
    margin: '0 0 20px',
    fontSize: 18,
    fontWeight: 600,
    textAlign: 'center',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '14px 20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1a1a2e',
    borderRadius: 12,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 15,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  btnIcon: {
    fontSize: 20,
  },
  footer: {
    padding: 32,
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.8,
  },
}
