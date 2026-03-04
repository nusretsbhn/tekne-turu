import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchBookings, setCheckIn, bulkCheckIn, type BookingListItem, type BookingSummary } from '../api'

const POLL_INTERVAL_MS = 30_000

function todayStr() {
  const t = new Date()
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

/** Son 5 haneyi yıldızla maskele (çalışan tam TC/telefon görmesin) */
function maskLast5(value: string | null | undefined): string {
  if (value == null || value === '') return '—'
  const s = String(value).trim()
  if (s.length <= 5) return '*****'
  return s.slice(0, -5) + '*****'
}

export function CheckInPage() {
  const { token, user, logout } = useAuth()
  const [tourDate, setTourDate] = useState(todayStr)
  const [search, setSearch] = useState('')
  const [list, setList] = useState<BookingListItem[]>([])
  const [summary, setSummary] = useState<BookingSummary | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setError('')
    try {
      const data = await fetchBookings(token, tourDate, search || undefined)
      setList(data.list)
      setSummary(data.summary)
    } catch (e) {
      const msg = (e as Error).message
      setError(msg)
      if (msg.includes('Oturum süresi doldu') || msg.includes('giriş geçersiz')) logout()
    } finally {
      setLoading(false)
    }
  }, [token, tourDate, search, logout])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  useEffect(() => {
    const t = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [load])

  const handleToggleCheckIn = async (item: BookingListItem) => {
    if (!token || actionLoading) return
    setActionLoading(true)
    try {
      await setCheckIn(token, item.id, !item.checkedIn)
      await load()
    } catch {
      setError('İşlem başarısız.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkCheckIn = async (checkedIn: boolean) => {
    if (!token || selectedIds.size === 0 || actionLoading) return
    setActionLoading(true)
    try {
      await bulkCheckIn(token, Array.from(selectedIds), checkedIn)
      setSelectedIds(new Set())
      await load()
    } catch {
      setError('Toplu işlem başarısız.')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const notCheckedIn = list.filter((x) => !x.checkedIn)
  const checkedIn = list.filter((x) => x.checkedIn)

  return (
    <div style={{ minHeight: '100vh', padding: 16, fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>Check-in</h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && <span>{user.fullName}</span>}
          <button type="button" onClick={logout} style={{ padding: '6px 12px', background: '#444', color: '#fff', border: 0, borderRadius: 6 }}>Çıkış</button>
        </span>
      </header>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Tarih:{' '}
          <input
            type="date"
            value={tourDate}
            onChange={(e) => setTourDate(e.target.value)}
            style={{ padding: '6px 8px' }}
          />
        </span>
        <input
          type="text"
          placeholder="Ad soyad veya TC/Pasaport ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '6px 10px', minWidth: 200 }}
        />
      </div>

      {summary && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ padding: '12px 16px', background: '#f0f0f0', borderRadius: 8 }}>
            Yetişkin: <strong>{summary.adultCheckedIn} / {summary.adultTotal}</strong>
          </div>
          <div style={{ padding: '12px 16px', background: '#f0f0f0', borderRadius: 8 }}>
            Çocuk: <strong>{summary.childCheckedIn} / {summary.childTotal}</strong>
          </div>
          <div style={{ padding: '12px 16px', background: '#f0f0f0', borderRadius: 8 }}>
            Bebek: <strong>{summary.babyCheckedIn} / {summary.babyTotal}</strong>
          </div>
          <div style={{ padding: '12px 16px', background: '#1a1a1a', color: '#fff', borderRadius: 8 }}>
            Toplam: <strong>{summary.totalCheckedIn} / {summary.total}</strong>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => handleBulkCheckIn(true)} disabled={actionLoading} style={{ padding: '8px 16px', background: '#0a0', color: '#fff', border: 0, borderRadius: 6 }}>Seçilenleri check-in yap</button>
          <button type="button" onClick={() => setSelectedIds(new Set())} style={{ padding: '8px 16px', background: '#666', color: '#fff', border: 0, borderRadius: 6 }}>Seçimi kaldır</button>
        </div>
      )}

      {error && <p style={{ color: '#c00', marginBottom: 8 }}>{error}</p>}
      {loading && <p>Yükleniyor...</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={() => setSelectedIds(new Set(notCheckedIn.map((x) => x.id)))} style={{ padding: '6px 12px', fontSize: 13 }}>Binmeyenleri seç</button>
        <button type="button" onClick={() => setSelectedIds(new Set(list.map((x) => x.id)))} style={{ padding: '6px 12px', fontSize: 13 }}>Tümünü seç</button>
        <button type="button" onClick={() => setSelectedIds(new Set())} style={{ padding: '6px 12px', fontSize: 13 }}>Seçimi kaldır</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: 10, textAlign: 'left', width: 40 }}></th>
            <th style={{ padding: 10, textAlign: 'left' }}>Ad Soyad</th>
            <th style={{ padding: 10, textAlign: 'left' }}>TC / Pasaport</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Telefon</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Kategori</th>
            <th style={{ padding: 10, textAlign: 'left', width: 120 }}>Durum</th>
          </tr>
        </thead>
        <tbody>
          {notCheckedIn.map((item) => (
            <Row key={item.id} item={item} selected={selectedIds.has(item.id)} onToggleSelect={() => toggleSelect(item.id)} onToggleCheckIn={() => handleToggleCheckIn(item)} actionLoading={actionLoading} />
          ))}
          {checkedIn.map((item) => (
            <Row key={item.id} item={item} selected={selectedIds.has(item.id)} onToggleSelect={() => toggleSelect(item.id)} onToggleCheckIn={() => handleToggleCheckIn(item)} actionLoading={actionLoading} checkedIn />
          ))}
        </tbody>
      </table>
      {list.length === 0 && !loading && <p style={{ marginTop: 24, color: '#666' }}>Bu tarih için kayıt yok.</p>}
    </div>
  )
}

function Row({
  item,
  selected,
  onToggleSelect,
  onToggleCheckIn,
  actionLoading,
  checkedIn,
}: {
  item: BookingListItem
  selected: boolean
  onToggleSelect: () => void
  onToggleCheckIn: () => void
  actionLoading: boolean
  checkedIn?: boolean
}) {
  return (
    <tr style={{ background: checkedIn ? '#ffe0e0' : undefined, borderBottom: '1px solid #eee' }}>
      <td style={{ padding: 10 }}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      </td>
      <td style={{ padding: 10 }}>{item.fullName}</td>
      <td style={{ padding: 10 }}>{maskLast5(item.idNumber)}</td>
      <td style={{ padding: 10 }}>{maskLast5(item.phone)}</td>
      <td style={{ padding: 10 }}>{item.ageCategory}</td>
      <td style={{ padding: 10 }}>
        <button type="button" onClick={onToggleCheckIn} disabled={actionLoading} style={{ padding: '6px 12px', background: checkedIn ? '#c00' : '#0a0', color: '#fff', border: 0, borderRadius: 6 }}>
          {checkedIn ? 'Geri al' : 'Check-in'}
        </button>
      </td>
    </tr>
  )
}
