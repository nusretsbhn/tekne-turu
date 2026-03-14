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
  if (/D:|\|M:|\|Y:/.test(p.birthDate)) return 'Doğum tarihi için gün, ay ve yılı tam giriniz.'
  const birth = parseBirthDate(p.birthDate)
  if (Number.isNaN(birth.getTime())) return 'Doğum tarihi geçerli bir tarih olmalıdır.'
  if (birth > new Date()) return 'Doğum tarihi geçmiş bir tarih olmalıdır.'
  if (!p.ageCategory) return 'Yaş kategorisi seçiniz.'
  if (!p.phone?.trim()) return 'Telefon giriniz.'
  return null
}

function parseBirthDate(value: string): Date {
  // dd.MM.yyyy veya yyyy-MM-dd gibi formatları destekle
  const v = value.trim()
  if (!v) return new Date('')
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(v)) {
    const [d, m, y] = v.split('.').map((x) => parseInt(x, 10))
    return new Date(y, m - 1, d)
  }
  return new Date(v)
}

export function isPersonValid(p: PersonForm): boolean {
  return validatePerson(p) === null
}

export function allPersonsValid(persons: PersonForm[]): boolean {
  return persons.length > 0 && persons.every(isPersonValid)
}
