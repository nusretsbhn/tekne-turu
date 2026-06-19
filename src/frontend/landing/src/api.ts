export type LandingData = {
  customerName: string
  /** ISO yyyy-MM-dd — tur tarihi (rezervasyonun yapıldığı gün değil) */
  tourDate?: string
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
  thanksSurveyJson?: string | null
}

export async function fetchThanksSettings(): Promise<ThanksSettings> {
  const res = await fetch('/api/landing/thanks-settings')
  if (!res.ok) throw new Error('Ayarlar yüklenemedi.')
  return res.json()
}

export type BilgiLandingData = {
  tourTitle: string
  bannerUrl: string | null
  barMenuPdfUrlTr: string | null
  barMenuPdfUrlEn: string | null
  googleReviewsUrl: string | null
}

export async function fetchBilgiLandingData(): Promise<BilgiLandingData> {
  const res = await fetch('/api/landing/bilgi')
  if (!res.ok) throw new Error('Sayfa yüklenemedi.')
  return res.json()
}

export async function submitBilgiFeedback(type: string, message: string): Promise<void> {
  const res = await fetch('/api/landing/bilgi/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, message }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Gönderilemedi.')
  }
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

export async function submitThanksSurvey(answers: string[]): Promise<void> {
  const res = await fetch('/api/landing/thanks-survey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Anket gönderilemedi.')
  }
}

export type MarketingGalleryItem = { url: string; title?: string | null }

export type OtherActivityMedia = { url: string; kind: string; isCover: boolean }

export type OtherActivityItem = {
  id: number
  name: string
  tripTimes: string | null
  departurePoint: string | null
  duration: string | null
  description: string | null
  inclusions: string | null
  price: string | null
  hidePrice: boolean
  media: OtherActivityMedia[]
  coverUrl: string | null
}

/** Tanıtım sayfası yapılandırılmış fiyatlar (admin); geçerlilik API tarafında kontrol edilir. */
export type MarketingPricing = {
  adult: string | null
  child: string | null
  baby: string | null
  validFrom: string | null
  validTo: string | null
}

export type MarketingLandingData = {
  tourTitle: string
  startTime: string | null
  endTime: string | null
  departurePoint: string | null
  departureMapUrl: string | null
  stops: { name: string; description: string | null; imageUrl: string | null }[]
  services: string | null
  servicesEn?: string | null
  servicesNote?: string | null
  servicesNoteEn?: string | null
  /** Eski tek alan; yalnızca yapılandırılmış fiyat yoksa dolu gelir. */
  price: string | null
  pricing?: MarketingPricing | null
  bannerUrl: string | null
  gallery: MarketingGalleryItem[]
  videoUrl: string | null
  barMenuPdfUrl: string | null
  barMenuPdfUrlEn?: string | null
  instagramUrl: string | null
  tripAdvisorUrl?: string | null
  youtubeUrl?: string | null
  /** Tanıtım (API güncellemesi sonrası) */
  googleReviewsUrl?: string | null
  locationMapUrl?: string | null
  locationMapEmbedUrl?: string | null
  rulesPdfUrl?: string | null
  rulesPdfUrlEn?: string | null
  serviceLocationMapUrl?: string | null
  serviceLocationMapEmbedUrl?: string | null
  redbookUrl?: string | null
  companyName?: string | null
  companyIban?: string | null
  otherActivities?: OtherActivityItem[]
  marketingWhatsAppPhone?: string | null
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
  useShuttle?: boolean
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

