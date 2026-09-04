export interface SmokingProfileModel {
  id: string
  quitStartDate: string
  baselineDailyCigarettes: number
  cigarettesPerPack: number
  pricePerPack: number
}

export interface SmokingProfileFormValues {
  quitStartDate: string
  baselineDailyCigarettes: number
  cigarettesPerPack: number
  pricePerPack: number
}

export interface CheckinModel {
  id: string
  checkinDate: string
  cigarettes: number
  cravingLevel: number
  note: string
}

export interface CheckinFormValues {
  checkinDate: string
  cigarettes: number
  cravingLevel: number
  note: string
}

export type DailySmokingStatus = 'zero' | 'smoked' | 'missing'

export interface DailyTrendPoint {
  date: string
  cigarettes: number | null
  status: DailySmokingStatus
}

export interface SmokingStatistics {
  planDays: number
  currentStreak: number
  longestStreak: number
  expectedCigarettes: number
  actualCigarettes: number
  savedCigarettes: number
  savedMoney: number
  average7Days: number | null
  average30Days: number | null
  recordedAverage7Days: number | null
  recordedAverage30Days: number | null
  recent7TotalCigarettes: number
  recent30TotalCigarettes: number
  recent7RecordedDays: number
  recent30RecordedDays: number
  recent7WindowDays: number
  recent30WindowDays: number
  coverage7Days: number
  coverage30Days: number
  reductionRate7Days: number | null
  reductionRate30Days: number | null
  recordedDays: number
  missingDays: number
}

import type { EncouragementType, FamilyRole } from '@/types/database'

export interface FamilyModel {
  id: string
  name: string
  inviteCode: string
  createdBy: string
  createdAt: string
}

export interface FamilyMemberModel {
  id: string
  familyId: string
  userId: string
  role: FamilyRole
  joinedAt: string
  nickname: string
}

export interface CurrentFamilyContext {
  family: FamilyModel
  currentMember: FamilyMemberModel
  members: FamilyMemberModel[]
}

export interface FamilyQuitterSummary {
  member: FamilyMemberModel
  smokingProfile: SmokingProfileModel | null
  todayCheckin: CheckinModel | null
  statistics: SmokingStatistics | null
  trendData: DailyTrendPoint[]
  checkins: CheckinModel[]
  loadFailed: boolean
}

export interface EncouragementModel {
  id: string
  familyId: string
  fromUserId: string
  toUserId: string
  type: EncouragementType
  message: string
  createdAt: string
  fromNickname: string
}
