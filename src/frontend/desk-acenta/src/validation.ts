import { calculateAgeCategory, parseBirthDate } from './ageCategory'
import type { PersonForm } from './types'

export function validatePerson(p: PersonForm, tourDate?: string): string | null {
  if (!p.fullName?.trim() || p.fullName.trim().length < 3) return 'Ad soyad en az 3 karakter olmalıdır.'
  if (!p.kvkkConsent) return 'KVKK onayı zorunludur.'
  if (!p.smsConsent) return 'SMS bilgilendirme onayı zorunludur.'
  if (!p.birthDate) return 'Doğum tarihi seçiniz.'
  if (/D:|\|M:|\|Y:/.test(p.birthDate)) return 'Doğum tarihi için gün, ay ve yılı tam giriniz.'
  const birth = parseBirthDate(p.birthDate)
  if (Number.isNaN(birth.getTime())) return 'Doğum tarihi geçerli bir tarih olmalıdır.'
  if (birth > new Date()) return 'Doğum tarihi geçmiş bir tarih olmalıdır.'
  const refDate = tourDate ?? new Date().toISOString().slice(0, 10)
  if (!calculateAgeCategory(p.birthDate, refDate)) return 'Yaş kategorisi hesaplanamadı.'
  return null
}

export function isPersonValid(p: PersonForm, tourDate?: string): boolean {
  return validatePerson(p, tourDate) === null
}

export function allPersonsValid(persons: PersonForm[], tourDate?: string): boolean {
  return persons.length > 0 && persons.every((p) => isPersonValid(p, tourDate))
}
