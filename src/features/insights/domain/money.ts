import type { QuitSettings } from './types'

// Exact base-10 rational arithmetic. Round the complete sum once, not each day.
function decimal(value: string | null) {
  if (value === null || !/^\d+(?:\.\d{1,12})?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  return { numerator: BigInt(whole + fraction), denominator: 10n ** BigInt(fraction.length) }
}

export function estimateAmount(settings: QuitSettings, observed: number[]) {
  const baseline = decimal(settings.baselineCigarettesPerDay)
  const price = decimal(settings.packPrice)
  const pack = settings.cigarettesPerPack
  if (!baseline || !price || pack === null || !Number.isSafeInteger(pack) || pack <= 0) return null
  if (observed.some(value => !Number.isSafeInteger(value) || value < 0)) return null
  const total = observed.reduce((sum, value) => sum + BigInt(value), 0n)
  const numerator = (baseline.numerator * BigInt(observed.length) - total * baseline.denominator) * price.numerator * 100n
  const denominator = baseline.denominator * price.denominator * BigInt(pack)
  const magnitude = numerator < 0n ? -numerator : numerator
  const cents = (magnitude + denominator / 2n) / denominator
  const sign = numerator < 0n && cents !== 0n ? '-' : ''
  return `${sign}${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}
