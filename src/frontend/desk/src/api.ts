import type { PersonForm } from './types'

export async function createBooking(
  persons: PersonForm[],
  tourDate: string,
  agencyName?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const body = {
    tourDate: tourDate || null,
    persons: persons.map((p) => ({
      fullName: p.fullName.trim(),
      idNumber: p.idNumber.trim(),
      nationality: p.nationality,
      birthDate: normalizeDate(p.birthDate),
      ageCategory: p.ageCategory,
      phone: p.phone?.trim() || null,
      email: null,
      accommodationPlace: p.accommodationPlace?.trim() || null,
      kvkkConsent: p.kvkkConsent,
      smsConsent: p.smsConsent,
    })),
    agencyName: agencyName?.trim() || null,
  }
  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const raw = await res.text()
    let data: { error?: string; title?: string; detail?: string; message?: string; errors?: string[] } = {}
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {}
    } catch {
      // Yanıt JSON değilse (örn. HTML hata sayfası) durum kodunu göster
      if (!res.ok) {
        const preview = raw.length > 120 ? raw.slice(0, 120) + '…' : raw
        return { success: false, error: `Kayıt gönderilemedi (HTTP ${res.status}). Yanıt: ${preview || '(boş)'}` }
      }
    }
    if (!res.ok) {
      const msg =
        data?.error ??
        data?.message ??
        data?.title ??
        data?.detail ??
        (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ??
        `Kayıt gönderilemedi (HTTP ${res.status}).`
      return { success: false, error: msg }
    }
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sunucuya ulaşılamadı.'
    return { success: false, error: `Sunucuya ulaşılamadı. API çalışıyor mu? (localhost:5244) — ${msg}` }
  }
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null
  const v = value.trim()
  if (!v) return null
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(v)) {
    const [d, m, y] = v.split('.')
    return `${y}-${m}-${d}`
  }
  // Tarayıcıdan gelen yyyy-MM-dd formatını aynen kullan
  return v.slice(0, 10)
}
