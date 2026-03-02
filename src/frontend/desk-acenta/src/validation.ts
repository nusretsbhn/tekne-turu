import type { PersonForm } from './types'

export function validatePerson(p: PersonForm): string | null {
  if (!p.fullName?.trim() || p.fullName.trim().length < 3) return 'Ad soyad en az 3 karakter olmalıdır.'
  if (!p.kvkkConsent) return 'KVKK onayı zorunludur.'
  if (!p.smsConsent) return 'SMS bilgilendirme onayı zorunludur.'
  if (p.nationality === 'TR') {
    if (!/^\d{11}$/.test(p.idNumber?.trim() ?? '')) return 'TC kimlik no 11 haneli rakam olmalıdır.'
  } else {
    if (!p.idNumber?.trim()) return 'Pasaport numarası giriniz.'
  }
  if (!p.birthDate) return 'Doğum tarihi seçiniz.'
  const birth = new Date(p.birthDate)
  if (birth > new Date()) return 'Doğum tarihi geçmiş bir tarih olmalıdır.'
  if (!p.ageCategory) return 'Yaş kategorisi seçiniz.'
  if (!p.phone?.trim()) return 'Telefon giriniz.'
  if (!p.email?.trim()) return 'E-posta giriniz.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) return 'Geçerli bir e-posta giriniz.'
  return null
}

export function isPersonValid(p: PersonForm): boolean {
  return validatePerson(p) === null
}

export function allPersonsValid(persons: PersonForm[]): boolean {
  return persons.length > 0 && persons.every(isPersonValid)
}
