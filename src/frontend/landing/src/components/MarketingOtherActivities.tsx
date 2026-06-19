import { useMemo, useState, type CSSProperties } from 'react'
import type { OtherActivityItem } from '../api'
import { toYoutubeEmbedUrl } from '../utils/youtubeEmbed'

type Lang = 'tr' | 'en'

const COPY = {
  tr: {
    title: 'Diğer Aktivitelerimiz',
    tripTimes: 'Sefer Saatleri',
    departure: 'Kalkış Yeri',
    duration: 'Süre',
    inclusions: 'Dahil Olanlar',
    description: 'Açıklama',
    getInfo: 'Bilgi Alın',
    close: 'Kapat',
    viewDetails: 'Detayları Gör',
  },
  en: {
    title: 'Our Other Activities',
    tripTimes: 'Departure Times',
    departure: 'Departure Point',
    duration: 'Duration',
    inclusions: 'Included',
    description: 'Description',
    getInfo: 'Get Info',
    close: 'Close',
    viewDetails: 'View Details',
  },
} as const

function buildWhatsAppHref(phone: string | null | undefined, activityName: string): string {
  const digits = (phone ?? '905354033869').replace(/\D/g, '')
  const e164 = digits.startsWith('90') ? digits : `90${digits.replace(/^0/, '')}`
  const text = encodeURIComponent(`Merhaba, "${activityName}" aktivitesi hakkında bilgi almak istiyorum.`)
  return `https://wa.me/${e164}?text=${text}`
}

function isYoutubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url)
}

interface Props {
  activities: OtherActivityItem[]
  whatsappPhone: string | null | undefined
  lang: Lang
  resolveUrl: (url: string | null | undefined) => string
}

export function MarketingOtherActivities({ activities, whatsappPhone, lang, resolveUrl }: Props) {
  const t = COPY[lang]
  const [selected, setSelected] = useState<OtherActivityItem | null>(null)
  const [mediaIndex, setMediaIndex] = useState(0)

  const activeMedia = useMemo(() => {
    if (!selected) return []
    return selected.media.map((m) => ({ ...m, url: resolveUrl(m.url) }))
  }, [selected, resolveUrl])

  if (!activities.length) return null

  const open = (item: OtherActivityItem) => {
    setSelected(item)
    setMediaIndex(0)
  }

  const current = activeMedia[mediaIndex]

  return (
    <>
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t.title}</h2>
        <div style={styles.grid}>
          {activities.map((item) => {
            const cover = resolveUrl(item.coverUrl)
            return (
              <button key={item.id} type="button" style={styles.card} onClick={() => open(item)}>
                <div style={styles.cardImageWrap}>
                  {cover ? (
                    <img src={cover} alt={item.name} style={styles.cardImage} loading="lazy" />
                  ) : (
                    <div style={styles.cardPlaceholder}>{item.name.charAt(0)}</div>
                  )}
                  <div style={styles.cardOverlay} />
                </div>
                <div style={styles.cardBody}>
                  <h3 style={styles.cardTitle}>{item.name}</h3>
                  {item.duration && <p style={styles.cardMeta}>{item.duration}</p>}
                  <span style={styles.cardCta}>{t.viewDetails}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {selected && (
        <div style={styles.backdrop} onClick={() => setSelected(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={styles.closeBtn} onClick={() => setSelected(null)} aria-label={t.close}>×</button>
            <h2 style={styles.modalTitle}>{selected.name}</h2>

            {activeMedia.length > 0 && (
              <div style={styles.gallery}>
                <div style={styles.mainMedia}>
                  {current?.kind === 'video' ? (
                    isYoutubeUrl(current.url) ? (
                      <iframe
                        src={toYoutubeEmbedUrl(current.url) ?? current.url}
                        title={selected.name}
                        style={styles.mainIframe}
                        allowFullScreen
                      />
                    ) : (
                      <video src={current.url} style={styles.mainVideo} controls />
                    )
                  ) : (
                    <img src={current?.url} alt={selected.name} style={styles.mainImage} />
                  )}
                </div>
                {activeMedia.length > 1 && (
                  <div style={styles.thumbs}>
                    {activeMedia.map((m, i) => (
                      <button
                        key={`${m.url}-${i}`}
                        type="button"
                        style={{ ...styles.thumbBtn, ...(i === mediaIndex ? styles.thumbBtnActive : {}) }}
                        onClick={() => setMediaIndex(i)}
                      >
                        {m.kind === 'video' ? (
                          <span style={styles.thumbVideo}>▶</span>
                        ) : (
                          <img src={m.url} alt="" style={styles.thumbImg} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={styles.infoGrid}>
              {selected.tripTimes && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>{t.tripTimes}</span>
                  <span style={styles.infoValue}>{selected.tripTimes}</span>
                </div>
              )}
              {selected.departurePoint && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>{t.departure}</span>
                  <span style={styles.infoValue}>{selected.departurePoint}</span>
                </div>
              )}
              {selected.duration && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>{t.duration}</span>
                  <span style={styles.infoValue}>{selected.duration}</span>
                </div>
              )}
            </div>

            {selected.description && (
              <div style={styles.block}>
                <h4 style={styles.blockTitle}>{t.description}</h4>
                <p style={styles.blockText}>{selected.description}</p>
              </div>
            )}
            {selected.inclusions && (
              <div style={styles.block}>
                <h4 style={styles.blockTitle}>{t.inclusions}</h4>
                <p style={styles.blockText}>{selected.inclusions}</p>
              </div>
            )}

            <div style={styles.footer}>
              {selected.hidePrice ? (
                <a
                  href={buildWhatsAppHref(whatsappPhone, selected.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.whatsappBtn}
                >
                  {t.getInfo}
                </a>
              ) : selected.price ? (
                <div style={styles.priceTag}>{selected.price}</div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  section: { marginBottom: 24 },
  sectionTitle: { margin: '0 0 16px', fontSize: 22, fontWeight: 700, color: '#0f172a' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },
  card: {
    border: 'none',
    padding: 0,
    textAlign: 'left',
    borderRadius: 16,
    overflow: 'hidden',
    background: '#fff',
    boxShadow: '0 8px 24px rgba(15,23,42,.1)',
    cursor: 'pointer',
    transition: 'transform .2s ease, box-shadow .2s ease',
  },
  cardImageWrap: { position: 'relative', height: 180, background: '#1e293b' },
  cardImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 48,
    fontWeight: 700,
    color: '#f97316',
  },
  cardOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, transparent 40%, rgba(15,23,42,.75))',
  },
  cardBody: { padding: '16px 18px 18px' },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  cardMeta: { margin: '6px 0 0', fontSize: 14, color: '#64748b' },
  cardCta: { display: 'inline-block', marginTop: 12, fontSize: 14, fontWeight: 600, color: '#f97316' },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,.65)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    overflowY: 'auto',
  },
  modal: {
    position: 'relative',
    background: '#fff',
    borderRadius: 20,
    padding: '24px 24px 20px',
    width: '100%',
    maxWidth: 640,
    maxHeight: '92vh',
    overflowY: 'auto',
    boxShadow: '0 20px 50px rgba(0,0,0,.25)',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    border: 'none',
    background: 'transparent',
    fontSize: 28,
    lineHeight: 1,
    cursor: 'pointer',
    color: '#64748b',
  },
  modalTitle: { margin: '0 32px 16px 0', fontSize: 24, fontWeight: 700, color: '#0f172a' },
  gallery: { marginBottom: 16 },
  mainMedia: {
    borderRadius: 12,
    overflow: 'hidden',
    background: '#0f172a',
    aspectRatio: '16/10',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImage: { width: '100%', height: '100%', objectFit: 'cover' },
  mainVideo: { width: '100%', height: '100%', objectFit: 'cover' },
  mainIframe: { width: '100%', height: '100%', border: 'none' },
  thumbs: { display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 },
  thumbBtn: {
    border: '2px solid transparent',
    borderRadius: 8,
    padding: 0,
    width: 64,
    height: 48,
    overflow: 'hidden',
    cursor: 'pointer',
    background: '#f1f5f9',
    flexShrink: 0,
  },
  thumbBtnActive: { borderColor: '#f97316' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbVideo: { fontSize: 18, color: '#0f172a' },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 12,
  },
  infoItem: {
    background: '#f8fafc',
    borderRadius: 10,
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
  },
  infoLabel: { display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: '#64748b', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  block: { marginBottom: 12 },
  blockTitle: { margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#334155' },
  blockText: { margin: 0, fontSize: 15, lineHeight: 1.55, color: '#475569', whiteSpace: 'pre-line' },
  footer: { marginTop: 8, display: 'flex', justifyContent: 'center' },
  priceTag: {
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
    padding: '12px 28px',
    borderRadius: 999,
    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    border: '1px solid #f59e0b',
  },
  whatsappBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 32px',
    borderRadius: 999,
    background: '#25D366',
    color: '#fff',
    fontWeight: 700,
    fontSize: 16,
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(37,211,102,.35)',
  },
}
