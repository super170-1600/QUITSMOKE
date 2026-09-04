import type {
  CheckinModel,
  FamilyMemberModel,
  FamilyQuitterSummary,
  SmokingProfileModel,
} from '@/types/domain'
import { buildDailyTrend, calculateSmokingStatistics } from '@/utils/statistics'
import { getLocalDateString } from '@/utils/date'

export function buildFamilyQuitterSummary(
  member: FamilyMemberModel,
  smokingProfile: SmokingProfileModel | null,
  checkins: CheckinModel[],
  today: string = getLocalDateString(),
): FamilyQuitterSummary {
  return {
    member,
    smokingProfile,
    todayCheckin: checkins.find((checkin) => checkin.checkinDate === today) ?? null,
    statistics: smokingProfile ? calculateSmokingStatistics(smokingProfile, checkins, today) : null,
    trendData: buildDailyTrend(checkins, today),
    checkins,
    loadFailed: false,
  }
}
