export interface DailyRecord {
  date: string
  cigarettesCount: number
  cravingScore: number | null
  mood?: string | null
  updatedAt?: string
}
export interface QuitSettings {
  quitStartDate: string
  timezone: string
  baselineCigarettesPerDay: string | null
  packPrice: string | null
  cigarettesPerPack: number | null
  currency: string
}
export interface DailyPoint {
  date: string
  status: 'recorded' | 'missing' | 'future'
  cigarettesCount: number | null
  cravingScore: number | null
  mood: string | null
  estimatedAmount: string | null
}
export interface Summary {
  asOfDate: string
  timezone: string
  sourceRange: { start: string; end: string }
  coverage: { expectedDays: number; recordedDays: number; missingDates: string[] }
  journey: {
    recordedDays: number
    currentVerifiedStreak: number
    currentStreakThrough: string | null
    todayPending: boolean
    longestVerifiedStreak: number
    observedCigarettes: number
  }
  craving: { mean: number | null; sampleDays: number }
  savings: { estimatedAmount: string | null; currency: string; coveredDays: number; isComplete: boolean; assumptions: string[] }
  recovery: { reachedIds: string[]; sourceVersion: string; eligibility: 'confirmed' | 'unknown'; reason: string }
}
export type InsightsRange = 7 | 30 | 90 | 'all'
export interface InsightsSnapshot { summary: Summary; points: DailyPoint[] }
