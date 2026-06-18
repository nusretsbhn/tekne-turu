import type { PersonForm } from '../types'
import { validatePerson } from '../validation'
import { formatPhoneInput } from '../phoneInput'

const CONSENT_TEXT_URL = '/api/legal/consent'

const styles = {
  card: { marginBottom: 12, border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' as const },
  header: { padding: '12px 16px', background: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  body: { padding: 16, background: '#fff' },
  row: { display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 },
  full: { marginBottom: 12 },
  label: { display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 },
  labelEn: { fontSize: 12, color: '#888', fontWeight: 400 },
  required: { color: '#c00', marginLeft: 2 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  consentLink: { color: '#0b57d0', textDecoration: 'underline' },
  btnRemove: { padding: '6px 12px', background: '#c00', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 14 },
}

interface PersonCardProps {
  person: PersonForm
  index: number
  canRemove: boolean
  expanded: boolean
  onToggle: () => void
  onChange: (updates: Partial<PersonForm>) => void
  onRemove: () => void
  tourDate: string
  onTourDateChange: (value: string) => void
}

export function PersonCard({ person, index, canRemove, expanded, onToggle, onChange, onRemove, tourDate, onTourDateChange }: PersonCardProps) {
  const err = validatePerson(person, tourDate)
  const label = person.fullName?.trim() ? `Kişi ${index + 1} – ${person.fullName.trim()}${err ? '' : ' ✓'}` : `Kişi ${index + 1}`

  return (
    <div style={styles.card}>
      <div style={styles.header} onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onToggle()}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 18 }}>{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div style={styles.body} onClick={(e) => e.stopPropagation()}>
          <div style={styles.full}>
            <label style={styles.label}>
              Tur Tarihi <span style={styles.labelEn}>/ Tour Date</span> <span style={styles.required}>*</span>
            </label>
            <input
              type="date"
              style={styles.input}
              value={tourDate}
              onChange={(e) => onTourDateChange(e.target.value)}
              required
            />
          </div>
          <div style={styles.row}>
            <div style={styles.full}>
              <label style={styles.label}>Ad Soyad <span style={styles.labelEn}>/ Full Name</span> <span style={styles.required}>*</span></label>
              <input style={styles.input} value={person.fullName} onChange={(e) => onChange({ fullName: e.target.value })} placeholder="En az 3 karakter" required />
            </div>
          </div>
          <div style={styles.full}>
            <label style={styles.label}>Telefon <span style={styles.labelEn}>/ Phone</span></label>
            <input
              type="tel"
              inputMode="numeric"
              style={styles.input}
              value={person.phone}
              onChange={(e) => onChange({ phone: formatPhoneInput(e.target.value) })}
              placeholder="05xx xxx xx xx"
            />
          </div>
          <div style={styles.full}>
            <label style={styles.label}>Konaklama Yeri <span style={styles.labelEn}>/ Accommodation</span></label>
            <input style={styles.input} value={person.accommodationPlace} onChange={(e) => onChange({ accommodationPlace: e.target.value })} placeholder="Otel adı vb." />
          </div>
          <div style={styles.checkRow}>
            <input type="checkbox" id={`kvkk-${person.id}`} checked={person.kvkkConsent} onChange={(e) => onChange({ kvkkConsent: e.target.checked })} required />
            <label htmlFor={`kvkk-${person.id}`}>
              <a href={CONSENT_TEXT_URL} target="_blank" rel="noopener noreferrer" style={styles.consentLink} onClick={(e) => e.stopPropagation()}>KVKK</a> aydınlatma metnini okudum, kabul ediyorum. <span style={styles.labelEn}>/ I accept the KVKK.</span> <span style={styles.required}>*</span>
            </label>
          </div>
          <div style={styles.checkRow}>
            <input type="checkbox" id={`sms-${person.id}`} checked={person.smsConsent} onChange={(e) => onChange({ smsConsent: e.target.checked })} required />
            <label htmlFor={`sms-${person.id}`}>
              <a href={CONSENT_TEXT_URL} target="_blank" rel="noopener noreferrer" style={styles.consentLink} onClick={(e) => e.stopPropagation()}>Pazarlama</a> ve bilgilendirme SMS'leri almak istiyorum. <span style={styles.labelEn}>/ I agree to receive SMS.</span> <span style={styles.required}>*</span>
            </label>
          </div>
          {canRemove && <button type="button" style={styles.btnRemove} onClick={onRemove}>Kişiyi Kaldır</button>}
        </div>
      )}
    </div>
  )
}
