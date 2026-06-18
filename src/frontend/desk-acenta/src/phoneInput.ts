export const PHONE_PREFIX = '05'

/** TR cep: her zaman 05 ile başlar, en fazla 11 rakam. */
export function formatPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('90')) digits = `0${digits.slice(2)}`
  if (digits.startsWith('5') && !digits.startsWith('05')) digits = `0${digits}`
  if (!digits.startsWith('05')) {
    digits = PHONE_PREFIX + digits.replace(/^0+/, '')
  }
  return digits.slice(0, 11)
}

/** Yalnızca 05 veya boşsa API'ye gönderilmez. */
export function phoneForApi(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.length <= 2) return null
  return digits
}
