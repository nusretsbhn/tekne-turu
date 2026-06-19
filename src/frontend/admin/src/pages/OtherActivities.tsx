import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  createOtherActivity,
  deleteOtherActivity,
  fetchOtherActivities,
  reorderOtherActivities,
  updateOtherActivity,
  uploadFile,
  type ActivityMediaItem,
  type OtherActivityItem,
} from '../api'

type ActivityForm = {
  name: string
  tripTimes: string
  departurePoint: string
  duration: string
  description: string
  inclusions: string
  price: string
  hidePrice: boolean
  media: ActivityMediaItem[]
  isActive: boolean
}

const emptyForm = (): ActivityForm => ({
  name: '',
  tripTimes: '',
  departurePoint: '',
  duration: '',
  description: '',
  inclusions: '',
  price: '',
  hidePrice: false,
  media: [],
  isActive: true,
})

function parseMediaJson(json: string | null): ActivityMediaItem[] {
  if (!json?.trim()) return []
  try {
    const parsed = JSON.parse(json) as ActivityMediaItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((m) => m?.url)
      .map((m) => ({
        url: m.url,
        kind: m.kind === 'video' ? 'video' : 'image',
        isCover: !!m.isCover,
      }))
  } catch {
    return []
  }
}

function itemToForm(item: OtherActivityItem): ActivityForm {
  return {
    name: item.name,
    tripTimes: item.tripTimes ?? '',
    departurePoint: item.departurePoint ?? '',
    duration: item.duration ?? '',
    description: item.description ?? '',
    inclusions: item.inclusions ?? '',
    price: item.price ?? '',
    hidePrice: item.hidePrice,
    media: parseMediaJson(item.mediaJson),
    isActive: item.isActive,
  }
}

function coverUrl(media: ActivityMediaItem[]): string | null {
  return media.find((m) => m.isCover && m.kind === 'image')?.url ?? media.find((m) => m.kind === 'image')?.url ?? null
}

function setCover(media: ActivityMediaItem[], index: number): ActivityMediaItem[] {
  return media.map((m, i) => ({ ...m, isCover: m.kind === 'image' && i === index }))
}

export function OtherActivities() {
  const { token } = useAuth()
  const [list, setList] = useState<OtherActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ActivityForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const dragFrom = useRef<number | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    if (!token) return
    setLoading(true)
    fetchOtherActivities(token)
      .then(setList)
      .catch(() => setError('Liste alınamadı.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [token])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
    setError('')
  }

  const openEdit = (item: OtherActivityItem) => {
    setEditingId(item.id)
    setForm(itemToForm(item))
    setModalOpen(true)
    setError('')
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const payloadFromForm = (f: ActivityForm) => ({
    name: f.name.trim(),
    tripTimes: f.tripTimes.trim() || null,
    departurePoint: f.departurePoint.trim() || null,
    duration: f.duration.trim() || null,
    description: f.description.trim() || null,
    inclusions: f.inclusions.trim() || null,
    price: f.price.trim() || null,
    hidePrice: f.hidePrice,
    mediaJson: JSON.stringify(f.media),
    isActive: f.isActive,
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !form.name.trim()) return
    setSaving(true)
    setError('')
    try {
      const body = payloadFromForm(form)
      if (editingId) await updateOtherActivity(token, editingId, body)
      else await createOtherActivity(token, body)
      closeModal()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!token || !confirm('Bu aktiviteyi silmek istediğinize emin misiniz?')) return
    setError('')
    deleteOtherActivity(token, id).then(load).catch(() => setError('Silinemedi.'))
  }

  const moveCard = async (index: number, direction: 'up' | 'down') => {
    if (!token) return
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= list.length) return
    const orderedIds = list.map((a) => a.id)
    ;[orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]]
    reorderOtherActivities(token, orderedIds).then(load).catch(() => setError('Sıra güncellenemedi.'))
  }

  const handleUpload = async (file: File, kind: 'image' | 'video') => {
    if (!token) return
    setUploading(true)
    setError('')
    try {
      const { url } = await uploadFile(token, file)
      setForm((f) => {
        const media = [...f.media, { url, kind, isCover: false }]
        if (kind === 'image' && !media.some((m) => m.isCover && m.kind === 'image')) {
          const idx = media.length - 1
          return { ...f, media: setCover(media, idx) }
        }
        return { ...f, media }
      })
    } catch {
      setError('Dosya yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  const onMediaDragStart = (index: number) => {
    dragFrom.current = index
  }

  const onMediaDrop = (index: number) => {
    if (dragFrom.current === null) return
    setForm((f) => {
      const next = [...f.media]
      const [item] = next.splice(dragFrom.current!, 1)
      next.splice(index, 0, item)
      return { ...f, media: next }
    })
    dragFrom.current = null
  }

  const onMediaDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  if (loading) return <p>Yükleniyor...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Diğer Aktiviteler</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>+ Yeni Ekle</button>
      </div>
      {error && <p className="msg-error">{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {list.map((item, index) => {
          const media = parseMediaJson(item.mediaJson)
          const thumb = coverUrl(media)
          return (
            <div key={item.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ height: 160, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {thumb ? (
                  <img src={thumb} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>Görsel yok</span>
                )}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: 17 }}>{item.name}</h3>
                  <span style={{ fontSize: 12, color: item.isActive ? '#0a0' : '#999' }}>{item.isActive ? 'Aktif' : 'Pasif'}</span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 14, color: '#64748b' }}>
                  {item.hidePrice ? 'Gizli fiyat' : item.price || 'Fiyat yok'}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" className="btn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => openEdit(item)}>Düzenle</button>
                  <button type="button" onClick={() => moveCard(index, 'up')} disabled={index === 0} style={{ padding: '6px 8px' }}>↑</button>
                  <button type="button" onClick={() => moveCard(index, 'down')} disabled={index === list.length - 1} style={{ padding: '6px 8px' }}>↓</button>
                  <button type="button" onClick={() => handleDelete(item.id)} style={{ padding: '6px 10px', fontSize: 13, background: '#c00', color: '#fff', border: 0, borderRadius: 6 }}>Sil</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {list.length === 0 && <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Henüz aktivite yok.</p>}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }} onClick={closeModal}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 720, marginTop: 24, marginBottom: 24 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'Aktiviteyi Düzenle' : 'Yeni Aktivite'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Aktivite Adı *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label>Sefer Saatleri</label>
                  <input value={form.tripTimes} onChange={(e) => setForm((f) => ({ ...f, tripTimes: e.target.value }))} placeholder="09:00, 14:00" />
                </div>
                <div className="form-group">
                  <label>Kalkış Yeri</label>
                  <input value={form.departurePoint} onChange={(e) => setForm((f) => ({ ...f, departurePoint: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Süre</label>
                  <input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="2 saat" />
                </div>
              </div>
              <div className="form-group">
                <label>Açıklama</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="form-group">
                <label>Dahil Olanlar</label>
                <textarea value={form.inclusions} onChange={(e) => setForm((f) => ({ ...f, inclusions: e.target.value }))} rows={3} placeholder="Her satır veya virgülle ayırabilirsiniz" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Fiyat</label>
                  <input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="500 TL" disabled={form.hidePrice} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 14 }}>
                  <input type="checkbox" checked={form.hidePrice} onChange={(e) => setForm((f) => ({ ...f, hidePrice: e.target.checked }))} />
                  Gizli fiyat (Bilgi Alın)
                </label>
              </div>
              <div className="form-group">
                <label>Görseller ve Video</label>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 0 }}>Sürükleyerek sıralayın. Kapak için görselin altındaki &quot;Kapak yap&quot; butonunu kullanın.</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'image'); e.target.value = '' }} />
                  <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'video'); e.target.value = '' }} />
                  <button type="button" className="btn" onClick={() => imageInputRef.current?.click()} disabled={uploading}>+ Görsel</button>
                  <button type="button" className="btn" onClick={() => videoInputRef.current?.click()} disabled={uploading}>+ Video</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                  {form.media.map((m, i) => (
                    <div
                      key={`${m.url}-${i}`}
                      draggable
                      onDragStart={() => onMediaDragStart(i)}
                      onDragOver={onMediaDragOver}
                      onDrop={() => onMediaDrop(i)}
                      style={{ border: m.isCover ? '2px solid #f97316' : '1px solid #ddd', borderRadius: 8, padding: 6, cursor: 'grab', background: '#fafafa' }}
                    >
                      {m.kind === 'video' ? (
                        <video src={m.url} style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 4 }} />
                      ) : (
                        <img src={m.url} alt="" style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 4 }} />
                      )}
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {m.kind === 'image' && (
                          <button type="button" style={{ fontSize: 11, padding: '4px 6px' }} onClick={() => setForm((f) => ({ ...f, media: setCover(f.media, i) }))}>
                            {m.isCover ? 'Kapak ✓' : 'Kapak yap'}
                          </button>
                        )}
                        <button type="button" style={{ fontSize: 11, padding: '4px 6px', color: '#c00' }} onClick={() => setForm((f) => ({ ...f, media: f.media.filter((_, j) => j !== i) }))}>Kaldır</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Aktif (tanıtım sayfasında göster)
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={closeModal}>İptal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
