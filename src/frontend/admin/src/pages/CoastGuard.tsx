import { useEffect, useState, useRef, type CSSProperties } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchCoastGuard, type CoastGuardRow } from '../api'

function todayStr() {
  const t = new Date()
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

/** Seçilen tur günü — YYYY-MM-DD → GG.AA.YYYY (yazdırma / form) */
function formatTourDateTr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return iso
  const [, y, mo, d] = m
  return `${d}.${mo}.${y}`
}

const COAST_GUARD_FORM = {
  boatName: 'VİKİNG ÖLÜDENİZ',
  port: 'FETHİYE - 397',
  engine: 'BAUDOUIN - 450 BHP + 450 BHP',
  shipowner: 'Zirvesan Tur.İnş. Eml.Taş. San ve Tic. Ltd. Şti',
  shipownerTaxNo: '9980820165',
  captain: 'ÜMİT UÇAK',
  captainTc: '',
  sailor1: '',
  sailor1Tc: '',
  sailor2: '',
  sailor2Tc: '',
  captainContact: '',
  tourName: 'ÖLÜDENİZ KELEBEKLER VADİSİ TEKNE TURU',
} as const

const PRINT_STYLES = `
  body { font-family: system-ui, Segoe UI, sans-serif; padding: 24px; font-size: 11pt; }
  .cg-title { text-align: center; font-weight: 700; font-size: 13pt; margin: 0 0 14px; letter-spacing: 0.02em; }
  .cg-table { width: 100%; border-collapse: collapse; margin-bottom: 0; table-layout: fixed; }
  .cg-table td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; }
  .cg-table .cg-lab { width: 22%; font-weight: 600; text-transform: uppercase; font-size: 9pt; background: #fafafa; }
  .cg-table .cg-val { font-size: 10pt; }
  .cg-table .cg-val-caps { text-transform: uppercase; }
  .cg-tour td.cg-lab { text-transform: uppercase; }
  .cg-tour td.cg-lab-mixed { text-transform: none; font-weight: 600; }
  .cg-date-cell { text-align: right; font-weight: 600; }
  .cg-passenger-title { margin: 18px 0 8px; font-size: 11pt; font-weight: 600; }
  .cg-list { width: 100%; border-collapse: collapse; }
  .cg-list th, .cg-list td { border: 1px solid #000; padding: 8px; text-align: left; }
  .cg-list th { background: #f0f0f0; font-size: 10pt; }
`

function coastGuardHeaderHtml(tourDateFormatted: string): string {
  const f = COAST_GUARD_FORM
  return `
  <div class="cg-title">GÜNLÜK YOLCU LİSTESİ</div>
  <table class="cg-table">
    <colgroup><col style="width:22%" /><col style="width:28%" /><col style="width:22%" /><col style="width:28%" /></colgroup>
    <tr>
      <td class="cg-lab">TEKNE ADI</td>
      <td class="cg-val cg-val-caps" colspan="3">${escapeHtml(f.boatName)}</td>
    </tr>
    <tr>
      <td class="cg-lab">LİMANI</td>
      <td class="cg-val">${escapeHtml(f.port)}</td>
      <td class="cg-lab">MAKİNA GÜCÜ VE MARKASI</td>
      <td class="cg-val">${escapeHtml(f.engine)}</td>
    </tr>
    <tr>
      <td class="cg-lab">DONATAN</td>
      <td class="cg-val">${escapeHtml(f.shipowner)}</td>
      <td class="cg-lab">DONATAN TC/V.NO</td>
      <td class="cg-val">${escapeHtml(f.shipownerTaxNo)}</td>
    </tr>
    <tr>
      <td class="cg-lab">KAPTAN</td>
      <td class="cg-val">${escapeHtml(f.captain)}</td>
      <td class="cg-lab">KAPTAN T.C</td>
      <td class="cg-val">${escapeHtml(f.captainTc)}</td>
    </tr>
    <tr>
      <td class="cg-lab">GEMİCİ</td>
      <td class="cg-val">${escapeHtml(f.sailor1)}</td>
      <td class="cg-lab">GEMİCİ T.C</td>
      <td class="cg-val">${escapeHtml(f.sailor1Tc)}</td>
    </tr>
    <tr>
      <td class="cg-lab">GEMİCİ</td>
      <td class="cg-val">${escapeHtml(f.sailor2)}</td>
      <td class="cg-lab">GEMİCİ T.C</td>
      <td class="cg-val">${escapeHtml(f.sailor2Tc)}</td>
    </tr>
  </table>
  <table class="cg-table cg-tour" style="margin-top:-1px">
    <colgroup><col style="width:22%" /><col style="width:78%" /></colgroup>
    <tr>
      <td class="cg-lab">KAPTAN İRTİBAT NO</td>
      <td class="cg-val">${escapeHtml(f.captainContact)}</td>
    </tr>
    <tr>
      <td class="cg-lab cg-lab-mixed">Tur Adı</td>
      <td class="cg-val cg-val-caps">${escapeHtml(f.tourName)}</td>
    </tr>
    <tr>
      <td class="cg-lab cg-lab-mixed">Tur Tarihi</td>
      <td class="cg-val cg-date-cell">${escapeHtml(tourDateFormatted)}</td>
    </tr>
  </table>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function CoastGuardFormHeader({ tourDateFormatted }: { tourDateFormatted: string }) {
  const f = COAST_GUARD_FORM
  const cell: CSSProperties = {
    border: '1px solid #000',
    padding: '6px 8px',
    verticalAlign: 'middle',
  }
  const lab: CSSProperties = {
    ...cell,
    width: '22%',
    fontWeight: 600,
    textTransform: 'uppercase',
    fontSize: '9pt',
    background: '#fafafa',
  }
  const val: CSSProperties = { ...cell, fontSize: '10pt' }
  const valCaps: CSSProperties = { ...val, textTransform: 'uppercase' }
  const dateCell: CSSProperties = { ...val, textAlign: 'right', fontWeight: 600 }
  const labMixed: CSSProperties = { ...lab, textTransform: 'none' }

  return (
    <>
      <div
        style={{
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '13pt',
          margin: '0 0 14px',
          letterSpacing: '0.02em',
        }}
      >
        GÜNLÜK YOLCU LİSTESİ
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td style={lab}>TEKNE ADI</td>
            <td style={valCaps} colSpan={3}>
              {f.boatName}
            </td>
          </tr>
          <tr>
            <td style={lab}>LİMANI</td>
            <td style={val}>{f.port}</td>
            <td style={lab}>MAKİNA GÜCÜ VE MARKASI</td>
            <td style={val}>{f.engine}</td>
          </tr>
          <tr>
            <td style={lab}>DONATAN</td>
            <td style={val}>{f.shipowner}</td>
            <td style={lab}>DONATAN TC/V.NO</td>
            <td style={val}>{f.shipownerTaxNo}</td>
          </tr>
          <tr>
            <td style={lab}>KAPTAN</td>
            <td style={val}>{f.captain}</td>
            <td style={lab}>KAPTAN T.C</td>
            <td style={val}>{f.captainTc}</td>
          </tr>
          <tr>
            <td style={lab}>GEMİCİ</td>
            <td style={val}>{f.sailor1 || '\u00A0'}</td>
            <td style={lab}>GEMİCİ T.C</td>
            <td style={val}>{f.sailor1Tc || '\u00A0'}</td>
          </tr>
          <tr>
            <td style={lab}>GEMİCİ</td>
            <td style={val}>{f.sailor2 || '\u00A0'}</td>
            <td style={lab}>GEMİCİ T.C</td>
            <td style={val}>{f.sailor2Tc || '\u00A0'}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: -1 }}>
        <tbody>
          <tr>
            <td style={{ ...lab, width: '22%' }}>KAPTAN İRTİBAT NO</td>
            <td style={{ ...val, width: '78%' }}>{f.captainContact || '\u00A0'}</td>
          </tr>
          <tr>
            <td style={labMixed}>Tur Adı</td>
            <td style={valCaps}>{f.tourName}</td>
          </tr>
          <tr>
            <td style={labMixed}>Tur Tarihi</td>
            <td style={dateCell}>{tourDateFormatted}</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

export function CoastGuard() {
  const { token } = useAuth()
  const [date, setDate] = useState(todayStr())
  const [list, setList] = useState<CoastGuardRow[]>([])
  const [error, setError] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  const tourDateFormatted = formatTourDateTr(date)

  useEffect(() => {
    if (!token) return
    setError('')
    fetchCoastGuard(token, date).then(setList).catch(() => setError('Liste alınamadı.'))
  }, [token, date])

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const title = `${tourDateFormatted} tarihli Viking Ölüdeniz Yolcu Listesi`
    const header = coastGuardHeaderHtml(tourDateFormatted)
    const rows = list
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.fullName)}</td><td>${r.phone ? escapeHtml(r.phone) : '—'}</td><td>${escapeHtml(r.nationality)}</td><td>${escapeHtml(r.idNumber)}</td><td>${r.birthDate ? escapeHtml(new Date(r.birthDate).toLocaleDateString('tr-TR')) : '—'}</td></tr>`
      )
      .join('')
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
      <style>${PRINT_STYLES}</style></head><body>
      ${header}
      <p class="cg-passenger-title">${escapeHtml(title)}</p>
      <table class="cg-list"><thead><tr><th>Ad Soyad</th><th>Telefon</th><th>Uyruk</th><th>TC/Pasaport</th><th>Doğum Tarihi</th></tr></thead><tbody>
      ${rows}
      </tbody></table></body></html>`)
    w.document.close()
    w.print()
    w.close()
  }

  return (
    <div>
      <h1 className="page-title">Sahil Güvenlik Listesi</h1>
      <div className="toolbar">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="cg-date">Tarih</label>
          <input id="cg-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto', minWidth: 140 }} />
        </div>
        <button type="button" onClick={handlePrint} className="btn btn-primary">
          Yazdır / PDF
        </button>
      </div>
      {error && <p className="msg-error">{error}</p>}
      <p style={{ marginBottom: 8, color: 'var(--color-text-muted)' }}>İlk 115 kişi (kayıt sırasına göre)</p>
      <div className="card" style={{ padding: 16, marginBottom: 16 }} ref={printRef}>
        <CoastGuardFormHeader tourDateFormatted={tourDateFormatted} />
        <p style={{ margin: '18px 0 8px', fontSize: '11pt', fontWeight: 600 }}>
          {tourDateFormatted} tarihli Viking Ölüdeniz Yolcu Listesi
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>Uyruk</th>
                <th>TC/Pasaport</th>
                <th>Doğum Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={i}>
                  <td>{r.fullName}</td>
                  <td>{r.phone ?? '—'}</td>
                  <td>{r.nationality}</td>
                  <td>{r.idNumber}</td>
                  <td>{r.birthDate ? new Date(r.birthDate).toLocaleDateString('tr-TR') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {list.length === 0 && !error && <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Kayıt yok.</p>}
    </div>
  )
}
