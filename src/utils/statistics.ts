import type {
  CheckinModel,
  DailyTrendPoint,
  SmokingProfileModel,
  SmokingStatistics,
} from '@/types/domain'
import {
  addLocalDays,
  differenceInLocalCalendarDays,
  getLocalDateString,
} from '@/utils/date'

function indexCheckins(checkins: CheckinModel[]) {
  const byDate = new Map<string, CheckinModel>()
  for (const checkin of checkins) byDate.set(checkin.checkinDate, checkin)
  return byDate
}

function getWindowSummary(
  windowSize: number,
  planDays: number,
  quitStartDate: string,
  today: string,
  byDate: Map<string, CheckinModel>,
) {
  const windowDays = Math.min(windowSize, planDays)
  if (windowDays === 0) return { total: 0, recordedDays: 0, windowDays: 0, average: null }
  const windowStart = addLocalDays(today, -(windowDays - 1))
  const effectiveStart = windowStart < quitStartDate ? quitStartDate : windowStart
  let total = 0
  let recordedDays = 0

  for (let date = effectiveStart; date <= today; date = addLocalDays(date, 1)) {
    const checkin = byDate.get(date)
    if (!checkin) continue
    total += checkin.cigarettes
    recordedDays += 1
  }

  return {
    total,
    recordedDays,
    windowDays,
    average: recordedDays === 0 ? null : total / recordedDays,
  }
}

function reductionRate(average: number | null, baseline: number) {
  if (average === null || baseline === 0) return null
  return 1 - average / baseline
}

export function calculateSmokingStatistics(
  profile: SmokingProfileModel,
  checkins: CheckinModel[],
  today: string = getLocalDateString(),
): SmokingStatistics {
  const planDays = Math.max(differenceInLocalCalendarDays(today, profile.quitStartDate) + 1, 0)
  const byDate = indexCheckins(checkins)

  let actualCigarettes = 0
  let recordedDays = 0
  let longestStreak = 0
  let runningStreak = 0

  if (planDays > 0) {
    for (let date = profile.quitStartDate; date <= today; date = addLocalDays(date, 1)) {
      const checkin = byDate.get(date)
      if (checkin) {
        actualCigarettes += checkin.cigarettes
        recordedDays += 1
      }
      if (checkin?.cigarettes === 0) {
        runningStreak += 1
        longestStreak = Math.max(longestStreak, runningStreak)
      } else {
        runningStreak = 0
      }
    }
  }

  let currentStreak = 0
  if (planDays > 0) {
    for (let date = today; date >= profile.quitStartDate; date = addLocalDays(date, -1)) {
      if (byDate.get(date)?.cigarettes !== 0) break
      currentStreak += 1
    }
  }

  const expectedCigarettes = profile.baselineDailyCigarettes * planDays
  const savedCigarettes = Math.max(expectedCigarettes - actualCigarettes, 0)
  const savedMoney = savedCigarettes / profile.cigarettesPerPack * profile.pricePerPack
  const recent7 = getWindowSummary(7, planDays, profile.quitStartDate, today, byDate)
  const recent30 = getWindowSummary(30, planDays, profile.quitStartDate, today, byDate)

  return {
    planDays,
    currentStreak,
    longestStreak,
    expectedCigarettes,
    actualCigarettes,
    savedCigarettes,
    savedMoney,
    average7Days: recent7.average,
    average30Days: recent30.average,
    recordedAverage7Days: recent7.average,
    recordedAverage30Days: recent30.average,
    recent7TotalCigarettes: recent7.total,
    recent30TotalCigarettes: recent30.total,
    recent7RecordedDays: recent7.recordedDays,
    recent30RecordedDays: recent30.recordedDays,
    recent7WindowDays: recent7.windowDays,
    recent30WindowDays: recent30.windowDays,
    coverage7Days: recent7.windowDays === 0 ? 0 : recent7.recordedDays / recent7.windowDays,
    coverage30Days: recent30.windowDays === 0 ? 0 : recent30.recordedDays / recent30.windowDays,
    reductionRate7Days: reductionRate(recent7.average, profile.baselineDailyCigarettes),
    reductionRate30Days: reductionRate(recent30.average, profile.baselineDailyCigarettes),
    recordedDays,
    missingDays: Math.max(planDays - recordedDays, 0),
  }
}

export function buildDailyTrend(
  checkins: CheckinModel[],
  today: string = getLocalDateString(),
  days = 30,
): DailyTrendPoint[] {
  if (!Number.isInteger(days) || days <= 0) return []
  const byDate = indexCheckins(checkins)
  const start = addLocalDays(today, -(days - 1))
  const points: DailyTrendPoint[] = []

  for (let date = start; date <= today; date = addLocalDays(date, 1)) {
    const checkin = byDate.get(date)
    points.push({
      date,
      cigarettes: checkin?.cigarettes ?? null,
      status: !checkin ? 'missing' : checkin.cigarettes === 0 ? 'zero' : 'smoked',
    })
  }
  return points
}
