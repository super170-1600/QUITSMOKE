import { addLocalDays, parseLocalDate } from '@/utils/date'
import { estimateAmount } from './money'
import { recoveryStatus } from './recoveryReferences'
import type { DailyRecord, DailyPoint, QuitSettings, InsightsSnapshot, InsightsRange } from './types'

function validDate(value: string) {
  try { parseLocalDate(value); return true } catch { return false }
}

export function calculateInsights(records: DailyRecord[], settings: QuitSettings, asOfDate: string): InsightsSnapshot {
  if (!validDate(settings.quitStartDate) || !validDate(asOfDate)) throw new RangeError('Invalid statistics date')
  // Validate the declared zone; date strings themselves remain civil calendar dates.
  new Intl.DateTimeFormat('en', { timeZone: settings.timezone })
  const byDate = new Map<string, DailyRecord>()
  for (const record of records) {
    if (!validDate(record.date) || record.date < settings.quitStartDate || record.date > asOfDate) continue
    if (!Number.isSafeInteger(record.cigarettesCount) || record.cigarettesCount < 0 || record.cigarettesCount > 200) continue
    const previous = byDate.get(record.date)
    if (previous?.updatedAt && record.updatedAt && previous.updatedAt > record.updatedAt) continue
    byDate.set(record.date, record)
  }
  const points: DailyPoint[] = []
  let longest = 0, run = 0, observed = 0, scoreSum = 0, samples = 0
  const cigarettes: number[] = []
  for (let date = settings.quitStartDate; date <= asOfDate; date = addLocalDays(date, 1)) {
    const record = byDate.get(date)
    const score = record?.cravingScore
    const cravingScore = typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 10 ? score : null
    run = record?.cigarettesCount === 0 ? run + 1 : 0
    longest = Math.max(longest, run)
    if (record) { observed += record.cigarettesCount; cigarettes.push(record.cigarettesCount) }
    if (cravingScore !== null) { scoreSum += cravingScore; samples++ }
    points.push({ date, status: record ? 'recorded' : 'missing', cigarettesCount: record?.cigarettesCount ?? null, cravingScore, mood: record?.mood ?? null, estimatedAmount: record ? estimateAmount(settings, [record.cigarettesCount]) : null })
  }
  const todayPending = asOfDate >= settings.quitStartDate && !byDate.has(asOfDate)
  const through = todayPending ? addLocalDays(asOfDate, -1) : asOfDate
  let current = 0
  for (let date = through; date >= settings.quitStartDate && byDate.get(date)?.cigarettesCount === 0; date = addLocalDays(date, -1)) current++
  const missingDates = points.filter(point => point.status === 'missing').map(point => point.date)
  return {
    points,
    summary: {
      asOfDate, timezone: settings.timezone, sourceRange: { start: settings.quitStartDate, end: asOfDate },
      coverage: { expectedDays: points.length, recordedDays: byDate.size, missingDates },
      journey: { recordedDays: byDate.size, currentVerifiedStreak: current, currentStreakThrough: current ? through : null, todayPending, longestVerifiedStreak: longest, observedCigarettes: observed },
      craving: { mean: samples ? scoreSum / samples : null, sampleDays: samples },
      savings: { estimatedAmount: estimateAmount(settings, cigarettes), currency: settings.currency, coveredDays: byDate.size, isComplete: missingDates.length === 0 && points.length > 0, assumptions: ['仅按已记录日期计算', '按当前档案参数估算'] },
      recovery: recoveryStatus(),
    },
  }
}

// Filters affect detail series, never silently change cumulative summary fields.
export function selectPoints(snapshot: InsightsSnapshot, range: InsightsRange) {
  const start = range === 'all' ? snapshot.summary.sourceRange.start : addLocalDays(snapshot.summary.asOfDate, 1 - range)
  return snapshot.points.filter(point => point.date >= start)
}
