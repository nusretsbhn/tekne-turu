import type { PersonForm } from './types'

export function validatePerson(p: PersonForm, _tourDate?: string): string | null {
  if (!p.fullName?.trim() || p.fullName.trim().length < 3) return 'Ad soyad en az 3 karakter olmalıdır.'
  if (!p.kvkkConsent) return 'KVKK onayı zorunludur.'
  if (!p.smsConsent) return 'SMS bilgilendirme onayı zorunludur.'
  return null
}

export function isPersonValid(p: PersonForm, tourDate?: string): boolean {
  return validatePerson(p, tourDate) === null
}

export function allPersonsValid(persons: PersonForm[], tourDate?: string): boolean {
  return persons.length > 0 && persons.every((p) => isPersonValid(p, tourDate))
}
