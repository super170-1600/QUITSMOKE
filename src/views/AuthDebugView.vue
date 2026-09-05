<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import {
  collectLiveAuthDiagnostics,
  type LiveAuthDiagnostics,
} from '@/services/backend/authDiagnostics'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()
const loading = ref(false)
const diagnostics = ref<LiveAuthDiagnostics | null>(null)
const capturedAt = ref('')

const report = computed(() => ({
  capturedAt: capturedAt.value,
  ...diagnostics.value,
  stores: {
    auth: {
      userId: authStore.user?.id ?? null,
      email: authStore.user?.email ?? null,
      username: authStore.user?.username ?? null,
      profileId: authStore.profile?.id ?? null,
      profileNickname: authStore.profile?.nickname ?? null,
    },
    family: {
      familyId: familyStore.currentFamily?.id ?? null,
      familyName: familyStore.currentFamily?.name ?? null,
      memberUserId: familyStore.currentMember?.userId ?? null,
      memberNickname: familyStore.currentMember?.nickname ?? null,
      memberRole: familyStore.currentMember?.role ?? null,
      initialized: familyStore.initialized,
    },
  },
}))

const mismatchMessages = computed(() => {
  const result: string[] = []
  const live = diagnostics.value
  if (!live) return result
  const currentId = live.currentUser?.normalizedUserId
  const sessionId = live.sessionUser?.normalizedUserId
  const claimsId = live.claimsSub
  const storeId = authStore.user?.id ?? null
  if (currentId && sessionId && currentId !== sessionId) result.push('SDK 当前用户与 SDK Session 不一致')
  if (claimsId && currentId && claimsId !== currentId) result.push('JWT sub 与 SDK 当前用户不一致')
  if (storeId && currentId && storeId !== currentId) result.push('Auth Store 与 SDK 当前用户不一致')
  if (live.profile?.requestedUserId && currentId && live.profile.requestedUserId !== currentId) result.push('Profile 查询使用了错误的用户 ID')
  if (live.loginUsername && live.currentUser?.sdkUsername && live.loginUsername !== live.currentUser.sdkUsername) result.push('输入用户名与 SDK 当前用户名不一致')
  return result
})

async function refresh() {
  if (loading.value) return
  loading.value = true
  try {
    diagnostics.value = await collectLiveAuthDiagnostics()
    capturedAt.value = new Date().toLocaleString()
    console.log({
      sdkUid: diagnostics.value.currentUser?.sdkUid ?? null,
      sdkSub: diagnostics.value.currentUser?.sdkSub ?? null,
      sdkId: diagnostics.value.currentUser?.sdkId ?? null,
      sdkUsername: diagnostics.value.currentUser?.sdkUsername ?? null,
      normalizedUserId: diagnostics.value.currentUser?.normalizedUserId ?? null,
      requestedUserId: diagnostics.value.profile?.requestedUserId ?? null,
      returnedProfileId: diagnostics.value.profile?.rawReturnedProfileId ?? null,
    })
    console.log(report.value)
  } catch (error: unknown) {
    console.error('[auth-debug] 读取诊断信息失败', error)
    showFailToast('读取诊断信息失败')
  } finally {
    loading.value = false
  }
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(report.value, null, 2))
    showSuccessToast('诊断信息已复制')
  } catch {
    showFailToast('复制失败，请截屏发送')
  }
}

onMounted(refresh)
</script>

<template>
  <main class="page debug-page">
    <van-nav-bar title="账号诊断" left-arrow @click-left="router.back()" />
    <div class="safety"><van-icon name="shield-o" />不显示密码、Token 或后端密钥，可直接截图发送。</div>

    <section v-if="mismatchMessages.length" class="mismatch">
      <b>发现 {{ mismatchMessages.length }} 处不一致</b>
      <span v-for="message in mismatchMessages" :key="message">{{ message }}</span>
    </section>
    <section v-else class="healthy"><van-icon name="passed" />当前快照未发现 ID 不一致</section>

    <section class="debug-card">
      <h2>登录链路</h2>
      <dl>
        <dt>输入用户名</dt><dd>{{ diagnostics?.loginUsername ?? '—' }}</dd>
        <dt>登录响应 ID</dt><dd>{{ diagnostics?.loginResponse?.normalizedUserId ?? '—' }}</dd>
        <dt>当前 SDK ID</dt><dd>{{ diagnostics?.currentUser?.normalizedUserId ?? '—' }}</dd>
        <dt>当前 SDK 用户名</dt><dd>{{ diagnostics?.currentUser?.sdkUsername ?? '—' }}</dd>
        <dt>Session ID</dt><dd>{{ diagnostics?.sessionUser?.normalizedUserId ?? '—' }}</dd>
        <dt>JWT sub</dt><dd>{{ diagnostics?.claimsSub ?? '—' }}</dd>
        <dt>JWT user_id</dt><dd>{{ diagnostics?.claimsUserId ?? '—' }}</dd>
      </dl>
    </section>

    <section class="debug-card">
      <h2>Profile 链路</h2>
      <dl>
        <dt>requestedUserId</dt><dd>{{ diagnostics?.profile?.requestedUserId ?? '—' }}</dd>
        <dt>原始返回 ID</dt><dd>{{ diagnostics?.profile?.rawReturnedProfileId ?? '—' }}</dd>
        <dt>Domain ID</dt><dd>{{ diagnostics?.profile?.returnedProfileId ?? '—' }}</dd>
        <dt>返回昵称</dt><dd>{{ diagnostics?.profile?.returnedNickname ?? '—' }}</dd>
      </dl>
    </section>

    <section class="debug-card">
      <h2>页面 Store</h2>
      <dl>
        <dt>Auth ID</dt><dd>{{ authStore.user?.id ?? '—' }}</dd>
        <dt>Auth 用户名</dt><dd>{{ authStore.user?.username ?? '—' }}</dd>
        <dt>Auth 邮箱</dt><dd>{{ authStore.user?.email ?? '—' }}</dd>
        <dt>Profile 昵称</dt><dd>{{ authStore.profile?.nickname ?? '—' }}</dd>
        <dt>家庭成员 ID</dt><dd>{{ familyStore.currentMember?.userId ?? '—' }}</dd>
        <dt>家庭成员昵称</dt><dd>{{ familyStore.currentMember?.nickname ?? '—' }}</dd>
        <dt>家庭</dt><dd>{{ familyStore.currentFamily?.name ?? '—' }}</dd>
      </dl>
    </section>

    <div class="actions">
      <van-button type="primary" round block :loading="loading" @click="refresh">重新采集</van-button>
      <van-button plain round block @click="copyReport">复制完整诊断</van-button>
    </div>
  </main>
</template>

<style scoped>
.debug-page{max-width:520px;margin:auto}.van-nav-bar{margin:-18px -16px 14px;background:transparent}.safety,.healthy,.mismatch{margin-bottom:12px;border-radius:15px;padding:12px 14px;font-size:12px}.safety,.healthy{display:flex;align-items:center;gap:7px;background:#eaf5ee;color:#286b49}.mismatch{display:flex;flex-direction:column;gap:5px;background:#fff1e3;color:#985a19}.mismatch b{font-size:14px}.debug-card{margin-bottom:12px;border-radius:18px;padding:16px;background:#fff;box-shadow:var(--shadow)}.debug-card h2{margin:0 0 12px;font-size:17px}.debug-card dl{display:grid;grid-template-columns:125px minmax(0,1fr);margin:0}.debug-card dt,.debug-card dd{margin:0;border-bottom:1px solid #edf1ee;padding:9px 0;font-size:12px}.debug-card dt{color:var(--text-muted)}.debug-card dd{overflow-wrap:anywhere;color:#20362a;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.actions{display:grid;gap:10px;margin-top:16px}
</style>
