import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchCustomers, fetchCustomersCount, type CustomerListItem } from '../api'
import { CustomerListFilters } from '../components/CustomerListFilters'

const PAGE_SIZE = 25

/** Rezervasyonlar: Boş arama + boş tarihler → API’ye tarih gönderilmez; gelecek tur tarihli acenta kayıtları da listelenir. */
function resolveListParams(dateFrom: string, dateTo: string, search: string) {
  const trimmedSearch = search.trim()
  const df = dateFrom.trim()
  const dt = dateTo.trim()
  const hasExplicitDateRange = !!df || !!dt

  if (trimmedSearch) {
    if (hasExplicitDateRange) {
      return { dateFrom: df || undefined, dateTo: dt || undefined, search: trimmedSearch }
    }
    return { dateFrom: undefined, dateTo: undefined, search: trimmedSearch }
  }

  if (hasExplicitDateRange) {
    return { dateFrom: df || undefined, dateTo: dt || undefined, search: undefined }
  }

  return { dateFrom: undefined, dateTo: undefined, search: undefined }
}

export function Reservations() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [agencyFilter, setAgencyFilter] = useState('')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<CustomerListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(
    (opts?: { page?: number; dateFrom?: string; dateTo?: string }) => {
      if (!token) return
      const pageNum = opts?.page ?? page
      const effFrom = opts?.dateFrom ?? dateFrom
      const effTo = opts?.dateTo ?? dateTo
      const { dateFrom: df, dateTo: dt, search: s } = resolveListParams(effFrom, effTo, search)
      const agency = agencyFilter?.trim() || undefined
      setLoading(true)
      setError('')
      const offset = (pageNum - 1) * PAGE_SIZE
      Promise.all([
        fetchCustomers(token, {
          dateFrom: df,
          dateTo: dt,
          search: s,
          agency,
          limit: PAGE_SIZE,
          offset,
          registrationKayit: true,
          withBookingsOnly: true,
        }),
        fetchCustomersCount(token, { dateFrom: df, dateTo: dt, search: s, agency, withBookingsOnly: true }),
      ])
        .then(([rows, { count }]) => {
          setList(rows)
          setTotalCount(count)
        })
        .catch((err: Error) => setError(err?.message ?? 'Liste alınamadı.'))
        .finally(() => setLoading(false))
    },
    [token, page, dateFrom, dateTo, search, agencyFilter]
  )

  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    if (!token) return
    loadRef.current({ page: 1 })
  }, [token])

  const handleFilter = () => {
    setPage(1)
    load({ page: 1 })
  }

  const goPage = (p: number) => {
    setPage(p)
    load({ page: p })
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const openInCustomers = (id: number) => {
    navigate(`/customers?openEdit=${id}`)
  }

  return (
    <div>
      <h1 className="page-title">Rezervasyonlar</h1>
      <CustomerListFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        search={search}
        agencyFilter={agencyFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onSearchChange={setSearch}
        onAgencyChange={setAgencyFilter}
        onFilter={handleFilter}
        loading={loading}
      />
      {error && <p className="msg-error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tur Tarihi</th>
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
                <td>{c.tourDate ? new Date(`${c.tourDate}T12:00:00`).toLocaleDateString('tr-TR') : '—'}</td>
                <td>{c.fullName}</td>
                <td>{c.idNumber}</td>
                <td>{c.phone ?? '—'}</td>
                <td>{c.email ?? '—'}</td>
                <td>{c.nationality}</td>
                <td>{c.agencyName ?? '—'}</td>
                <td>{c.kvkkConsent ? '✓' : '—'}</td>
                <td>{c.smsConsent ? '✓' : '—'}</td>
                <td>{new Date(c.createdAt).toLocaleDateString('tr-TR')}</td>
                <td>
                  <button type="button" onClick={() => openInCustomers(c.id)} className="btn btn-secondary btn-sm">
                    Düzenle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && !loading && !error && (
        <p style={{ marginTop: 16, color: '#666' }}>Kayıt yok.</p>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--color-border, #e0e0e0)',
        }}
      >
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1 || loading}
          onClick={() => goPage(page - 1)}
        >
          Önceki
        </button>
        <span style={{ color: 'var(--color-text-muted, #666)', fontSize: 14 }}>
          Sayfa {page} / {totalPages} · Toplam {totalCount} kayıt (sayfa başına {PAGE_SIZE})
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages || loading}
          onClick={() => goPage(page + 1)}
        >
          Sonraki
        </button>
      </div>
    </div>
  )
}
