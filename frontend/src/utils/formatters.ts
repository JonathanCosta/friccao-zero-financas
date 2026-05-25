export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function applyCurrencyMask(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  const padded = digits.padStart(3, '0')
  const cents = padded.slice(-2)
  let integer = padded.slice(0, -2)

  integer = integer.replace(/^0+/, '') || '0'
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${integer},${cents}`
}

export function parseCurrencyMask(masked: string): number {
  const digits = masked.replace(/\D/g, '')
  if (!digits) return 0
  const padded = digits.padStart(3, '0')
  const integer = padded.slice(0, -2) || '0'
  const cents = padded.slice(-2)
  return parseInt(integer + cents, 10) / 100
}
