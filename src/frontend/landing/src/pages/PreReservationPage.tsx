import { useEffect, useState, type CSSProperties } from 'react'
import { fetchMarketingLandingData } from '../api'
import { PreReservationForm } from '../components/PreReservationForm'
import type { PreReservationLang } from '../i18n/preReservation'
export function PreReservationPage() {
  const [lang, setLang] = useState<PreReservationLang>('tr')
  const [tourTitle, setTourTitle] = useState<string | null>(null)

  useEffect(() => {
    fetchMarketingLandingData()
      .then((d) => setTourTitle(d.tourTitle?.trim() || null))
      .catch(() => {
        /* başlık opsiyonel */
      })
  }, [])

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.langSwitch}>
          <button
            type="button"
            style={{ ...styles.langBtn, ...(lang === 'tr' ? styles.langBtnActive : {}) }}
            onClick={() => setLang('tr')}
          >
            TR
          </button>
          <button
            type="button"
            style={{ ...styles.langBtn, ...(lang === 'en' ? styles.langBtnActive : {}) }}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>
        {tourTitle && <p style={styles.brand}>{tourTitle}</p>}
        <PreReservationForm lang={lang} variant="page" />
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 45%, #f5f5f5 45%)',
    fontFamily: 'system-ui, sans-serif',
    padding: '32px 16px 48px',
    boxSizing: 'border-box',
  },
  card: {
    maxWidth: 480,
    margin: '0 auto',
    background: '#fff',
    borderRadius: 20,
    padding: '28px 24px 24px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
  },
  langSwitch: {
    display: 'flex',
    justifyContent: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
    width: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  langBtn: {
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    padding: '8px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 14,
  },
  langBtnActive: {
    background: '#0f172a',
    color: '#fff',
  },
  brand: {
    margin: '0 0 4px',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: '#f97316',
    letterSpacing: '0.02em',
  },
}
