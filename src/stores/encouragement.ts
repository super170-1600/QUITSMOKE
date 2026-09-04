import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  deleteMyEncouragement,
  getEncouragements,
  sendMessage as sendMessageRequest,
  sendReaction as sendReactionRequest,
  type ReactionType,
} from '@/api/encouragement'
import type { EncouragementModel } from '@/types/domain'
import { normalizeEncouragementMessage } from '@/utils/encouragement'

const SEND_COOLDOWN_MS = 1000

export const useEncouragementStore = defineStore('encouragement', () => {
  const items = ref<EncouragementModel[]>([])
  const loading = ref(false)
  const sending = ref(false)
  const coolingDown = ref(false)
  const authStore = useAuthStore()
  let cooldownTimer: ReturnType<typeof setTimeout> | null = null

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

  function startCooldown() {
    coolingDown.value = true
    if (cooldownTimer) clearTimeout(cooldownTimer)
    cooldownTimer = setTimeout(() => { coolingDown.value = false }, SEND_COOLDOWN_MS)
  }

  function assertCanSend(toUserId: string) {
    if (sending.value || coolingDown.value) throw new Error('请稍候再发送。')
    if (toUserId === authStore.user?.id) throw new Error('不能给自己发送鼓励。')
  }

  async function sendReaction(familyId: string, toUserId: string, type: ReactionType) {
    assertCanSend(toUserId)
    sending.value = true
    try {
      await sendReactionRequest({ familyId, toUserId, type })
      await loadEncouragements(familyId)
    } finally {
      sending.value = false
      startCooldown()
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
    } finally {
      sending.value = false
      startCooldown()
    }
  }

  async function deleteMine(familyId: string, id: string) {
    await deleteMyEncouragement(id)
    await loadEncouragements(familyId)
  }

  return { items, loading, sending, coolingDown, loadEncouragements, sendReaction, sendMessage, deleteMine }
})
