import type { AgeCategory } from './types'

export function parseBirthDate(value: string): Date {
  const v = value.trim()
  if (!v) return new Date('')
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(v)) {
    const [d, m, y] = v.split('.').map((x) => parseInt(x, 10))
    return new Date(y, m - 1, d)
  }
  const ymd = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10))
  return new Date(v)
}

export function isCompleteBirthDate(birthDate: string): boolean {
  if (!birthDate || /D:|\|M:|\|Y:/.test(birthDate)) return false
  return !Number.isNaN(parseBirthDate(birthDate).getTime())
}

function ageInYears(birth: Date, reference: Date): number {
  let age = reference.getFullYear() - birth.getFullYear()
  const monthDiff = reference.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/** 0-2 Bebek, 3-12 Çocuk, 13+ Yetişkin — referans tarihi tur günüdür. */
export function calculateAgeCategory(birthDate: string, referenceDate: string): AgeCategory | null {
  if (!isCompleteBirthDate(birthDate)) return null
  const birth = parseBirthDate(birthDate)
  const ref = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date()
  if (Number.isNaN(ref.getTime())) return null
  const age = ageInYears(birth, ref)
  if (age < 0) return null
  if (age <= 2) return 'Bebek'
  if (age <= 12) return 'Çocuk'
  return 'Yetişkin'
}
