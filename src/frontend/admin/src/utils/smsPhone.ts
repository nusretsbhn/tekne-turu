/** Türkiye cep (+90 / 05xx / 5xx) — toplu SMS seçimi için. */
export function isTurkishMobileForSms(phone: string | null | undefined): boolean {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return false
  let d = digits
  if (d.length >= 10 && d.startsWith('0')) d = d.slice(1)
  if (d.startsWith('90') && d.length >= 12) return d[2] === '5'
  if (d.length === 10 && d.startsWith('5')) return true
  return false
}
