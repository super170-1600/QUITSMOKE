import { describe, expect, it } from 'vitest'
import { calculateInsights, selectPoints } from '../domain/metrics'
import { estimateAmount } from '../domain/money'
import { adaptRecords, adaptSettings } from '../adapters/insightsAdapter'
import { addLocalDays } from '@/utils/date'
import type { DailyRecord, QuitSettings } from '../domain/types'

const settings: QuitSettings = { quitStartDate: '2024-02-28', timezone: 'Asia/Shanghai', baselineCigarettesPerDay: '15', packPrice: '20', cigarettesPerPack: 20, currency: 'CNY' }
const dates = ['2024-02-28', '2024-02-29', '2024-03-01']
function rows(values: (number | null)[], scores: (number | null)[] = []): DailyRecord[] {
  return values.flatMap((value, index) => value === null ? [] : [{ date: addLocalDays(settings.quitStartDate, index), cigarettesCount: value, cravingScore: scores[index] ?? null }])
}
const summary = (values: (number | null)[], scores: (number | null)[] = []) => calculateInsights(rows(values, scores), settings, dates[2]).summary

describe('Orbital authoritative metrics', () => {
  it('counts three explicit zero days across leap day and month boundary', () => {
    const result = summary([0, 0, 0])
    expect(result.journey).toMatchObject({ recordedDays: 3, currentVerifiedStreak: 3, longestVerifiedStreak: 3, observedCigarettes: 0, todayPending: false })
    expect(result.coverage.missingDates).toEqual([])
  })
  it('breaks on a missing day and reconnects after backfill', () => {
    expect(summary([0, null, 0]).journey).toMatchObject({ recordedDays: 2, currentVerifiedStreak: 1, longestVerifiedStreak: 1 })
    expect(summary([0, 0, 0]).journey.currentVerifiedStreak).toBe(3)
  })
  it('does not count unrecorded today or bridge missing yesterday', () => {
    expect(summary([0, 0, null]).journey).toMatchObject({ currentVerifiedStreak: 2, currentStreakThrough: dates[1], todayPending: true })
    expect(summary([0, null, null]).journey.currentVerifiedStreak).toBe(0)
  })
  it('today smoking ends current streak without erasing historical longest', () => {
    expect(summary([0, 0, 2]).journey).toMatchObject({ currentVerifiedStreak: 0, longestVerifiedStreak: 2, observedCigarettes: 2 })
  })
  it('includes zero craving, excludes null and invalid scores', () => {
    expect(summary([0, 0, 0], [0, null, 10]).craving).toEqual({ mean: 5, sampleDays: 2 })
    expect(summary([0, 0, 0], [null, -1, 11]).craving).toEqual({ mean: null, sampleDays: 0 })
  })
  it('matches the 30-day ¥390 case and excludes four missing days', () => {
    const records = rows(Array(30).fill(2))
    const end = addLocalDays(settings.quitStartDate, 29)
    expect(calculateInsights(records, settings, end).summary.savings.estimatedAmount).toBe('390.00')
    const result = calculateInsights(records.slice(4), settings, end).summary
    expect(result.savings).toMatchObject({ estimatedAmount: '338.00', coveredDays: 26, isComplete: false })
    expect(result.coverage).toMatchObject({ expectedDays: 30, recordedDays: 26 })
  })
  it('deduplicates edits by timestamp and recomputes amount and streak', () => {
    const records = rows([0, 0, 0])
    records[1].updatedAt = '2024-03-01T10:00:00Z'
    records.push({ ...records[1], cigarettesCount: 20, updatedAt: '2024-03-01T11:00:00Z' })
    const result = calculateInsights(records.reverse(), settings, dates[2]).summary
    expect(result.journey).toMatchObject({ recordedDays: 3, observedCigarettes: 20, longestVerifiedStreak: 1 })
    expect(result.savings.estimatedAmount).toBe('25.00')
  })
  it('ignores invalid, pre-start, future and invalid-count rows', () => {
    const records = rows([0])
    for (const date of ['2024-02-27', '2024-03-02', '2024-02-30']) records.push({ date, cigarettesCount: 1, cravingScore: 5 })
    records.push({ date: dates[1], cigarettesCount: -1, cravingScore: 2 })
    expect(calculateInsights(records, settings, dates[2]).summary.journey.recordedDays).toBe(1)
  })
  it('returns explicit empty and pending health states', () => {
    const result = calculateInsights([], settings, dates[2]).summary
    expect(result.craving.mean).toBeNull()
    expect(result.coverage.missingDates).toEqual(dates)
    expect(result.recovery).toMatchObject({ eligibility: 'unknown', reachedIds: [], sourceVersion: 'pending-review-v1' })
    expect(result.savings.isComplete).toBe(false)
  })
  it('applies range only to details and keeps cumulative summary', () => {
    const result = calculateInsights(rows(Array(30).fill(0)), settings, addLocalDays(settings.quitStartDate, 29))
    expect(selectPoints(result, 7)).toHaveLength(7)
    expect(selectPoints(result, 30)).toHaveLength(30)
    expect(result.summary.journey.recordedDays).toBe(30)
  })
  it('keeps civil dates identical across declared zones and DST boundaries', () => {
    for (const timezone of ['America/New_York', 'Asia/Shanghai', 'Pacific/Auckland']) {
      const result = calculateInsights([], { ...settings, quitStartDate: '2024-03-09', timezone }, '2024-03-11')
      expect(result.points.map(point => point.date)).toEqual(['2024-03-09', '2024-03-10', '2024-03-11'])
      expect(result.summary.timezone).toBe(timezone)
    }
  })
  it('handles future plan, rejects malformed dates and zones', () => {
    expect(calculateInsights([], settings, '2024-02-01').summary.coverage.expectedDays).toBe(0)
    expect(() => calculateInsights([], settings, '2024-02-30')).toThrow()
    expect(() => calculateInsights([], { ...settings, timezone: 'not/a-zone' }, dates[2])).toThrow()
  })
})

describe('Exact money', () => {
  it('preserves negative savings and rounds signed half cents', () => {
    expect(estimateAmount(settings, [20])).toBe('-5.00')
    const half = { ...settings, baselineCigarettesPerDay: '0', packPrice: '0.01', cigarettesPerPack: 2 }
    expect(estimateAmount(half, [1])).toBe('-0.01')
  })
  it('rounds only after summing, supports decimal parameters and zero', () => {
    const thirds = { ...settings, baselineCigarettesPerDay: '1', packPrice: '0.01', cigarettesPerPack: 3 }
    expect(estimateAmount(thirds, [0, 0, 0])).toBe('0.01')
    expect(estimateAmount({ ...settings, baselineCigarettesPerDay: '0', packPrice: '0' }, [200])).toBe('0.00')
    expect(estimateAmount({ ...settings, baselineCigarettesPerDay: '1.5', packPrice: '12.35' }, [0, 1])).toBe('1.24')
  })
  it('returns null for incomplete or malformed parameters', () => {
    for (const patch of [{ packPrice: null }, { baselineCigarettesPerDay: null }, { cigarettesPerPack: 0 }, { packPrice: 'NaN' }]) {
      expect(estimateAmount({ ...settings, ...patch }, [0])).toBeNull()
    }
  })
})

describe('Existing model adaptation', () => {
  it('never turns the legacy five-point score into a ten-point score', () => {
    const record = { id: 'r', checkinDate: dates[0], cigarettes: 0, cravingLevel: 5, note: '' }
    expect(adaptRecords([record])[0].cravingScore).toBeNull()
    expect(adaptRecords([{ ...record, cravingScore: 0 }])[0].cravingScore).toBe(0)
  })
  it('uses changed current profile parameters without modifying input records', () => {
    const profile = { id: 'p', quitStartDate: dates[0], baselineDailyCigarettes: 15, cigarettesPerPack: 20, pricePerPack: 20 }
    const records = rows([0, 0, 0])
    expect(calculateInsights(records, adaptSettings(profile, 'Asia/Shanghai'), dates[2]).summary.savings.estimatedAmount).toBe('45.00')
    expect(calculateInsights(records, adaptSettings({ ...profile, pricePerPack: 30 }, 'Asia/Shanghai'), dates[2]).summary.savings.estimatedAmount).toBe('67.50')
    expect(records).toEqual(rows([0, 0, 0]))
  })
})
