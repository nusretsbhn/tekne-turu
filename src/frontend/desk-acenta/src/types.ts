export type AgeCategory = 'Yetişkin' | 'Çocuk' | 'Bebek'
export type Nationality = 'TR' | 'Diğer'

export interface PersonForm {
  id: string
  fullName: string
  idNumber: string
  nationality: Nationality
  birthDate: string
  ageCategory: AgeCategory
  phone: string
  email: string
  accommodationPlace: string
  kvkkConsent: boolean
  smsConsent: boolean
}

export const emptyPerson = (): PersonForm => ({
  id: crypto.randomUUID(),
  fullName: '',
  idNumber: '',
  nationality: 'TR',
  birthDate: '',
  ageCategory: 'Yetişkin',
  phone: '',
  email: '',
  accommodationPlace: '',
  kvkkConsent: false,
  smsConsent: false,
})
