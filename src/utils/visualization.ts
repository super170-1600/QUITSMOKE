import type { CheckinModel, DailySmokingStatus, SmokingProfileModel } from '@/types/domain'
import { addLocalDays, differenceInLocalCalendarDays, getLocalDateString } from '@/utils/date'

export type TimeRange = '7d' | '30d' | '90d' | '180d' | '1y' | 'all'

export interface SmokingTrendPoint {
  date: string
  cigarettes: number | null
  craving: number | null
  baseline: number
  reduction: number | null
  status: DailySmokingStatus
}

export interface HeatmapPoint {
  date: string
  cigarettes: number | null
  craving: number | null
  note: string
  status: DailySmokingStatus
  intensity: -1 | 0 | 1 | 2 | 3 | 4 | 5
}

export interface SavingsTrendPoint {
  date: string
  savedCigarettes: number
  savedMoney: number
}

const FIXED_RANGE_DAYS: Record<Exclude<TimeRange, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90, '180d': 180, '1y': 365 }

export function getTimeRangeDates(range: TimeRange, quitStartDate: string, today: string = getLocalDateString()) {
  const days = range === 'all' ? Math.max(differenceInLocalCalendarDays(today, quitStartDate) + 1, 1) : FIXED_RANGE_DAYS[range]
  const startDate = range === 'all' ? (quitStartDate <= today ? quitStartDate : today) : addLocalDays(today, -(days - 1))
  return { startDate, endDate: today, days }
}

function indexCheckins(checkins: CheckinModel[]) {
  return new Map(checkins.map((checkin) => [checkin.checkinDate, checkin]))
}

function datesInRange(startDate: string, endDate: string) {
  const dates: string[] = []
  for (let date = startDate; date <= endDate; date = addLocalDays(date, 1)) dates.push(date)
  return dates
}

export function buildSmokingTrend(checkins: CheckinModel[], profile: SmokingProfileModel, range: TimeRange, today = getLocalDateString()): SmokingTrendPoint[] {
  const byDate = indexCheckins(checkins)
  const { startDate, endDate } = getTimeRangeDates(range, profile.quitStartDate, today)
  return datesInRange(startDate, endDate).map((date) => {
    const checkin = byDate.get(date)
    return { date, cigarettes: checkin?.cigarettes ?? null, craving: checkin?.cravingLevel ?? null, baseline: profile.baselineDailyCigarettes, reduction: checkin && profile.baselineDailyCigarettes > 0 ? 1 - checkin.cigarettes / profile.baselineDailyCigarettes : null, status: !checkin ? 'missing' : checkin.cigarettes === 0 ? 'zero' : 'smoked' }
  })
}

export function buildCravingTrend(checkins: CheckinModel[], profile: SmokingProfileModel, range: TimeRange, today = getLocalDateString()) {
  return buildSmokingTrend(checkins, profile, range, today).map(({ date, craving }) => ({ date, craving }))
}

function heatmapIntensity(cigarettes: number, baseline: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (cigarettes === 0) return 0
  if (baseline <= 0 || cigarettes > baseline) return 5
  const ratio = cigarettes / baseline
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

export function buildHeatmapData(checkins: CheckinModel[], profile: SmokingProfileModel, range: TimeRange, today = getLocalDateString()): HeatmapPoint[] {
  const byDate = indexCheckins(checkins)
  const { startDate, endDate } = getTimeRangeDates(range, profile.quitStartDate, today)
  return datesInRange(startDate, endDate).map((date) => {
    const checkin = byDate.get(date)
    return { date, cigarettes: checkin?.cigarettes ?? null, craving: checkin?.cravingLevel ?? null, note: checkin?.note ?? '', status: !checkin ? 'missing' : checkin.cigarettes === 0 ? 'zero' : 'smoked', intensity: checkin ? heatmapIntensity(checkin.cigarettes, profile.baselineDailyCigarettes) : -1 }
  })
}

export function buildSavingsTrend(checkins: CheckinModel[], profile: SmokingProfileModel, range: TimeRange, today = getLocalDateString()): SavingsTrendPoint[] {
  const byDate = indexCheckins(checkins)
  const { startDate, endDate } = getTimeRangeDates(range, profile.quitStartDate, today)
  let expected = 0
  let actual = 0
  const cumulative = new Map<string, SavingsTrendPoint>()
  if (profile.quitStartDate <= today) {
    for (let date = profile.quitStartDate; date <= today; date = addLocalDays(date, 1)) {
      expected += profile.baselineDailyCigarettes
      actual += byDate.get(date)?.cigarettes ?? 0
      const savedCigarettes = Math.max(expected - actual, 0)
      cumulative.set(date, { date, savedCigarettes, savedMoney: savedCigarettes / profile.cigarettesPerPack * profile.pricePerPack })
    }
  }
  return datesInRange(startDate, endDate).map((date) => cumulative.get(date) ?? { date, savedCigarettes: 0, savedMoney: 0 })
}

export function buildBaselineComparison(checkins: CheckinModel[], profile: SmokingProfileModel, range: TimeRange, today = getLocalDateString()) {
  const byDate = indexCheckins(checkins)
  const { startDate, endDate } = getTimeRangeDates(range, profile.quitStartDate, today)
  let expected = 0
  let actual = 0
  for (const date of datesInRange(startDate, endDate)) {
    if (date < profile.quitStartDate) continue
    expected += profile.baselineDailyCigarettes
    actual += byDate.get(date)?.cigarettes ?? 0
  }
  return { expected, actual, reduction: expected === 0 ? null : 1 - actual / expected }
}
