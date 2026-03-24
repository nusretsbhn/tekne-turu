import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CustomerListFilters } from '../components/CustomerListFilters'
import { useAuth } from '../contexts/AuthContext'
import { fetchCustomers, fetchCustomer, fetchCustomerBookings, updateCustomer, updateBooking, type CustomerListItem, type CustomerDetail, type CustomerBookingItem } from '../api'

function todayStr() {
  const t = new Date()
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

const emptyForm = (): CustomerDetail & { accommodationPlace?: string | null } => ({
  id: 0,
  fullName: '',
  idNumber: '',
  phone: null,
  email: null,
  birthDate: null,
  nationality: 'TR',
  accommodationPlace: null,
  kvkkConsent: false,
  smsConsent: false,
  createdAt: '',
})

export function Customers() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const openEditParam = searchParams.get('openEdit')
  const today = todayStr()
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') ?? '')
  const [dateTo, setDateTo] = useState(() => {
    const df = searchParams.get('dateFrom') ?? ''
    const dt = searchParams.get('dateTo') ?? ''
    return df ? (dt || df) : todayStr()
  })
  const [search, setSearch] = useState('')
  const [agencyFilter, setAgencyFilter] = useState('')
  const [list, setList] = useState<CustomerListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<ReturnType<typeof emptyForm>>(emptyForm())
  const [editBookings, setEditBookings] = useState<CustomerBookingItem[]>([])
  const [editBookingsLoading, setEditBookingsLoading] = useState(false)
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const load = useCallback(
    (opts?: { dateFrom?: string; dateTo?: string }) => {
      if (!token) return
      setLoading(true)
      setError('')
      const effFrom = opts?.dateFrom ?? dateFrom
      const effTo = opts?.dateTo ?? dateTo
      const trimmedSearch = search.trim()
      const hasCustomDate = !!effFrom || effTo !== today
      const useDateFilter = hasCustomDate || !trimmedSearch
      const dateFromParam = useDateFilter ? (effFrom || undefined) : undefined
      const dateToParam = useDateFilter ? (effTo || undefined) : undefined

      fetchCustomers(token, {
        dateFrom: dateFromParam,
        dateTo: dateToParam,
        search: trimmedSearch || undefined,
        agency: agencyFilter?.trim() || undefined,
        limit: 200,
      })
        .then(setList)
        .catch((err: Error) => setError(err?.message ?? 'Liste alınamadı.'))
        .finally(() => setLoading(false))
    },
    [token, dateFrom, dateTo, search, agencyFilter, today]
  )

  const loadRef = useRef(load)
  loadRef.current = load

  const qFrom = searchParams.get('dateFrom') ?? ''
  const qTo = searchParams.get('dateTo') ?? ''

  useEffect(() => {
    if (!token) return
    if (qFrom) {
      const tTo = qTo || qFrom
      setDateFrom(qFrom)
      setDateTo(tTo)
      loadRef.current({ dateFrom: qFrom, dateTo: tTo })
    } else {
      setDateFrom('')
      setDateTo(today)
      loadRef.current({ dateFrom: '', dateTo: today })
    }
  }, [token, qFrom, qTo, today])

  useEffect(() => {
    if (!openEditParam || !token) return
    const id = parseInt(openEditParam, 10)
    if (!Number.isFinite(id) || id <= 0) return
    setEditId(id)
    setEditError('')
    const next = new URLSearchParams(searchParams)
    next.delete('openEdit')
    navigate({ search: next.toString() ? `?${next}` : '' }, { replace: true })
  }, [token, openEditParam, navigate, searchParams])

  useEffect(() => {
    if (!token || editId == null) {
      setEditForm(emptyForm())
      setEditBookings([])
      return
    }
    setEditLoading(true)
    setEditError('')
    fetchCustomer(token, editId)
      .then((c) => setEditForm({
        ...c,
        birthDate: c.birthDate ? c.birthDate.slice(0, 10) : null,
        accommodationPlace: c.accommodationPlace ?? null,
      }))
      .catch(() => setEditError('Müşteri bilgisi alınamadı.'))
      .finally(() => setEditLoading(false))
  }, [token, editId])

  useEffect(() => {
    if (!token || editId == null) return
    setEditBookingsLoading(true)
    fetchCustomerBookings(token, editId, { dateFrom, dateTo: dateTo || undefined })
      .then(setEditBookings)
      .catch(() => setEditBookings([]))
      .finally(() => setEditBookingsLoading(false))
  }, [token, editId, dateFrom, dateTo])

  const openEdit = (id: number) => {
    setEditId(id)
    setEditError('')
  }
  const closeEdit = () => {
    setEditId(null)
    setEditError('')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || editId == null) return
    setEditSaving(true)
    setEditError('')
    updateCustomer(token, editId, {
      fullName: editForm.fullName.trim(),
      idNumber: editForm.idNumber.trim(),
      phone: editForm.phone?.trim() || null,
      email: editForm.email?.trim() || null,
      birthDate: editForm.birthDate?.trim() || null,
      nationality: editForm.nationality || 'TR',
      accommodationPlace: editForm.accommodationPlace?.trim() || null,
      kvkkConsent: editForm.kvkkConsent,
      smsConsent: editForm.smsConsent,
    })
      .then(() => {
        closeEdit()
        load()
      })
      .catch((err) => setEditError(err instanceof Error ? err.message : 'Güncellenemedi.'))
      .finally(() => setEditSaving(false))
  }

  const handleBookingDateChange = async (bookingId: number, newDate: string) => {
    if (!token || !newDate) return
    setEditingBookingId(bookingId)
    updateBooking(token, bookingId, { tourDate: newDate })
      .then(() => setEditBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, tourDate: newDate } : b))))
      .catch(() => setEditError('Tur tarihi güncellenemedi.'))
      .finally(() => setEditingBookingId(null))
  }

  return (
    <div>
      <h1 className="page-title">Müşteriler</h1>
      <CustomerListFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        search={search}
        agencyFilter={agencyFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onSearchChange={setSearch}
        onAgencyChange={setAgencyFilter}
        onFilter={() => load()}
        loading={loading}
      />
      {error && <p className="msg-error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>TC/Pasaport</th>
              <th>Telefon</th>
              <th>E-posta</th>
              <th>Uyruk</th>
              <th>Acenta</th>
              <th>KVKK</th>
              <th>SMS</th>
              <th>Kayıt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>{c.fullName}</td>
                <td>{c.idNumber}</td>
                <td>{c.phone ?? '—'}</td>
                <td>{c.email ?? '—'}</td>
                <td>{c.nationality}</td>
                <td>{c.agencyName ?? '—'}</td>
                <td>{c.kvkkConsent ? '✓' : '—'}</td>
                <td>{c.smsConsent ? '✓' : '—'}</td>
                <td>{new Date(c.createdAt).toLocaleDateString('tr-TR')}</td>
                <td><button type="button" onClick={() => openEdit(c.id)} className="btn btn-secondary btn-sm">Düzenle</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && !loading && !error && <p style={{ marginTop: 16, color: '#666' }}>Kayıt yok.</p>}

      {editId != null && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal-box card-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2 className="page-title" style={{ marginTop: 0 }}>Müşteri düzenle</h2>
            {editLoading && <p>Yükleniyor...</p>}
            {!editLoading && (
              <form onSubmit={handleSaveEdit}>
                <div className="form-group">
                  <label>Ad soyad *</label>
                  <input value={editForm.fullName} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>TC / Pasaport no *</label>
                  <input value={editForm.idNumber} onChange={(e) => setEditForm((f) => ({ ...f, idNumber: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input type="tel" value={editForm.phone ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value || null }))} />
                </div>
                <div className="form-group">
                  <label>E-posta</label>
                  <input type="email" value={editForm.email ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value || null }))} />
                </div>
                <div className="form-group">
                  <label>Doğum tarihi</label>
                  <input type="date" value={editForm.birthDate ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, birthDate: e.target.value || null }))} />
                </div>
                <div className="form-group">
                  <label>Uyruk</label>
                  <select value={editForm.nationality} onChange={(e) => setEditForm((f) => ({ ...f, nationality: e.target.value }))}>
                    <option value="TR">Türkiye</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Konaklama yeri</label>
                  <input value={editForm.accommodationPlace ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, accommodationPlace: e.target.value || null }))} placeholder="Otel adı vb." />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="edit-kvkk" checked={editForm.kvkkConsent} onChange={(e) => setEditForm((f) => ({ ...f, kvkkConsent: e.target.checked }))} />
                  <label htmlFor="edit-kvkk" style={{ marginBottom: 0 }}>KVKK onayı</label>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="edit-sms" checked={editForm.smsConsent} onChange={(e) => setEditForm((f) => ({ ...f, smsConsent: e.target.checked }))} />
                  <label htmlFor="edit-sms" style={{ marginBottom: 0 }}>SMS onayı</label>
                </div>
                <div className="form-group">
                  <label>Tur tarihleri (kayıtlar)</label>
                  {editBookingsLoading && <p style={{ margin: 0, fontSize: 14 }}>Yükleniyor...</p>}
                  {!editBookingsLoading && editBookings.length > 0 && (
                    <div className="table-wrap" style={{ marginTop: 8 }}>
                      <table style={{ fontSize: 14 }}>
                        <thead>
                          <tr>
                            <th>Tur tarihi</th>
                            <th>Yaş</th>
                            <th>Acenta</th>
                            <th>İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editBookings.map((b) => (
                            <tr key={b.id}>
                              <td>
                                <input
                                  type="date"
                                  value={b.tourDate.slice(0, 10)}
                                  onChange={(e) => handleBookingDateChange(b.id, e.target.value)}
                                  disabled={editingBookingId === b.id}
                                  style={{ width: '100%', minWidth: 0 }}
                                />
                              </td>
                              <td>{b.ageCategory}</td>
                              <td>{b.agencyName ?? '—'}</td>
                              <td>{editingBookingId === b.id ? 'Kaydediliyor...' : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!editBookingsLoading && editBookings.length === 0 && <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>Bu aralıkta kayıt yok.</p>}
                </div>
                {editError && <p className="msg-error">{editError}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="submit" disabled={editSaving} className="btn btn-primary">{editSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                  <button type="button" onClick={closeEdit} className="btn btn-secondary">İptal</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

