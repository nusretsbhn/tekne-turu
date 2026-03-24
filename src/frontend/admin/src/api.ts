function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function todayStr() {
  const t = new Date()
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

async function apiGet(token: string, url: string): Promise<Response> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const text = await res.text()
    const msg = text ? `${res.status}: ${text.slice(0, 200)}` : `${res.status} ${res.statusText}`
    throw new Error(msg)
  }
  return res
}

export type TodayCustomerDto = { fullName: string; phone: string | null; checkedIn: boolean; agencyName?: string | null }
export type DashboardStats = {
  totalRegistered: number
  totalCheckedIn: number
  adultTotal: number
  adultCheckedIn: number
  childTotal: number
  childCheckedIn: number
  babyTotal: number
  babyCheckedIn: number
  last7Days: { date: string; total: number; checkedIn: number }[]
  next15Days: { date: string; registeredCount: number }[]
  todayCustomers: TodayCustomerDto[]
}

export async function fetchDashboard(token: string, date?: string): Promise<DashboardStats> {
  const d = date ?? todayStr()
  const res = await apiGet(token, `/api/admin/dashboard?date=${d}`)
  return res.json()
}

export type ServiceListItem = {
  fullName: string
  phone: string | null
  hotel: string | null
  personCount: number
  pickupTime: string | null
}

export async function fetchServiceList(token: string, date?: string): Promise<ServiceListItem[]> {
  const d = date ?? todayStr()
  const res = await apiGet(token, `/api/admin/dashboard/service-list?date=${d}`)
  return res.json()
}

export type CustomerListItem = {
  id: number
  fullName: string
  idNumber: string
  phone: string | null
  email: string | null
  nationality: string
  kvkkConsent: boolean
  smsConsent: boolean
  createdAt: string
  agencyName: string | null
}

function customerListQueryParams(opts: {
  dateFrom?: string
  dateTo?: string
  search?: string
  agency?: string
  limit?: number
  offset?: number
  registrationKayit?: boolean
  withBookingsOnly?: boolean
}) {
  const p = new URLSearchParams()
  if (opts.dateFrom) p.set('dateFrom', opts.dateFrom)
  if (opts.dateTo) p.set('dateTo', opts.dateTo)
  if (opts.search) p.set('search', opts.search)
  if (opts.agency) p.set('agency', opts.agency)
  if (opts.limit != null) p.set('limit', String(opts.limit))
  if (opts.offset != null) p.set('offset', String(opts.offset))
  if (opts.registrationKayit) p.set('registrationKayit', 'true')
  if (opts.withBookingsOnly) p.set('withBookingsOnly', 'true')
  return p
}

export async function fetchCustomers(
  token: string,
  opts: {
    dateFrom?: string
    dateTo?: string
    search?: string
    agency?: string
    limit?: number
    offset?: number
    registrationKayit?: boolean
    withBookingsOnly?: boolean
  }
): Promise<CustomerListItem[]> {
  const p = customerListQueryParams(opts)
  const res = await apiGet(token, `/api/admin/customers?${p}`)
  return res.json()
}

export async function fetchCustomersCount(
  token: string,
  opts: { dateFrom?: string; dateTo?: string; search?: string; agency?: string; withBookingsOnly?: boolean }
): Promise<{ count: number }> {
  const p = new URLSearchParams()
  if (opts.dateFrom) p.set('dateFrom', opts.dateFrom)
  if (opts.dateTo) p.set('dateTo', opts.dateTo)
  if (opts.search) p.set('search', opts.search)
  if (opts.agency) p.set('agency', opts.agency)
  if (opts.withBookingsOnly) p.set('withBookingsOnly', 'true')
  const res = await apiGet(token, `/api/admin/customers/count?${p}`)
  return res.json()
}

export type CustomerDetail = {
  id: number
  fullName: string
  idNumber: string
  phone: string | null
  email: string | null
  birthDate: string | null
  nationality: string
  accommodationPlace: string | null
  kvkkConsent: boolean
  smsConsent: boolean
  createdAt: string
}
export async function fetchCustomer(token: string, id: number): Promise<CustomerDetail> {
  const res = await apiGet(token, `/api/admin/customers/${id}`)
  return res.json()
}

export type CustomerBookingItem = { id: number; tourDate: string; ageCategory: string; checkedIn: boolean; agencyName: string | null }
export async function fetchCustomerBookings(token: string, customerId: number, opts?: { dateFrom?: string; dateTo?: string }): Promise<CustomerBookingItem[]> {
  const p = new URLSearchParams()
  if (opts?.dateFrom) p.set('dateFrom', opts.dateFrom)
  if (opts?.dateTo) p.set('dateTo', opts.dateTo)
  const res = await apiGet(token, `/api/admin/customers/${customerId}/bookings?${p}`)
  return res.json()
}

export async function updateBooking(token: string, bookingId: number, body: { tourDate?: string; agencyName?: string | null }): Promise<void> {
  const res = await fetch(`/api/admin/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Güncellenemedi')
  }
}
export async function updateCustomer(
  token: string,
  id: number,
  body: { fullName: string; idNumber: string; phone?: string | null; email?: string | null; birthDate?: string | null; nationality: string; accommodationPlace?: string | null; kvkkConsent: boolean; smsConsent: boolean }
): Promise<void> {
  const res = await fetch(`/api/admin/customers/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({
      fullName: body.fullName,
      idNumber: body.idNumber,
      phone: body.phone ?? null,
      email: body.email ?? null,
      birthDate: body.birthDate ? (body.birthDate.slice(0, 10) === '' ? null : body.birthDate.slice(0, 10)) : null,
      nationality: body.nationality,
      accommodationPlace: body.accommodationPlace ?? null,
      kvkkConsent: body.kvkkConsent,
      smsConsent: body.smsConsent,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Güncellenemedi')
  }
  return res.json()
}

export type CoastGuardRow = { fullName: string; phone: string | null; idNumber: string; birthDate: string | null; nationality: string }

export async function fetchCoastGuard(token: string, date?: string): Promise<CoastGuardRow[]> {
  const d = date ?? todayStr()
  const res = await apiGet(token, `/api/admin/coastguard?date=${d}&max=115`)
  return res.json()
}

export type TourInfo = {
  id: number
  title: string
  description: string | null
  startTime: string | null
  endTime: string | null
  durationMinutes: number | null
  durationHours?: number | null
  departurePoint: string | null
  imageUrl: string | null
}

export async function fetchTour(token: string): Promise<TourInfo | null> {
  const res = await apiGet(token, '/api/tour/')
  return res.json()
}

export async function updateTour(token: string, body: Partial<TourInfo>): Promise<void> {
  const res = await fetch('/api/tour/', { method: 'PUT', headers: headers(token), body: JSON.stringify(body) })
  if (!res.ok) {
    const text = await res.text()
    let msg = 'Güncellenemedi'
    if (text) {
      try {
        const data = JSON.parse(text) as { error?: string }
        if (data?.error) msg = data.error
      } catch {
        msg = text.slice(0, 150)
      }
    }
    throw new Error(msg)
  }
}

export type StopItem = { id: number; name: string; description: string | null; imageUrl: string | null; orderIndex: number; isActive: boolean }

export async function fetchStops(token: string): Promise<StopItem[]> {
  const res = await apiGet(token, '/api/stops/')
  return res.json()
}

export async function createStop(token: string, body: { name?: string; description?: string; imageUrl?: string }): Promise<{ id: number }> {
  const res = await fetch('/api/stops/', { method: 'POST', headers: headers(token), body: JSON.stringify(body) })
  if (!res.ok) throw new Error('Eklenemedi')
  return res.json()
}

export async function updateStop(token: string, id: number, body: Partial<StopItem>): Promise<void> {
  const res = await fetch(`/api/stops/${id}`, { method: 'PUT', headers: headers(token), body: JSON.stringify(body) })
  if (!res.ok) throw new Error('Güncellenemedi')
}

export async function deleteStop(token: string, id: number): Promise<void> {
  const res = await fetch(`/api/stops/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Silinemedi')
}

export async function reorderStops(token: string, orderedIds: number[]): Promise<void> {
  const res = await fetch('/api/stops/reorder', { method: 'POST', headers: headers(token), body: JSON.stringify({ orderedIds }) })
  if (!res.ok) throw new Error('Sıra güncellenemedi')
}

export async function uploadFile(token: string, file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const text = await res.text()
  if (!res.ok) {
    let msg = `Yükleme başarısız (${res.status})`
    if (text) {
      try {
        const data = JSON.parse(text) as { error?: string }
        if (data?.error) msg = data.error
      } catch { /* ignore */ }
    } else if (res.status === 413) msg = 'Dosya çok büyük. En fazla 50 MB yükleyebilirsiniz.'
    throw new Error(msg)
  }
  return text ? (JSON.parse(text) as { url: string }) : { url: '' }
}

export type SmsTemplateItem = { id: number; templateKey: string; contentTR: string | null; contentEN: string | null; isActive: boolean; updatedAt: string }
export async function fetchSmsTemplates(token: string): Promise<SmsTemplateItem[]> {
  const res = await apiGet(token, '/api/admin/sms/templates')
  return res.json()
}
export async function updateSmsTemplate(token: string, id: number, body: { contentTR?: string; contentEN?: string; isActive?: boolean }): Promise<void> {
  const res = await fetch(`/api/admin/sms/templates/${id}`, { method: 'PUT', headers: headers(token), body: JSON.stringify(body) })
  if (!res.ok) throw new Error('Güncellenemedi')
}
export type SmsLogItem = {
  id: string; customerId: number | null; phone: string; templateKey: string; messageBody: string | null;
  status: string; sentAt: string | null; responseCode: string | null; netgsmResponseCode: string | null;
  netgsmMessageId: string | null; errorMessage: string | null; deliveryReportAt: string | null; createdAt: string;
  customerFullName: string | null
}
export async function fetchSmsLog(token: string, opts?: { limit?: number; offset?: number; name?: string }): Promise<{ list: SmsLogItem[]; total: number }> {
  const p = new URLSearchParams()
  if (opts?.limit != null) p.set('limit', String(opts.limit))
  if (opts?.offset != null) p.set('offset', String(opts.offset))
  if (opts?.name != null && opts.name.trim() !== '') p.set('name', opts.name.trim())
  const res = await apiGet(token, `/api/admin/sms/log?${p}`)
  return res.json()
}
export type SmsLogDetail = {
  id: string; customerId: number | null; phone: string; templateKey: string; messageContent: string;
  status: string; sentAt: string | null; netgsmResponseCode: string | null; netgsmMessageId: string | null;
  errorCode: string | null; errorMessage: string | null; deliveryReportAt: string | null; createdAt: string;
  customerFullName: string | null
}
export async function fetchSmsLogById(token: string, id: string): Promise<SmsLogDetail> {
  const res = await apiGet(token, `/api/admin/sms/log/${id}`)
  if (!res.ok) throw new Error('Kayıt bulunamadı')
  return res.json()
}
export async function sendBulkSms(token: string, customerIds: number[], message: string): Promise<{ sent: number; skipped: number; total: number }> {
  const res = await fetch('/api/admin/sms/send-bulk', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ customerIds, message }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Gönderilemedi')
  }
  return res.json()
}

export type FeedbackItem = { id: number; type: string; message: string; customerId: number | null; customerName?: string | null; customerPhone?: string | null; bookingId?: number | null; status: string; createdAt: string; processedAt: string | null }
export async function fetchFeedbackList(token: string, opts?: { dateFrom?: string; dateTo?: string; type?: string }): Promise<FeedbackItem[]> {
  const p = new URLSearchParams()
  if (opts?.dateFrom) p.set('dateFrom', opts.dateFrom)
  if (opts?.dateTo) p.set('dateTo', opts.dateTo)
  if (opts?.type) p.set('type', opts.type)
  const res = await apiGet(token, `/api/admin/feedback?${p}`)
  return res.json()
}
export async function fetchFeedback(token: string, id: number): Promise<FeedbackItem> {
  const res = await apiGet(token, `/api/admin/feedback/${id}`)
  return res.json()
}
export async function markFeedbackProcessed(token: string, id: number): Promise<void> {
  const res = await fetch(`/api/admin/feedback/${id}`, { method: 'PATCH', headers: headers(token) })
  if (!res.ok) throw new Error('Güncellenemedi')
}

export async function fetchFeedbackNewCount(token: string): Promise<{ count: number }> {
  const res = await apiGet(token, '/api/admin/feedback/new-count')
  return res.json()
}

export type SurveyReportByDate = { date: string; count: number }
export type SurveyTopAnswer = { answer: string; count: number }
export type SurveyRecentResponse = { id: number; createdAt: string; answersJson: string }
export type SurveyQuestionOption = { answer: string; count: number; percentage: number }
export type SurveyQuestionBreakdown = {
  questionIndex: number
  question: string
  answeredCount: number
  options: SurveyQuestionOption[]
}
export type SurveyReportResult = {
  totalResponses: number
  byDate: SurveyReportByDate[]
  topAnswers: SurveyTopAnswer[]
  questionBreakdown: SurveyQuestionBreakdown[]
  recent: SurveyRecentResponse[]
}

export async function fetchSurveyReports(
  token: string,
  opts?: { dateFrom?: string; dateTo?: string },
): Promise<SurveyReportResult> {
  const p = new URLSearchParams()
  if (opts?.dateFrom) p.set('dateFrom', opts.dateFrom)
  if (opts?.dateTo) p.set('dateTo', opts.dateTo)
  const res = await apiGet(token, `/api/admin/survey/reports?${p}`)
  return res.json()
}

export type UserItem = { id: number; email: string; fullName: string; role: string; isActive: boolean; createdAt: string; lastLoginAt: string | null }
export async function fetchUsers(token: string): Promise<UserItem[]> {
  const res = await apiGet(token, '/api/admin/users')
  return res.json()
}
export async function createUser(token: string, body: { email: string; password: string; fullName: string; role: string }): Promise<{ id: number }> {
  const res = await fetch('/api/admin/users', { method: 'POST', headers: headers(token), body: JSON.stringify(body) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Kullanıcı oluşturulamadı')
  }
  return res.json()
}

export async function fetchSettings(token: string): Promise<Record<string, string | null>> {
  const res = await apiGet(token, '/api/settings/')
  return res.json()
}

export async function updateSettings(token: string, body: Record<string, string | null>): Promise<void> {
  const res = await fetch('/api/settings/', { method: 'PUT', headers: headers(token), body: JSON.stringify(body) })
  if (!res.ok) throw new Error('Güncellenemedi')
}

export type PreReservationItem = {
  id: number
  fullName: string
  phone: string
  email: string | null
  hotelName: string | null
  adultCount: number
  childCount: number
  babyCount: number
  tourDate: string
  useShuttle: boolean
  status: string
  createdAt: string
  updatedAt: string | null
}

export type PreReservationDetail = PreReservationItem & { notes: string | null }

export async function fetchPreReservations(
  token: string,
  opts: { dateFrom?: string; dateTo?: string; status?: string; search?: string; limit?: number; offset?: number },
): Promise<{ list: PreReservationItem[]; total: number }> {
  const p = new URLSearchParams()
  if (opts.dateFrom) p.set('dateFrom', opts.dateFrom)
  if (opts.dateTo) p.set('dateTo', opts.dateTo)
  if (opts.status) p.set('status', opts.status)
  if (opts.search) p.set('search', opts.search)
  if (opts.limit != null) p.set('limit', String(opts.limit))
  if (opts.offset != null) p.set('offset', String(opts.offset))
  const res = await apiGet(token, `/api/admin/prereservations?${p}`)
  const json = await res.json() as { list: PreReservationItem[]; total: number }
  return json
}

export async function fetchPreReservation(token: string, id: number): Promise<PreReservationDetail> {
  const res = await apiGet(token, `/api/admin/prereservations/${id}`)
  return res.json()
}

export async function updatePreReservation(
  token: string,
  id: number,
  body: { fullName?: string; phone?: string; email?: string | null; hotelName?: string | null; notes?: string | null; status?: string; tourDate?: string },
): Promise<void> {
  const res = await fetch(`/api/admin/prereservations/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Güncellenemedi')
  }
}

export async function fetchPreReservationNewCount(token: string): Promise<{ count: number }> {
  const res = await apiGet(token, '/api/admin/prereservations/new-count')
  return res.json()
}

export type DocumentItem = { docType: string; language: string; fileUrl: string | null }
export async function fetchDocuments(token: string): Promise<DocumentItem[]> {
  const res = await apiGet(token, '/api/admin/documents')
  return res.json()
}
export async function updateDocument(token: string, body: { docType: string; language: string; fileUrl: string | null }): Promise<void> {
  const res = await fetch('/api/admin/documents', { method: 'PUT', headers: headers(token), body: JSON.stringify(body) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Güncellenemedi')
  }
}

// --- Biletler ---
export async function fetchTicketNextNumber(token: string): Promise<{ ticketNumber: string }> {
  const res = await apiGet(token, '/api/admin/tickets/next-number')
  return res.json()
}

export type TicketListItem = {
  id: number
  ticketNumber: string
  fullName: string
  phone: string
  tourDate: string
  adultCount: number
  childCount: number
  babyCount: number
  hotel: string | null
  tourStartTime: string | null
  tourEndTime: string | null
  note: string | null
  hasService: boolean
  paymentType: string
  status: string
  filePath: string | null
  createdAt: string
}

export async function fetchTickets(
  token: string,
  opts: { ticketNo?: string; fullName?: string; tourDateFrom?: string; tourDateTo?: string; status?: string; limit?: number; offset?: number }
): Promise<{ items: TicketListItem[]; total: number }> {
  const p = new URLSearchParams()
  if (opts.ticketNo) p.set('ticketNo', opts.ticketNo)
  if (opts.fullName) p.set('fullName', opts.fullName)
  if (opts.tourDateFrom) p.set('tourDateFrom', opts.tourDateFrom)
  if (opts.tourDateTo) p.set('tourDateTo', opts.tourDateTo)
  if (opts.status) p.set('status', opts.status)
  if (opts.limit != null) p.set('limit', String(opts.limit))
  if (opts.offset != null) p.set('offset', String(opts.offset))
  const res = await apiGet(token, `/api/admin/tickets?${p}`)
  return res.json()
}

export type TicketDetail = TicketListItem & { updatedAt: string | null }

export async function fetchTicket(token: string, id: number): Promise<TicketDetail> {
  const res = await apiGet(token, `/api/admin/tickets/${id}`)
  return res.json()
}

export async function createTicket(
  token: string,
  body: {
    fullName: string
    phone: string
    tourDate: string
    adultCount: number
    childCount: number
    babyCount: number
    hotel?: string
    note?: string
    hasService: boolean
    paymentType: 'ToPay' | 'FullPaid' | 'Free'
  }
): Promise<{ id: number; ticketNumber: string; filePath: string | null }> {
  const res = await fetch('/api/admin/tickets', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Bilet kesilemedi')
  }
  return res.json()
}

export async function updateTicket(
  token: string,
  id: number,
  body: {
    fullName?: string
    phone?: string
    tourDate?: string
    adultCount?: number
    childCount?: number
    babyCount?: number
    hotel?: string | null
    note?: string | null
    hasService?: boolean
    paymentType?: string
    status?: 'Aktif' | 'İptal'
  }
): Promise<{ id: number; filePath: string | null }> {
  const res = await fetch(`/api/admin/tickets/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Güncellenemedi')
  }
  return res.json()
}

/** Bilet JPG dosyasını indirmek için URL (Authorization header ile istek atılmalı, tarayıcıda açmak için kullanılamaz). */
export function ticketFileUrl(id: number): string {
  return `/api/admin/tickets/${id}/file`
}

// --- Acentalar ---
export type AgencyItem = {
  id: number
  name: string
  contactFullName: string
  phone: string
  email: string | null
  shortCode: string
  createdAt: string
}

export async function fetchAgencies(token: string): Promise<AgencyItem[]> {
  const res = await apiGet(token, '/api/admin/agencies')
  return res.json()
}

export async function fetchAgency(token: string, id: number): Promise<AgencyItem & { updatedAt: string | null }> {
  const res = await apiGet(token, `/api/admin/agencies/${id}`)
  return res.json()
}

export async function createAgency(
  token: string,
  body: { name: string; contactFullName: string; phone: string; email?: string; username: string; password: string },
): Promise<{ id: number; shortCode: string; name: string }> {
  const res = await fetch('/api/admin/agencies', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Acenta eklenemedi')
  }
  return res.json()
}

export async function updateAgency(
  token: string,
  id: number,
  body: { name?: string; contactFullName?: string; phone?: string; email?: string | null },
): Promise<void> {
  const res = await fetch(`/api/admin/agencies/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Güncellenemedi')
  }
}

export async function deleteAgency(token: string, id: number): Promise<void> {
  const res = await fetch(`/api/admin/agencies/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Silinemedi')
  }
}

export type AgencyRegistrationRow = {
  tourDate: string
  fullName: string
  phone: string | null
  personCount: number
  hotel: string | null
  useShuttle: boolean
  registrationDate: string
}

export async function fetchAgencyRegistrations(token: string, agencyId: number): Promise<AgencyRegistrationRow[]> {
  const res = await apiGet(token, `/api/admin/agencies/${agencyId}/registrations`)
  return res.json()
}

// --- Acenta paneli ---
export type AcentaDashboardItem = {
  id: number
  tourDate: string
  checkedIn: boolean
  useShuttle: boolean
  fullName: string
  phone: string | null
  hotel: string | null
  createdAt: string
}
export type AcentaDashboardResult = {
  agencyName: string
  selectedDate: string
  totalPassengerCount: number
  list: AcentaDashboardItem[]
}
export async function fetchAcentaDashboard(token: string, date?: string): Promise<AcentaDashboardResult> {
  const d = date ?? todayStr()
  const res = await apiGet(token, `/api/acenta/dashboard?date=${d}`)
  return res.json()
}

export type AcentaPassengerRow = {
  id: number
  tourDate: string
  checkedIn: boolean
  useShuttle: boolean
  ageCategory: string
  fullName: string
  idNumber: string
  nationality: string
  birthDate: string | null
  phone: string | null
  email: string | null
  hotel: string | null
  kvkkConsent: boolean
  smsConsent: boolean
  createdAt: string
}
export async function fetchAcentaPassengers(
  token: string,
  opts: { dateFrom?: string; dateTo?: string; search?: string; useShuttle?: boolean; page?: number; limit?: number }
): Promise<{ total: number; page: number; pageSize: number; items: AcentaPassengerRow[] }> {
  const p = new URLSearchParams()
  if (opts.dateFrom) p.set('dateFrom', opts.dateFrom)
  if (opts.dateTo) p.set('dateTo', opts.dateTo)
  if (opts.search) p.set('search', opts.search)
  if (opts.useShuttle != null) p.set('useShuttle', String(opts.useShuttle))
  if (opts.page) p.set('page', String(opts.page))
  if (opts.limit) p.set('limit', String(opts.limit))
  const res = await apiGet(token, `/api/acenta/passengers?${p}`)
  return res.json()
}

export async function createAcentaBooking(
  token: string,
  body: { tourDate?: string; persons: BookingPersonDto[]; useShuttle?: boolean }
): Promise<{ success: boolean; bookingIds: number[] }> {
  const res = await fetch('/api/acenta/bookings', { method: 'POST', headers: headers(token), body: JSON.stringify(body) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Kayıt başarısız')
  }
  return res.json()
}

export async function updateAcentaPassenger(
  token: string,
  bookingId: number,
  body: {
    tourDate: string
    fullName: string
    idNumber: string
    nationality: string
    birthDate: string | null
    ageCategory: string
    phone?: string | null
    email?: string | null
    accommodationPlace?: string | null
    kvkkConsent: boolean
    smsConsent: boolean
    useShuttle: boolean
  }
): Promise<void> {
  const res = await fetch(`/api/acenta/passengers/${bookingId}`, { method: 'PUT', headers: headers(token), body: JSON.stringify(body) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Güncellenemedi')
  }
}

export async function deleteAcentaPassenger(token: string, bookingId: number): Promise<void> {
  const res = await fetch(`/api/acenta/passengers/${bookingId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Silinemedi')
  }
}

export async function changeAcentaPassword(
  token: string,
  body: { currentPassword: string; newPassword: string; confirmNewPassword: string }
): Promise<void> {
  const res = await fetch('/api/acenta/change-password', { method: 'POST', headers: headers(token), body: JSON.stringify(body) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Şifre değiştirilemedi')
  }
}

export type BookingPersonDto = {
  fullName: string
  idNumber: string
  nationality: string
  birthDate: string | null
  ageCategory: string
  phone?: string | null
  email?: string | null
  accommodationPlace?: string | null
  kvkkConsent: boolean
  smsConsent: boolean
}
