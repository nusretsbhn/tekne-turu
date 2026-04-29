import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSmsTemplates, updateSmsTemplate, fetchCustomers, sendBulkSms, type SmsTemplateItem, type CustomerListItem } from '../api'

const SMS_TEMPLATE_TITLES: Record<string, string> = {
  'booking-confirmation': 'Rezervasyon onayı',
  'tour-end-thanks': 'Tur sonu teşekkür',
  'service-info': 'Servis bilgilendirme',
  'ticket-desk': 'Bilet kes — Desk yolcu kaydı',
}

const SMS_TEMPLATE_HINTS: Record<string, string> = {
  'ticket-desk':
    'Yer tutucular: {TourDate} (tur tarihi, örn. 28.03.2026), {DeskUrl} (Ayarlar → Desk kayıt sayfası URL), {TicketUrl} (kesilen bilet görsel linki). Metni buradan düzenleyebilirsiniz.',
}

export function Sms() {
  const { token } = useAuth()
  const [templates, setTemplates] = useState<SmsTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ contentTR: '', contentEN: '', isActive: true })
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'templates' | 'send'>('templates')
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', search: '' })
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkMessage, setBulkMessage] = useState('')

  useEffect(() => {
    if (!token) return
    if (tab === 'templates') {
      setLoading(true)
      fetchSmsTemplates(token).then(setTemplates).finally(() => setLoading(false))
    }
  }, [token, tab])

  const startEdit = (t: SmsTemplateItem) => {
    setEditingId(t.id)
    setEditForm({ contentTR: t.contentTR ?? '', contentEN: t.contentEN ?? '', isActive: t.isActive })
  }
  const saveTemplate = async () => {
    if (!token || editingId == null) return
    setMessage('')
    updateSmsTemplate(token, editingId, editForm)
      .then(() => { setEditingId(null); fetchSmsTemplates(token).then(setTemplates); setMessage('Kaydedildi.'); })
      .catch(() => setMessage('Kaydedilemedi.'))
  }

  const loadCustomers = () => {
    if (!token) return
    setCustomersLoading(true)
    setMessage('')
    fetchCustomers(token, { dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined, search: filters.search || undefined, limit: 500 })
      .then(setCustomers)
      .then(() => setSelectedIds(new Set()))
      .catch(() => setMessage('Müşteri listesi yüklenemedi.'))
      .finally(() => setCustomersLoading(false))
  }
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAll = () => {
    const canReceive = customers.filter((c) => (c.nationality?.toUpperCase() === 'TR' && c.phone?.trim())).map((c) => c.id)
    setSelectedIds((prev) => (prev.size === canReceive.length ? new Set() : new Set(canReceive)))
  }
  const sendBulk = async () => {
    if (!token || selectedIds.size === 0 || !bulkMessage.trim()) {
      setMessage(selectedIds.size === 0 ? 'En az bir müşteri seçin.' : 'Mesaj metni girin.')
      return
    }
    setSendLoading(true)
    setMessage('')
    sendBulkSms(token, Array.from(selectedIds), bulkMessage.trim())
      .then((r) => setMessage(`${r.sent} kişiye gönderildi, ${r.skipped} atlandı (TR uyruklu ve telefonu olanlara gider).`))
      .catch((e) => setMessage(e instanceof Error ? e.message : 'Gönderilemedi.'))
      .finally(() => setSendLoading(false))
  }
  const canReceive = (c: CustomerListItem) => (c.nationality?.trim().toUpperCase() === 'TR' && !!c.phone?.trim())

  return (
    <div>
      <h1 className="page-title">SMS</h1>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setTab('templates')} className={`btn ${tab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}>Şablonlar</button>
        <button type="button" onClick={() => setTab('send')} className={`btn ${tab === 'send' ? 'btn-primary' : 'btn-secondary'}`}>SMS Gönder</button>
      </div>
      {message && <p className={message.includes('Kaydedildi') || message.includes('gönderildi') ? 'msg-success' : 'msg-error'}>{message}</p>}

      {tab === 'templates' && (
        <>
          <p style={{ marginBottom: 16, color: 'var(--color-text-muted)', fontSize: 14, maxWidth: 720 }}>
            Bilet kesildikten sonra gönderilen SMS, <strong>ticket-desk</strong> şablonundan gider. Link adresini <strong>Ayarlar → Desk kayıt sayfası URL</strong> ile değiştirebilirsiniz.
          </p>
          {loading && <p>Yükleniyor...</p>}
          {!loading && templates.length === 0 && <p style={{ color: '#666' }}>Şablon yok.</p>}
          {!loading && templates.map((t) => (
            <div key={t.id} className="card card-md" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <strong>{SMS_TEMPLATE_TITLES[t.templateKey] ?? t.templateKey}</strong>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: 'var(--color-text-muted)', marginTop: 4 }}>{t.templateKey}</span>
                </div>
                {editingId !== t.id && <button type="button" onClick={() => startEdit(t)} className="btn btn-secondary btn-sm">Düzenle</button>}
              </div>
              {SMS_TEMPLATE_HINTS[t.templateKey] && (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>{SMS_TEMPLATE_HINTS[t.templateKey]}</p>
              )}
              {editingId === t.id ? (
                <div>
                  <div className="form-group">
                    <label>Metin (TR)</label>
                    <textarea value={editForm.contentTR} onChange={(e) => setEditForm((f) => ({ ...f, contentTR: e.target.value }))} rows={2} />
                  </div>
                  <div className="form-group">
                    <label>Metin (EN)</label>
                    <textarea value={editForm.contentEN} onChange={(e) => setEditForm((f) => ({ ...f, contentEN: e.target.value }))} rows={2} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} />
                    Aktif
                  </label>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={saveTemplate} className="btn btn-primary">Kaydet</button>
                    <button type="button" onClick={() => setEditingId(null)} className="btn btn-secondary">İptal</button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: '#444' }}>{t.contentTR || t.contentEN || '—'}</p>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'send' && (
        <>
          <p style={{ marginBottom: 12, color: 'var(--color-text-muted)', fontSize: 14 }}>Sadece uyruğu Türkiye (TR) ve telefonu kayıtlı müşterilere SMS gider.</p>
          <div className="toolbar">
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} aria-label="Başlangıç" />
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} aria-label="Bitiş" />
            <input type="text" placeholder="İsim / telefon / e-posta ara" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
            <button type="button" onClick={loadCustomers} disabled={customersLoading} className="btn btn-primary">{customersLoading ? 'Yükleniyor...' : 'Müşterileri listele'}</button>
          </div>
          {customers.length > 0 && (
            <>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" onClick={selectAll} className="btn btn-secondary btn-sm">TR ve telefonu olanları tümünü seç / kaldır</button>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{selectedIds.size} seçili</span>
              </div>
              <div className="form-group">
                <label>Mesaj metni</label>
                <textarea value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} rows={3} placeholder="Göndermek istediğiniz SMS metnini yazın" />
              </div>
              <button type="button" onClick={sendBulk} disabled={sendLoading || selectedIds.size === 0 || !bulkMessage.trim()} className="btn btn-primary" style={{ marginBottom: 16 }}>{sendLoading ? 'Gönderiliyor...' : 'Seçilenlere gönder'}</button>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th />
                      <th>Ad Soyad</th>
                      <th>Telefon</th>
                      <th>Uyruk</th>
                      <th>SMS gider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} disabled={!canReceive(c)} title={!canReceive(c) ? 'Sadece TR uyruklu ve telefonu olanlar seçilebilir' : ''} />
                        </td>
                        <td>{c.fullName}</td>
                        <td>{c.phone ?? '—'}</td>
                        <td>{c.nationality ?? '—'}</td>
                        <td style={{ color: canReceive(c) ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{canReceive(c) ? 'Evet' : 'Hayır'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {!customersLoading && customers.length === 0 && filters.dateFrom + filters.dateTo + filters.search === '' && <p style={{ color: 'var(--color-text-muted)' }}>Filtreleri doldurup &quot;Müşterileri listele&quot; ile listeleyin.</p>}
          {!customersLoading && customers.length === 0 && (filters.dateFrom || filters.dateTo || filters.search) && <p style={{ color: 'var(--color-text-muted)' }}>Bu filtreye uyan müşteri bulunamadı.</p>}
        </>
      )}
    </div>
  )
}
