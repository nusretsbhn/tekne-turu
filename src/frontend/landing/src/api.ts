export type LandingData = {
  customerName: string
  tour: {
    title: string
    description: string | null
    startTime: string | null
    durationMinutes: number | null
    departurePoint: string | null
    imageUrl: string | null
  } | null
  stops: { name: string; description: string | null; imageUrl: string | null }[]
  menuPdfTr: string | null
  menuPdfEn: string | null
  rulesPdfTr: string | null
  rulesPdfEn: string | null
  instagramUrl: string | null
  googleReviewsUrl: string | null
  tripAdvisorUrl: string | null
}

export async function fetchLandingData(token: string): Promise<LandingData> {
  const res = await fetch(`/api/landing/data?token=${encodeURIComponent(token)}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error ?? 'Bu link artık aktif değil.')
  }
  return res.json()
}

export type ThanksSettings = {
  instagramUrl: string | null
  googleReviewsUrl: string | null
  tripAdvisorUrl: string | null
  thanksPageDescription?: string | null
}

export async function fetchThanksSettings(): Promise<ThanksSettings> {
  const res = await fetch('/api/landing/thanks-settings')
  if (!res.ok) throw new Error('Ayarlar yüklenemedi.')
  return res.json()
}

export async function submitFeedback(token: string, type: string, message: string): Promise<void> {
  const res = await fetch('/api/landing/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, type, message }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Gönderilemedi.')
  }
}

export type MarketingGalleryItem = { url: string; title?: string | null }

export type MarketingLandingData = {
  tourTitle: string
  startTime: string | null
  endTime: string | null
  departurePoint: string | null
  departureMapUrl: string | null
  stops: { name: string; description: string | null; imageUrl: string | null }[]
  services: string | null
  price: string | null
  bannerUrl: string | null
  gallery: MarketingGalleryItem[]
  videoUrl: string | null
  barMenuPdfUrl: string | null
  instagramUrl: string | null
  tripAdvisorUrl?: string | null
  /** Tanıtım (API güncellemesi sonrası) */
  googleReviewsUrl?: string | null
  locationMapUrl?: string | null
  locationMapEmbedUrl?: string | null
}

export async function fetchMarketingLandingData(): Promise<MarketingLandingData> {
  const res = await fetch('/api/marketing/landing')
  if (!res.ok) throw new Error('Sayfa yüklenemedi.')
  return res.json()
}

export async function submitPreReservation(body: {
  fullName: string
  phone: string
  email?: string
  hotelName?: string
  adultCount: number
  childCount: number
  babyCount: number
  tourDate: string
  useShuttle: boolean
}): Promise<void> {
  const res = await fetch('/api/landing/prereservation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Gönderilemedi.')
  }
}

