import type { PersonForm } from './types'

function normalizePersonName(name: string): string {
  return name.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')
}

export function validatePerson(p: PersonForm, _tourDate?: string): string | null {
  if (!p.fullName?.trim() || p.fullName.trim().length < 3) return 'Ad soyad en az 3 karakter olmalıdır.'
  if (!p.kvkkConsent) return 'KVKK onayı zorunludur.'
  if (!p.smsConsent) return 'SMS bilgilendirme onayı zorunludur.'
  return null
}

export function validateGroup(persons: PersonForm[], tourDate?: string): string | null {
  for (const p of persons) {
    const err = validatePerson(p, tourDate)
    if (err) return err
  }
  const seen = new Set<string>()
  for (const p of persons) {
    const name = normalizePersonName(p.fullName)
    if (seen.has(name)) return 'Aynı kayıtta aynı ad soyad birden fazla kez eklenemez.'
    seen.add(name)
  }
  return null
}

export function isPersonValid(p: PersonForm, tourDate?: string): boolean {
  return validatePerson(p, tourDate) === null
}

export function allPersonsValid(persons: PersonForm[], tourDate?: string): boolean {
  return persons.length > 0 && validateGroup(persons, tourDate) === null
}
