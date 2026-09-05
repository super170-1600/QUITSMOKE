import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getFamilyMessages,
  getMyFamilyMessageActivity,
  sendFamilyTextMessage,
  subscribeToFamilyActivity,
  type FamilyRealtimeStatus,
} from '@/api/message'
import type { FamilyMessageModel } from '@/types/domain'

export const useMessageStore = defineStore('message', () => {
  const items = ref<FamilyMessageModel[]>([])
  const myItems = ref<FamilyMessageModel[]>([])
  const myTotal = ref(0)
  const loading = ref(false)
  const sending = ref(false)
  const realtimeStatus = ref<FamilyRealtimeStatus>('idle')
  let stopSubscription: (() => void) | null = null

  function toModel(row: Awaited<ReturnType<typeof sendFamilyTextMessage>>, senderNickname: string): FamilyMessageModel {
    return {
      id: row.id,
      familyId: row.family_id,
      senderId: row.sender_id,
      type: row.type,
      content: row.content,
      createdAt: row.created_at,
      senderNickname,
    }
  }

  function rememberSentMessage(message: FamilyMessageModel) {
    const alreadyRemembered = myItems.value.some((item) => item.id === message.id)
    items.value = [...items.value.filter((item) => item.id !== message.id), message]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(-100)
    myItems.value = [message, ...myItems.value.filter((item) => item.id !== message.id)].slice(0, 100)
    if (!alreadyRemembered) myTotal.value += 1
  }

  async function loadMessages(familyId: string) {
    loading.value = true
    try {
      const rows = await getFamilyMessages(familyId)
      items.value = rows.map((row) => ({
        id: row.id,
        familyId: row.family_id,
        senderId: row.sender_id,
        type: row.type,
        content: row.content,
        createdAt: row.created_at,
        senderNickname: row.sender_nickname,
      }))
      return items.value
    } finally {
      loading.value = false
    }
  }

  async function sendText(familyId: string, content: string, senderNickname = '我') {
    sending.value = true
    try {
      const row = await sendFamilyTextMessage(familyId, content)
      rememberSentMessage(toModel(row, senderNickname))
      const refreshResults = await Promise.allSettled([loadMessages(familyId), loadMyActivity(familyId)])
      refreshResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(index === 0 ? '消息已发送，但刷新家庭动态失败' : '消息已发送，但刷新陪伴记录失败', result.reason)
        }
      })
    } finally {
      sending.value = false
    }
  }

  async function loadMyActivity(familyId: string) {
    const result = await getMyFamilyMessageActivity(familyId)
    myItems.value = result.items.map((row) => ({
      id: row.id,
      familyId: row.family_id,
      senderId: row.sender_id,
      type: row.type,
      content: row.content,
      createdAt: row.created_at,
      senderNickname: row.sender_nickname,
    }))
    myTotal.value = result.total
    return myItems.value
  }

  function startRealtime(
    familyId: string,
    onEncouragementChange: () => unknown = () => undefined,
    onMessageChange: () => unknown = () => undefined,
  ) {
    stopRealtime()
    realtimeStatus.value = 'connecting'
    const safelyRun = (callback: () => unknown, errorLabel: string) => {
      try {
        void Promise.resolve(callback()).catch((error: unknown) => console.error(errorLabel, error))
      } catch (error: unknown) {
        console.error(errorLabel, error)
      }
    }
    stopSubscription = subscribeToFamilyActivity(
      familyId,
      () => {
        void loadMessages(familyId)
          .catch((error: unknown) => { console.error('刷新家庭消息失败', error) })
          .finally(() => safelyRun(onMessageChange, '消息到达后刷新页面数据失败'))
      },
      () => safelyRun(onEncouragementChange, '实时刷新快捷鼓励失败'),
      (status) => { realtimeStatus.value = status },
    )
  }

  function stopRealtime() {
    stopSubscription?.()
    stopSubscription = null
    realtimeStatus.value = 'idle'
  }

  function reset() {
    stopRealtime()
    items.value = []
    myItems.value = []
    myTotal.value = 0
    loading.value = false
    sending.value = false
  }

  return { items, myItems, myTotal, loading, sending, realtimeStatus, loadMessages, loadMyActivity, sendText, startRealtime, stopRealtime, reset }
})
