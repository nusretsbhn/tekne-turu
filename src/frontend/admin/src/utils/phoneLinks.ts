/**
 * TR GSM numaraları için tel: ve WhatsApp (wa.me) bağlantıları.
 * WhatsApp: https://wa.me/90XXXXXXXXXX (ülke kodu, başında + yok)
 */
export function phoneContactLinks(phone: string | null | undefined): {
  telHref: string | null
  waHref: string | null
} {
  if (!phone?.trim()) return { telHref: null, waHref: null }
  const digits = phone.replace(/\D/g, '')
  if (!digits) return { telHref: null, waHref: null }

  let n = digits
  if (n.startsWith('90') && n.length >= 12) {
    // zaten 90 ile
  } else if (n.startsWith('0')) {
    n = '90' + n.slice(1)
  } else if (n.length === 10 && n.startsWith('5')) {
    n = '90' + n
  }

  // 90 + 10 hane (5xxxxxxxxx)
  if (n.length !== 12 || !n.startsWith('90') || n[2] !== '5') return { telHref: null, waHref: null }

  return {
    telHref: `tel:+${n}`,
    waHref: `https://wa.me/${n}`,
  }
}
