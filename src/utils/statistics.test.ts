import { describe, expect, it } from 'vitest'
import { buildDailyTrend, calculateSmokingStatistics } from '@/utils/statistics'
import type { CheckinModel, SmokingProfileModel } from '@/types/domain'

const profile: SmokingProfileModel = {
  id: 'profile-1',
  quitStartDate: '2026-09-01',
  baselineDailyCigarettes: 10,
  cigarettesPerPack: 20,
  pricePerPack: 25,
}

function checkin(checkinDate: string, cigarettes: number): CheckinModel {
  return { id: checkinDate, checkinDate, cigarettes, cravingLevel: 1, note: '' }
}

describe('calculateSmokingStatistics', () => {
  it('counts a continuous all-zero streak', () => {
    const result = calculateSmokingStatistics(profile, [checkin('2026-09-03', 0), checkin('2026-09-01', 0), checkin('2026-09-02', 0)], '2026-09-03')
    expect(result.currentStreak).toBe(3)
    expect(result.longestStreak).toBe(3)
  })

  it('breaks a streak on a smoked day', () => {
    const result = calculateSmokingStatistics(profile, [checkin('2026-09-01', 0), checkin('2026-09-02', 0), checkin('2026-09-03', 3), checkin('2026-09-04', 0)], '2026-09-04')
    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBe(2)
  })

  it('breaks the longest streak on a missing day', () => {
    const result = calculateSmokingStatistics(profile, [checkin('2026-09-01', 0), checkin('2026-09-03', 0)], '2026-09-03')
    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBe(1)
    expect(result.missingDays).toBe(1)
  })

  it('returns a zero current streak when today is missing', () => {
    const result = calculateSmokingStatistics(profile, [checkin('2026-09-01', 0), checkin('2026-09-02', 0)], '2026-09-03')
    expect(result.currentStreak).toBe(0)
  })

  it('returns null reduction rates for a zero baseline', () => {
    const result = calculateSmokingStatistics({ ...profile, baselineDailyCigarettes: 0 }, [checkin('2026-09-01', 0)], '2026-09-01')
    expect(result.reductionRate7Days).toBeNull()
    expect(result.reductionRate30Days).toBeNull()
  })

  it('returns zero cumulative values for a future start date', () => {
    const result = calculateSmokingStatistics({ ...profile, quitStartDate: '2026-09-05' }, [checkin('2026-09-04', 9)], '2026-09-04')
    expect(result.planDays).toBe(0)
    expect(result.expectedCigarettes).toBe(0)
    expect(result.actualCigarettes).toBe(0)
    expect(result.savedCigarettes).toBe(0)
    expect(result.savedMoney).toBe(0)
  })

  it('calculates saved money from saved cigarettes', () => {
    const result = calculateSmokingStatistics({ ...profile, baselineDailyCigarettes: 20 }, [checkin('2026-09-01', 5), checkin('2026-09-02', 5)], '2026-09-02')
    expect(result.savedCigarettes).toBe(30)
    expect(result.savedMoney).toBe(37.5)
  })

  it('calculates seven-day coverage without treating missing as zero', () => {
    const result = calculateSmokingStatistics(profile, [checkin('2026-09-01', 0), checkin('2026-09-02', 2), checkin('2026-09-04', 0), checkin('2026-09-06', 1), checkin('2026-09-07', 0)], '2026-09-07')
    expect(result.recent7RecordedDays).toBe(5)
    expect(result.coverage7Days).toBeCloseTo(5 / 7)
    expect(result.recordedAverage7Days).toBeCloseTo(3 / 5)
  })

  it('preserves a negative reduction rate when recorded use exceeds baseline', () => {
    const result = calculateSmokingStatistics(profile, [checkin('2026-09-01', 15)], '2026-09-01')
    expect(result.reductionRate7Days).toBe(-0.5)
  })
})

describe('buildDailyTrend', () => {
  it('keeps missing days as null trend points', () => {
    const result = buildDailyTrend([checkin('2026-09-01', 4), checkin('2026-09-03', 0)], '2026-09-03', 3)
    expect(result.map((point) => point.cigarettes)).toEqual([4, null, 0])
    expect(result[1]?.status).toBe('missing')
  })
})
