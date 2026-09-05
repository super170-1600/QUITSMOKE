import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  deleteMyEncouragement,
  getEncouragements,
  getMyEncouragementActivity,
  sendMessage as sendMessageRequest,
  sendReaction as sendReactionRequest,
  type ReactionType,
} from '@/api/encouragement'
import type { EncouragementModel } from '@/types/domain'
import { getReactionCooldownKey, isReactionCooldownActive, normalizeEncouragementMessage } from '@/utils/encouragement'

const REACTION_COOLDOWN_MS = 10_000

export const useEncouragementStore = defineStore('encouragement', () => {
  const items = ref<EncouragementModel[]>([])
  const myItems = ref<EncouragementModel[]>([])
  const myTotal = ref(0)
  const loading = ref(false)
  const sending = ref(false)
  const reactionCooldownUntil = ref<Record<string, number>>({})
  const authStore = useAuthStore()
  const cooldownTimers = new Map<string, ReturnType<typeof setTimeout>>()

  async function loadEncouragements(familyId: string) {
    loading.value = true
    try {
      const rows = await getEncouragements(familyId)
      items.value = rows.map((row) => ({ id: row.id, familyId: row.family_id, fromUserId: row.from_user_id, toUserId: row.to_user_id, type: row.type, message: row.message ?? '', createdAt: row.created_at, fromNickname: row.from_nickname }))
      return items.value
    } finally {
      loading.value = false
    }
  }

  function toModel(row: Awaited<ReturnType<typeof getMyEncouragementActivity>>['items'][number]): EncouragementModel {
    return { id: row.id, familyId: row.family_id, fromUserId: row.from_user_id, toUserId: row.to_user_id, type: row.type, message: row.message ?? '', createdAt: row.created_at, fromNickname: row.from_nickname }
  }

  async function loadMyActivity(familyId: string) {
    const result = await getMyEncouragementActivity(familyId)
    myItems.value = result.items.map(toModel)
    myTotal.value = result.total
    return myItems.value
  }

  function reactionKey(toUserId: string, type: ReactionType) {
    return getReactionCooldownKey(toUserId, type)
  }

  function isReactionCoolingDown(toUserId: string, type: ReactionType) {
    return isReactionCooldownActive(reactionCooldownUntil.value, toUserId, type)
  }

  function startReactionCooldown(toUserId: string, type: ReactionType) {
    const key = reactionKey(toUserId, type)
    reactionCooldownUntil.value = { ...reactionCooldownUntil.value, [key]: Date.now() + REACTION_COOLDOWN_MS }
    const existingTimer = cooldownTimers.get(key)
    if (existingTimer) clearTimeout(existingTimer)
    cooldownTimers.set(key, setTimeout(() => {
      const next = { ...reactionCooldownUntil.value }
      delete next[key]
      reactionCooldownUntil.value = next
      cooldownTimers.delete(key)
    }, REACTION_COOLDOWN_MS))
  }

  function rememberSentReaction(
    row: Awaited<ReturnType<typeof sendReactionRequest>>,
    fromNickname: string,
  ) {
    const model: EncouragementModel = {
      id: row.id,
      familyId: row.family_id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      type: row.type,
      message: row.message ?? '',
      createdAt: row.created_at,
      fromNickname,
    }
    const alreadyRemembered = myItems.value.some((item) => item.id === model.id)
    items.value = [model, ...items.value.filter((item) => item.id !== model.id)].slice(0, 100)
    myItems.value = [model, ...myItems.value.filter((item) => item.id !== model.id)].slice(0, 100)
    if (!alreadyRemembered) myTotal.value += 1
  }

  function assertCanSend(toUserId: string) {
    if (sending.value) throw new Error('请稍候再发送。')
    if (toUserId === authStore.user?.id) throw new Error('不能给自己发送鼓励。')
  }

  async function sendReaction(familyId: string, toUserId: string, type: ReactionType, fromNickname = '我') {
    assertCanSend(toUserId)
    if (isReactionCoolingDown(toUserId, type)) throw new Error('这份鼓励刚刚送达，请稍后再发送。')
    sending.value = true
    try {
      const row = await sendReactionRequest({ familyId, toUserId, type })
      startReactionCooldown(toUserId, type)
      rememberSentReaction(row, fromNickname)
      const refreshResults = await Promise.allSettled([loadEncouragements(familyId), loadMyActivity(familyId)])
      refreshResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(index === 0 ? '鼓励已送达，但刷新家庭动态失败' : '鼓励已送达，但刷新陪伴记录失败', result.reason)
        }
      })
    } finally {
      sending.value = false
    }
  }

  async function sendMessage(familyId: string, toUserId: string, message: string) {
    assertCanSend(toUserId)
    const normalized = normalizeEncouragementMessage(message)
    if (!normalized) throw new Error('鼓励内容需为 1–200 字。')
    sending.value = true
    try {
      await sendMessageRequest({ familyId, toUserId, message: normalized })
      await loadEncouragements(familyId)
      await loadMyActivity(familyId)
    } finally {
      sending.value = false
    }
  }

  async function deleteMine(familyId: string, id: string) {
    await deleteMyEncouragement(id)
    await Promise.all([loadEncouragements(familyId), loadMyActivity(familyId)])
  }

  function reset() {
    cooldownTimers.forEach((timer) => clearTimeout(timer))
    cooldownTimers.clear()
    items.value = []
    myItems.value = []
    myTotal.value = 0
    loading.value = false
    sending.value = false
    reactionCooldownUntil.value = {}
  }

  return { items, myItems, myTotal, loading, sending, reactionCooldownUntil, isReactionCoolingDown, loadEncouragements, loadMyActivity, sendReaction, sendMessage, deleteMine, reset }
})
