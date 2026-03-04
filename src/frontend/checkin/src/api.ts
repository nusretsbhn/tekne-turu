const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

export type BookingListItem = {
  id: number
  customerId: number
  fullName: string
  idNumber: string
  phone: string | null
  birthDate: string | null
  ageCategory: string
  checkedIn: boolean
  checkedInAt: string | null
}

export type BookingSummary = {
  adultTotal: number
  adultCheckedIn: number
  childTotal: number
  childCheckedIn: number
  babyTotal: number
  babyCheckedIn: number
  total: number
  totalCheckedIn: number
}

export async function fetchBookings(
  token: string,
  tourDate: string,
  search?: string
): Promise<{ list: BookingListItem[]; summary: BookingSummary }> {
  const params = new URLSearchParams({ tourDate })
  if (search?.trim()) params.set('search', search.trim())
  const res = await fetch(`/api/bookings?${params}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const text = await res.text()
    let msg = 'Liste alınamadı.'
    try {
      const d = JSON.parse(text) as { error?: string }
      if (d?.error) msg = d.error
    } catch {
      if (text) msg = text.slice(0, 200)
    }
    if (res.status === 401) msg = 'Oturum süresi doldu veya giriş geçersiz. Tekrar giriş yapın.'
    throw new Error(msg)
  }
  const data = await res.json()
  return { list: data.list ?? [], summary: data.summary ?? {} }
}

export async function setCheckIn(
  token: string,
  bookingId: number,
  checkedIn: boolean
): Promise<void> {
  const res = await fetch(`/api/bookings/${bookingId}/check-in`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ checkedIn }),
  })
  if (!res.ok) throw new Error('İşlem başarısız.')
}

export async function bulkCheckIn(
  token: string,
  ids: number[],
  checkedIn: boolean
): Promise<void> {
  const res = await fetch('/api/bookings/bulk-check-in', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ ids, checkedIn }),
  })
  if (!res.ok) throw new Error('Toplu işlem başarısız.')
}
