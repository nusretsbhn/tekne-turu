import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchTour, updateTour, uploadFile, type TourInfo } from '../api'

export function Tour() {
  const { token } = useAuth()
  const [data, setData] = useState<Partial<TourInfo> & { startTimeStr?: string; endTimeStr?: string; durationHours?: number | null }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) return
    fetchTour(token)
      .then((t) => {
        if (t) {
          setData({
            ...t,
            startTimeStr: t.startTime ? t.startTime.slice(0, 5) : '',
            endTimeStr: t.endTime ? t.endTime.slice(0, 5) : '',
            durationHours: t.durationHours ?? (t.durationMinutes != null ? Math.round((t.durationMinutes / 60) * 10) / 10 : null),
          })
        } else {
          setData({ title: '', startTimeStr: '10:00', endTimeStr: '18:00', durationHours: 8 })
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setUploading(true)
    setMessage('')
    uploadFile(token, file)
      .then((r) => setData((d) => ({ ...d, imageUrl: r.url })))
      .catch((err: Error) => setMessage(err?.message ?? 'Görsel yüklenemedi.'))
      .finally(() => { setUploading(false); e.target.value = '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setMessage('')
    const payload: Record<string, unknown> = {
      title: data.title ?? '',
      description: data.description ?? null,
      departurePoint: data.departurePoint ?? null,
      imageUrl: data.imageUrl ?? null,
      durationHours: data.durationHours ?? null,
    }
    if (data.startTimeStr) payload.startTime = data.startTimeStr.length === 5 ? data.startTimeStr + ':00' : data.startTimeStr
    if (data.endTimeStr) payload.endTime = data.endTimeStr.length === 5 ? data.endTimeStr + ':00' : data.endTimeStr
    updateTour(token, payload as Partial<TourInfo>)
      .then(() => setMessage('Kaydedildi.'))
      .catch((err: Error) => setMessage(err?.message ?? 'Hata oluştu.'))
      .finally(() => setSaving(false))
  }

  if (loading) return <p>Yükleniyor...</p>

  return (
    <div>
      <h1>Tur Bilgisi</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
        <div style={fieldStyle}>
          <label>Tur adı</label>
          <input value={data.title ?? ''} onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))} style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <label>Açıklama</label>
          <textarea value={data.description ?? ''} onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))} rows={3} style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <label>Kalkış saati</label>
          <input type="time" value={data.startTimeStr ?? '10:00'} onChange={(e) => setData((d) => ({ ...d, startTimeStr: e.target.value }))} style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <label>Tur bitiş saati</label>
          <input type="time" value={data.endTimeStr ?? '18:00'} onChange={(e) => setData((d) => ({ ...d, endTimeStr: e.target.value }))} style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <label>Süre (saat)</label>
          <input type="number" step="0.5" min={0} value={data.durationHours ?? ''} onChange={(e) => setData((d) => ({ ...d, durationHours: e.target.value ? parseFloat(e.target.value) : undefined }))} style={inputStyle} placeholder="8" />
        </div>
        <div style={fieldStyle}>
          <label>Kalkış noktası</label>
          <input value={data.departurePoint ?? ''} onChange={(e) => setData((d) => ({ ...d, departurePoint: e.target.value }))} style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <label>Tur görseli</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ marginTop: 4 }} disabled={uploading} />
          {uploading && <span style={{ marginLeft: 8, fontSize: 14, color: '#666' }}>Yükleniyor...</span>}
          {data.imageUrl && <p style={{ marginTop: 8, fontSize: 14 }}>Mevcut: <a href={data.imageUrl} target="_blank" rel="noopener noreferrer">{data.imageUrl}</a></p>}
        </div>
        {message && <p style={{ color: message.includes('Hata') ? '#c00' : '#0a0' }}>{message}</p>}
        <button type="submit" disabled={saving} style={{ padding: '10px 20px', background: '#1a1a1a', color: '#fff', border: 0, borderRadius: 6 }}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
      </form>
    </div>
  )
}

const fieldStyle: React.CSSProperties = { marginBottom: 16 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', marginTop: 4 }
