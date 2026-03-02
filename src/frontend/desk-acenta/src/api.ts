import type { PersonForm } from './types'

/** Link ile açıldığında (?agency=code) acenta adını alır; auth gerekmez. */
export async function fetchAgencyByCode(code: string): Promise<{ name: string }> {
  const res = await fetch(`/api/agency-by-code?code=${encodeURIComponent(code)}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data?.error ?? 'Acenta bulunamadı.')
  }
  return res.json()
}

export async function createBooking(persons: PersonForm[], agencyName?: string | null): Promise<{ success: boolean; error?: string }> {
  const body = {
    tourDate: null as Date | null,
    persons: persons.map((p) => ({
      fullName: p.fullName.trim(),
      idNumber: p.idNumber.trim(),
      nationality: p.nationality,
      birthDate: p.birthDate ? new Date(p.birthDate).toISOString().slice(0, 10) : null,
      ageCategory: p.ageCategory,
      phone: p.phone?.trim() || null,
      email: p.email?.trim() || null,
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
