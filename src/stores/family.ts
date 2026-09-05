import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  createFamily as createFamilyRequest,
  getCurrentFamily,
  getFamilyMembers,
  joinFamilyByInviteCode,
  leaveCurrentFamily,
} from '@/api/family'
import type { Family, FamilyMember, FamilyRole } from '@/types/database'
import type { Checkin, SmokingProfile } from '@/types/database'
import type { CheckinModel, FamilyMemberModel, FamilyModel, FamilyQuitterSummary, SmokingProfileModel } from '@/types/domain'
import { getSmokingProfileByUserId } from '@/api/smokingProfile'
import { getCheckinsForUserBetween } from '@/api/checkin'
import { buildFamilyQuitterSummary } from '@/utils/familySummary'
import { getLocalDateString } from '@/utils/date'
import { resolveSelectedQuitter } from '@/utils/familySelection'

function toFamilyModel(family: Family): FamilyModel {
  return { id: family.id, name: family.name, inviteCode: family.invite_code, createdBy: family.created_by, createdAt: family.created_at }
}

function toMemberModel(member: FamilyMember & { nickname?: string }): FamilyMemberModel {
  return { id: member.id, familyId: member.family_id, userId: member.user_id, role: member.role, joinedAt: member.joined_at, nickname: member.nickname ?? '家庭成员' }
}

function toSmokingProfileModel(profile: SmokingProfile): SmokingProfileModel {
  return { id: profile.id, quitStartDate: profile.quit_start_date, baselineDailyCigarettes: profile.baseline_daily_cigarettes, cigarettesPerPack: profile.cigarettes_per_pack, pricePerPack: profile.price_per_pack }
}

function toCheckinModel(checkin: Checkin): CheckinModel {
  return { id: checkin.id, checkinDate: checkin.checkin_date, cigarettes: checkin.cigarettes, cravingLevel: checkin.craving_level, note: checkin.note ?? '' }
}

export const useFamilyStore = defineStore('family', () => {
  const currentFamily = ref<FamilyModel | null>(null)
  const currentMember = ref<FamilyMemberModel | null>(null)
  const members = ref<FamilyMemberModel[]>([])
  const selectedQuitterId = ref('')
  const quitterSummaries = ref<Record<string, FamilyQuitterSummary>>({})
  const summariesLoading = ref(false)
  const loading = ref(false)
  const initialized = ref(false)
  const initializedForUser = ref<string | null>(null)
  const authStore = useAuthStore()

  const hasFamily = computed(() => currentFamily.value !== null && currentMember.value !== null)
  const isQuitter = computed(() => currentMember.value?.role === 'quitter')
  const isSupporter = computed(() => currentMember.value?.role === 'supporter')
  const inviteCode = computed(() => currentFamily.value?.inviteCode ?? '')
  const quitterMembers = computed(() => members.value.filter((member) => member.role === 'quitter'))
  const selectedQuitter = computed(() => (
    resolveSelectedQuitter(members.value, selectedQuitterId.value)
  ))

  function selectQuitter(userId?: string) {
    selectedQuitterId.value = resolveSelectedQuitter(members.value, userId)?.userId ?? ''
    return selectedQuitter.value
  }

  function clearFamilyData() {
    currentFamily.value = null
    currentMember.value = null
    members.value = []
    selectedQuitterId.value = ''
    quitterSummaries.value = {}
  }

  async function loadMembers() {
    if (!currentFamily.value) {
      members.value = []
      return []
    }
    const rows = await getFamilyMembers(currentFamily.value.id)
    members.value = rows.map(toMemberModel)
    selectQuitter(selectedQuitterId.value)
    const ownId = authStore.user?.id
    currentMember.value = members.value.find((member) => member.userId === ownId) ?? currentMember.value
    return members.value
  }

  async function loadQuitterSummaries() {
    const quitters = members.value.filter((member) => member.role === 'quitter')
    const today = getLocalDateString()
    summariesLoading.value = true
    try {
      const entries = await Promise.all(quitters.map(async (member) => {
        try {
          const profileRow = await getSmokingProfileByUserId(member.userId)
          if (!profileRow) return [member.userId, buildFamilyQuitterSummary(member, null, [], today)] as const
          const profile = toSmokingProfileModel(profileRow)
          const checkinRows = profile.quitStartDate > today ? [] : await getCheckinsForUserBetween(member.userId, profile.quitStartDate, today)
          return [member.userId, buildFamilyQuitterSummary(member, profile, checkinRows.map(toCheckinModel), today)] as const
        } catch (error: unknown) {
          console.error(`加载家庭戒烟者 ${member.userId} 的摘要失败`, error)
          return [member.userId, { member, smokingProfile: null, todayCheckin: null, statistics: null, trendData: [], checkins: [], loadFailed: true } satisfies FamilyQuitterSummary] as const
        }
      }))
      quitterSummaries.value = Object.fromEntries(entries)
      return quitterSummaries.value
    } finally {
      summariesLoading.value = false
    }
  }

  async function initializeFamily(force = false) {
    const userId = authStore.user?.id
    if (!userId) throw new Error('登录状态已失效，请重新登录。')
    if (!force && initialized.value && initializedForUser.value === userId) return currentFamily.value
    loading.value = true
    try {
      const result = await getCurrentFamily()
      currentFamily.value = result ? toFamilyModel(result.family) : null
      currentMember.value = result ? toMemberModel(result.membership) : null
      members.value = []
      if (!result) clearFamilyData()
      if (result) await loadMembers()
      initializedForUser.value = userId
      initialized.value = true
      return currentFamily.value
    } finally {
      loading.value = false
    }
  }

  async function refreshFamily() {
    return initializeFamily(true)
  }

  async function createFamily(name: string, role: FamilyRole) {
    await createFamilyRequest(name, role)
    await refreshFamily()
  }

  async function joinFamily(inviteCodeValue: string, role: FamilyRole) {
    await joinFamilyByInviteCode(inviteCodeValue, role)
    await refreshFamily()
  }

  async function leaveFamily() {
    await leaveCurrentFamily()
    clearFamilyData()
    initializedForUser.value = authStore.user?.id ?? null
    initialized.value = true
  }

  return { currentFamily, currentMember, members, selectedQuitterId, quitterMembers, selectedQuitter, quitterSummaries, loading, summariesLoading, initialized, hasFamily, isQuitter, isSupporter, inviteCode, selectQuitter, initializeFamily, createFamily, joinFamily, leaveFamily, loadMembers, loadQuitterSummaries, refreshFamily }
})
