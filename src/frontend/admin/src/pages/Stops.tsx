import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchStops, createStop, updateStop, deleteStop, reorderStops, uploadFile, type StopItem } from '../api'

export function Stops() {
  const { token } = useAuth()
  const [list, setList] = useState<StopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', description: '', imageUrl: '' })
  const [error, setError] = useState('')
  const [uploadingFor, setUploadingFor] = useState<number | null>(null)
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const load = () => {
    if (!token) return
    fetchStops(token).then(setList).catch(() => setError('Liste alınamadı.')).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [token])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !form.name.trim()) return
    setError('')
    createStop(token, { name: form.name.trim(), description: form.description.trim() || undefined, imageUrl: form.imageUrl.trim() || undefined })
      .then(() => { setForm({ name: '', description: '', imageUrl: '' }); load() })
      .catch(() => setError('Eklenemedi.'))
  }

  const handleFileAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setError('')
    uploadFile(token, file)
      .then((r) => setForm((f) => ({ ...f, imageUrl: r.url })))
      .catch(() => setError('Görsel yüklenemedi.'))
    e.target.value = ''
  }

  const handleFileEdit = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setUploadingFor(id)
    setError('')
    uploadFile(token, file)
      .then((res) => updateStop(token, id, { imageUrl: res.url }).then(load))
      .catch(() => setError('Görsel yüklenemedi.'))
      .finally(() => setUploadingFor(null))
    e.target.value = ''
  }

  const handleUpdate = async (id: number, updates: Partial<StopItem>) => {
    if (!token) return
    setError('')
    updateStop(token, id, updates).then(() => { setEditingId(null); load() }).catch(() => setError('Güncellenemedi.'))
  }

  const handleDelete = async (id: number) => {
    if (!token || !confirm('Silmek istediğinize emin misiniz?')) return
    setError('')
    deleteStop(token, id).then(load).catch(() => setError('Silinemedi.'))
  }

  const moveStop = async (index: number, direction: 'up' | 'down') => {
    if (!token || list.length === 0) return
    const newOrder = list.map((s) => s.id)
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newOrder.length) return
    ;[newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]
    setError('')
    reorderStops(token, newOrder).then(load).catch(() => setError('Sıra güncellenemedi.'))
  }

  if (loading) return <p>Yükleniyor...</p>

  return (
    <div>
      <h1 className="page-title">Duraklar</h1>
      {error && <p className="msg-error">{error}</p>}
      <form onSubmit={handleAdd} className="toolbar" style={{ alignItems: 'flex-end', marginBottom: 24 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Durak adı</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Durak adı" required style={{ minWidth: 160 }} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Açıklama</label>
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Açıklama" style={{ minWidth: 200 }} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12 }}>Görsel</label>
          <input type="file" accept="image/*" onChange={handleFileAdd} style={{ minHeight: 'auto', padding: 6 }} />
          {form.imageUrl && <span style={{ marginLeft: 8, fontSize: 13 }}>✓</span>}
        </div>
        <button type="submit" className="btn btn-primary">Ekle</button>
      </form>
      <div className="table-wrap">
        <table>
        <thead>
          <tr>
            <th style={{ width: 80 }}>Sıra</th>
            <th>Ad</th>
            <th>Açıklama</th>
            <th>Görsel</th>
            <th>Durum</th>
            <th style={{ width: 200 }}></th>
          </tr>
        </thead>
        <tbody>
          {list.map((s, index) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 10 }}>
                <span style={{ marginRight: 4 }}>{s.orderIndex}</span>
                <button type="button" onClick={() => moveStop(index, 'up')} disabled={index === 0} style={{ padding: 2, marginRight: 2 }} title="Yukarı">↑</button>
                <button type="button" onClick={() => moveStop(index, 'down')} disabled={index === list.length - 1} style={{ padding: 2 }} title="Aşağı">↓</button>
              </td>
              <td style={{ padding: 10 }}>{editingId === s.id ? <input defaultValue={s.name} onBlur={(e) => handleUpdate(s.id, { name: e.target.value })} style={{ width: '100%' }} /> : s.name}</td>
              <td style={{ padding: 10 }}>{s.description ?? '—'}</td>
              <td style={{ padding: 10 }}>
                <input
                  ref={(el) => { fileInputRefs.current[s.id] = el }}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileEdit(s.id, e)}
                  style={{ display: 'none' }}
                />
                {s.imageUrl ? <a href={s.imageUrl} target="_blank" rel="noopener noreferrer">Görsel</a> : '—'}
                <button type="button" onClick={() => fileInputRefs.current[s.id]?.click()} disabled={uploadingFor === s.id} style={{ marginLeft: 8, padding: '2px 8px', fontSize: 12 }}>{uploadingFor === s.id ? '...' : 'Yükle'}</button>
              </td>
              <td style={{ padding: 10 }}>{s.isActive ? 'Aktif' : 'Pasif'}</td>
              <td style={{ padding: 10 }}>
                <button type="button" onClick={() => setEditingId(editingId === s.id ? null : s.id)} style={{ marginRight: 8, padding: '4px 10px', fontSize: 13 }}>Düzenle</button>
                <button type="button" onClick={() => handleDelete(s.id)} style={{ padding: '4px 10px', fontSize: 13, background: '#c00', color: '#fff', border: 0, borderRadius: 4 }}>Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      {list.length === 0 && <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Durak yok.</p>}
    </div>
  )
}
