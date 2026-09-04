<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { useFamilyStore } from '@/stores/family'
import type { FamilyRole } from '@/types/database'

const router = useRouter()
const familyStore = useFamilyStore()
const mode = ref<'create' | 'join'>('create')
const familyName = ref('')
const inviteCode = ref('')
const role = ref<FamilyRole>('quitter')
const submitting = ref(false)

function friendlyJoinError(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    const message = error.message.toLowerCase()
    if (message.includes('invalid invite code')) return '没有找到这个家庭，请检查邀请码。'
    if (message.includes('duplicate') || message.includes('already')) return '你已经加入这个家庭。'
  }
  return '加入失败，请稍后重试。'
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
    showSuccessToast('家庭创建成功')
    await router.replace('/home')
  } catch (error: unknown) {
    console.error('创建家庭失败', error)
    showFailToast('创建失败，请稍后重试。')
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
    showSuccessToast('已加入家庭')
    await router.replace('/home')
  } catch (error: unknown) {
    console.error('加入家庭失败', error)
    showFailToast(friendlyJoinError(error))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="page setup-page">
    <div class="brand">🏠</div>
    <h1 class="page-title">加入你的家庭</h1>
    <p class="muted">一家人一起记录和陪伴，选择最适合你的方式。</p>
    <van-tabs v-model:active="mode" shrink>
      <van-tab title="创建家庭" name="create">
        <section class="card form-card">
          <van-field v-model="familyName" label="家庭名称" maxlength="50" placeholder="例如：杨家戒烟行动" />
        </section>
      </van-tab>
      <van-tab title="加入家庭" name="join">
        <section class="card form-card">
          <van-field v-model="inviteCode" label="邀请码" maxlength="8" placeholder="例如：AB12CD34" autocapitalize="characters" @update:model-value="inviteCode = inviteCode.toUpperCase()" />
        </section>
      </van-tab>
    </van-tabs>
    <section class="role-section">
      <h2>选择你的身份</h2>
      <van-radio-group v-model="role" direction="horizontal">
        <van-radio name="quitter">我是戒烟者</van-radio>
        <van-radio name="supporter">我是支持者</van-radio>
      </van-radio-group>
    </section>
    <van-button type="primary" block round size="large" :loading="submitting" :disabled="submitting" @click="mode === 'create' ? submitCreate() : submitJoin()">
      {{ mode === 'create' ? '创建家庭' : '加入家庭' }}
    </van-button>
  </main>
</template>

<style scoped>.setup-page{max-width:520px;margin:auto;padding-top:54px}.brand{font-size:46px}.page-title{margin:10px 0}.van-tabs{margin:28px -16px 0}.form-card{margin:16px;border-radius:18px;padding:4px 2px}.role-section{margin:22px 2px 28px}.role-section h2{font-size:17px;margin-bottom:16px}.van-radio-group{gap:24px}</style>
