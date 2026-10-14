import type { CheckinModel, SmokingProfileModel } from '@/types/domain'
import type { DailyRecord, QuitSettings } from '../domain/types'

export function adaptRecords(records: CheckinModel[]): DailyRecord[] {
  return records.map(record => ({ date: record.checkinDate, cigarettesCount: record.cigarettes, cravingScore: record.cravingScore ?? null, mood: record.mood ?? null, updatedAt: record.updatedAt }))
}
export function adaptSettings(profile: SmokingProfileModel, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone): QuitSettings {
  return { quitStartDate: profile.quitStartDate, timezone, baselineCigarettesPerDay: String(profile.baselineDailyCigarettes), packPrice: String(profile.pricePerPack), cigarettesPerPack: profile.cigarettesPerPack, currency: 'CNY' }
}
