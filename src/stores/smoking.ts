import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  createMySmokingProfile,
  getMySmokingProfile,
  updateMySmokingProfile,
} from '@/api/smokingProfile'
import {
  createCheckin,
  getCheckinsBetween,
  getTodayCheckin,
  updateCheckin,
} from '@/api/checkin'
import type { Checkin, SmokingProfile } from '@/types/database'
import type {
  CheckinFormValues,
  CheckinModel,
  DailyTrendPoint,
  SmokingProfileFormValues,
  SmokingProfileModel,
  SmokingStatistics,
} from '@/types/domain'
import { buildDailyTrend, calculateSmokingStatistics } from '@/utils/statistics'
import { getLocalDateString } from '@/utils/date'

function toSmokingProfileModel(profile: SmokingProfile): SmokingProfileModel {
  return {
    id: profile.id,
    quitStartDate: profile.quit_start_date,
    baselineDailyCigarettes: profile.baseline_daily_cigarettes,
    cigarettesPerPack: profile.cigarettes_per_pack,
    pricePerPack: profile.price_per_pack,
  }
}

function toCheckinModel(checkin: Checkin): CheckinModel {
  return {
    id: checkin.id,
    checkinDate: checkin.checkin_date,
    cigarettes: checkin.cigarettes,
    cravingLevel: checkin.craving_level,
    note: checkin.note ?? '',
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

export const useSmokingStore = defineStore('smoking', () => {
  const smokingProfile = ref<SmokingProfileModel | null>(null)
  const todayCheckin = ref<CheckinModel | null>(null)
  const checkins = ref<CheckinModel[]>([])
  const statistics = ref<SmokingStatistics | null>(null)
  const trendData = ref<DailyTrendPoint[]>([])
  const loading = ref(false)
  const profileLoadedForUser = ref<string | null>(null)
  const statisticsLoadedForUser = ref<string | null>(null)
  const statisticsDate = ref<string | null>(null)
  const authStore = useAuthStore()

  const hasSmokingProfile = computed(() => smokingProfile.value !== null)

  async function loadSmokingProfile() {
    const userId = authStore.user?.id
    if (!userId) throw new Error('登录状态已失效，请重新登录。')
    loading.value = true
    try {
      const profile = await getMySmokingProfile()
      smokingProfile.value = profile ? toSmokingProfileModel(profile) : null
      profileLoadedForUser.value = userId
      return smokingProfile.value
    } finally {
      loading.value = false
    }
  }

  async function ensureSmokingProfileLoaded() {
    const userId = authStore.user?.id
    if (!userId) throw new Error('登录状态已失效，请重新登录。')
    if (profileLoadedForUser.value !== userId) return loadSmokingProfile()
    return smokingProfile.value
  }

  async function loadTodayCheckin() {
    loading.value = true
    try {
      const checkin = await getTodayCheckin()
      todayCheckin.value = checkin ? toCheckinModel(checkin) : null
      return todayCheckin.value
    } finally {
      loading.value = false
    }
  }

  function recalculateStatistics(today = getLocalDateString()) {
    if (!smokingProfile.value) {
      statistics.value = null
      trendData.value = buildDailyTrend(checkins.value, today)
      return null
    }
    statistics.value = calculateSmokingStatistics(smokingProfile.value, checkins.value, today)
    trendData.value = buildDailyTrend(checkins.value, today)
    todayCheckin.value = checkins.value.find((item) => item.checkinDate === today) ?? null
    return statistics.value
  }

  async function loadStatistics() {
    const userId = authStore.user?.id
    if (!userId) throw new Error('登录状态已失效，请重新登录。')
    loading.value = true
    try {
      const profile = await ensureSmokingProfileLoaded()
      const today = getLocalDateString()
      if (!profile || profile.quitStartDate > today) {
        checkins.value = []
      } else {
        const rows = await getCheckinsBetween(profile.quitStartDate, today)
        checkins.value = rows.map(toCheckinModel)
      }
      statisticsLoadedForUser.value = userId
      statisticsDate.value = today
      return recalculateStatistics(today)
    } finally {
      loading.value = false
    }
  }

  async function ensureStatisticsLoaded() {
    const userId = authStore.user?.id
    const today = getLocalDateString()
    if (!userId) throw new Error('登录状态已失效，请重新登录。')
    if (statisticsLoadedForUser.value !== userId || statisticsDate.value !== today) {
      return loadStatistics()
    }
    return statistics.value
  }

  async function saveSmokingProfile(values: SmokingProfileFormValues) {
    const input = {
      quit_start_date: values.quitStartDate,
      baseline_daily_cigarettes: values.baselineDailyCigarettes,
      cigarettes_per_pack: values.cigarettesPerPack,
      price_per_pack: values.pricePerPack,
    }
    const saved = smokingProfile.value
      ? await updateMySmokingProfile(input)
      : await createMySmokingProfile(input)
    smokingProfile.value = toSmokingProfileModel(saved)
    profileLoadedForUser.value = authStore.user?.id ?? null
    statisticsLoadedForUser.value = null
    return smokingProfile.value
  }

  async function saveTodayCheckin(values: CheckinFormValues) {
    const note = values.note.trim() || null
    if (todayCheckin.value) {
      const saved = await updateCheckin(todayCheckin.value.id, {
        cigarettes: values.cigarettes,
        craving_level: values.cravingLevel,
        note,
      })
      todayCheckin.value = toCheckinModel(saved)
      updateCachedCheckin(todayCheckin.value)
      return todayCheckin.value
    }

    try {
      const saved = await createCheckin({
        checkin_date: values.checkinDate,
        cigarettes: values.cigarettes,
        craving_level: values.cravingLevel,
        note,
      })
      todayCheckin.value = toCheckinModel(saved)
      updateCachedCheckin(todayCheckin.value)
      return todayCheckin.value
    } catch (error: unknown) {
      if (!isUniqueViolation(error)) throw error
      const existing = await loadTodayCheckin()
      if (!existing) throw error
      const saved = await updateCheckin(existing.id, {
        cigarettes: values.cigarettes,
        craving_level: values.cravingLevel,
        note,
      })
      todayCheckin.value = toCheckinModel(saved)
      updateCachedCheckin(todayCheckin.value)
      return todayCheckin.value
    }
  }

  function updateCachedCheckin(checkin: CheckinModel) {
    const index = checkins.value.findIndex((item) => item.checkinDate === checkin.checkinDate)
    if (index === -1) checkins.value.push(checkin)
    else checkins.value[index] = checkin
    if (statistics.value) recalculateStatistics()
  }

  return {
    smokingProfile,
    todayCheckin,
    checkins,
    statistics,
    trendData,
    loading,
    hasSmokingProfile,
    loadSmokingProfile,
    ensureSmokingProfileLoaded,
    loadTodayCheckin,
    loadStatistics,
    ensureStatisticsLoaded,
    saveSmokingProfile,
    saveTodayCheckin,
  }
})
