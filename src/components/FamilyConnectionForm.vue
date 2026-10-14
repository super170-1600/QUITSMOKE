<script setup lang="ts">
import WorkflowSpace from '@/components/WorkflowSpace.vue'
import { computed, ref } from 'vue'

import { showFailToast, showSuccessToast } from 'vant'
import { useFamilyStore } from '@/stores/family'
import type { FamilyRole } from '@/types/database'

const emit=defineEmits<{completed:[]}>()
const familyStore = useFamilyStore()
const mode = ref<'create' | 'join'>('create')
const familyName = ref('')
const inviteCode = ref('')
const role = ref<FamilyRole>('quitter')
const submitting = ref(false)

const roleCopy = computed(() => role.value === 'quitter'
  ? { title: '记录自己的戒烟变化', detail: '每天打卡，查看趋势，也能收到家人的回应。', icon: 'records-o' }
  : { title: '陪家人一起坚持', detail: '查看戒烟进展、发送鼓励，并记录自己的陪伴。', icon: 'friends-o' })
const actionLabel = computed(() => `${mode.value === 'create' ? '创建家庭' : '加入家庭'} · ${role.value === 'quitter' ? '我是戒烟者' : '我是支持者'}`)

function friendlyJoinError(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    const message = error.message.toLowerCase()
    if (message.includes('invalid invite code')) return '没有找到这个家庭，请检查邀请码。'
    if (message.includes('already belongs') || message.includes('duplicate')) return '每个账号只能加入一个家庭，请先退出当前家庭。'
  }
  return '加入失败，请稍后重试。'
}

function friendlyCreateError(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    const message = error.message.toLowerCase()
    if (message.includes('already belongs') || message.includes('duplicate')) return '每个账号只能加入一个家庭，请先退出当前家庭。'
  }
  return '创建失败，请稍后重试。'
}

async function submitCreate() {
  if (submitting.value) return
  if (!familyName.value.trim()) {
    showFailToast('请输入家庭名称')
    return
  }
  submitting.value = true
  try {
    await familyStore.createFamily(familyName.value.trim(), role.value)
    showSuccessToast(role.value === 'quitter' ? '家庭已创建' : '家庭已创建')
    emit('completed')
  } catch (error: unknown) {
    console.error('创建家庭失败', error)
    showFailToast(friendlyCreateError(error))
  } finally {
    submitting.value = false
  }
}

async function submitJoin() {
  if (submitting.value) return
  const normalizedCode = inviteCode.value.trim().toUpperCase()
  if (!normalizedCode) {
    showFailToast('请输入邀请码')
    return
  }
  submitting.value = true
  try {
    await familyStore.joinFamily(normalizedCode, role.value)
    showSuccessToast(role.value === 'supporter' ? '已加入家庭' : '已加入家庭')
    emit('completed')
  } catch (error: unknown) {
    console.error('加入家庭失败', error)
    showFailToast(friendlyJoinError(error))
  } finally {
    submitting.value = false
  }
}
</script>
<template><WorkflowSpace embedded code="CONNECTION / SETUP"><nav class="workflow-tabs" aria-label="家庭操作"><button :aria-pressed="mode==='create'" :disabled="submitting" @click="mode='create'">创建家庭</button><button :aria-pressed="mode==='join'" :disabled="submitting" @click="mode='join'">加入家庭</button></nav><form @submit.prevent="mode==='create'?submitCreate():submitJoin()"><fieldset :disabled="submitting"><label v-if="mode==='create'">家庭名称<input v-model="familyName" required maxlength="60" aria-label="家庭名称"/></label><label v-else>邀请码<input v-model="inviteCode" required aria-label="邀请码"/></label><div class="workflow-tabs" aria-label="家庭身份"><button type="button" :aria-pressed="role==='quitter'" @click="role='quitter'">戒烟者</button><button type="button" :aria-pressed="role==='supporter'" @click="role='supporter'">支持者</button></div><button class="workflow-submit" type="submit">{{submitting?'处理中…':mode==='create'?'创建家庭':'加入家庭'}}</button></fieldset></form></WorkflowSpace></template>
<style scoped>
:deep(.workflow-embedded){min-height:0;background:transparent}:deep(.workflow-content){width:100%;margin:0;padding:0}:deep(.workflow-tabs){margin-bottom:18px}
</style>
