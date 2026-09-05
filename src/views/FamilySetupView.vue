<script setup lang="ts">
import { computed, ref } from 'vue'
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

const roleCopy = computed(() => role.value === 'quitter'
  ? { title: '记录自己的戒烟变化', detail: '每天打卡，查看趋势，也能收到家人的回应。', icon: 'records-o' }
  : { title: '陪家人一起坚持', detail: '查看戒烟进展、发送鼓励，并记录自己的陪伴。', icon: 'friends-o' })
const actionLabel = computed(() => `${mode.value === 'create' ? '创建家庭' : '加入家庭'} · ${role.value === 'quitter' ? '我是戒烟者' : '我是支持者'}`)

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
    showSuccessToast(role.value === 'quitter' ? '家庭已创建，接下来设置戒烟计划' : '家庭空间创建成功')
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
    showSuccessToast(role.value === 'supporter' ? '已加入家庭，一起陪伴吧' : '已加入家庭')
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
    <header class="setup-hero">
      <div class="home-mark"><van-icon name="home-o" /></div>
      <span>建立你的家庭空间</span>
      <h1>从一个共同的家开始</h1>
      <p>选择身份后，我们只展示与你有关的记录和操作。</p>
    </header>

    <section class="setup-card">
      <nav class="mode-switch" aria-label="家庭加入方式">
        <button :class="{ active: mode === 'create' }" @click="mode = 'create'"><van-icon name="plus" />创建家庭</button>
        <button :class="{ active: mode === 'join' }" @click="mode = 'join'"><van-icon name="friends-o" />加入家庭</button>
      </nav>

      <div class="family-input">
        <label>{{ mode === 'create' ? '给家庭取个名字' : '输入家人发来的邀请码' }}</label>
        <van-field
          v-if="mode === 'create'"
          v-model="familyName"
          maxlength="50"
          placeholder="例如：杨家的无烟计划"
          left-icon="home-o"
        />
        <van-field
          v-else
          v-model="inviteCode"
          maxlength="8"
          placeholder="例如：AB12CD34"
          autocapitalize="characters"
          left-icon="qr"
          @update:model-value="inviteCode = inviteCode.toUpperCase()"
        />
        <small>{{ mode === 'create' ? '创建后会生成邀请码，可在家庭成员页分享。' : '邀请码由已经加入家庭的人提供。' }}</small>
      </div>

      <div class="role-heading"><span>你在这个家庭中的身份</span><small>请选择一项</small></div>
      <div class="role-grid">
        <button :class="{ active: role === 'quitter' }" @click="role = 'quitter'">
          <i><van-icon name="records-o" /></i><b>我是戒烟者</b><span>记录与改变</span><van-icon class="role-check" name="passed" />
        </button>
        <button :class="{ active: role === 'supporter' }" @click="role = 'supporter'">
          <i><van-icon name="friends-o" /></i><b>我是支持者</b><span>陪伴与鼓励</span><van-icon class="role-check" name="passed" />
        </button>
      </div>

      <div class="role-preview"><van-icon :name="roleCopy.icon" /><div><b>{{ roleCopy.title }}</b><span>{{ roleCopy.detail }}</span></div></div>
    </section>

    <van-button class="submit-button" type="primary" block round size="large" :loading="submitting" :disabled="submitting" @click="mode === 'create' ? submitCreate() : submitJoin()">
      {{ actionLabel }}
    </van-button>
    <p class="privacy-note"><van-icon name="shield-o" />家庭记录仅对同一家庭成员可见</p>
  </main>
</template>

<style scoped>
.setup-page{max-width:520px;margin:auto;padding-top:34px}.setup-hero{margin:0 3px 24px}.home-mark{display:grid;width:48px;height:48px;place-items:center;margin-bottom:17px;border-radius:17px;background:linear-gradient(145deg,#dcefe1,#f7fbf8);box-shadow:var(--shadow);color:var(--green-700);font-size:24px}.setup-hero>span{color:var(--green-700);font-size:12px;font-weight:750}.setup-hero h1{max-width:360px;margin:5px 0 8px;font-size:31px;line-height:1.18;letter-spacing:-.045em}.setup-hero p{margin:0;color:var(--text-muted);font-size:13px;line-height:1.5}.setup-card{padding:17px;border-radius:24px;background:rgba(255,255,255,.86);box-shadow:var(--shadow)}.mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:4px;border-radius:15px;background:#edf1ee}.mode-switch button{display:flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:12px;padding:10px;background:transparent;color:#77837d;font-size:12px}.mode-switch button.active{background:#fff;color:var(--green-700);box-shadow:0 4px 12px rgba(33,73,51,.08);font-weight:750}.family-input{margin-top:20px}.family-input label{display:block;margin:0 2px 9px;font-size:14px;font-weight:700}.family-input :deep(.van-field){padding:13px 14px;border-radius:15px;background:#f5f8f6}.family-input small{display:block;margin:7px 3px 0;color:var(--text-muted);font-size:10px}.role-heading{display:flex;justify-content:space-between;margin:22px 2px 10px}.role-heading span{font-size:14px;font-weight:700}.role-heading small{color:var(--text-muted);font-size:10px}.role-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.role-grid button{position:relative;display:flex;align-items:flex-start;flex-direction:column;border:1px solid #e5ebe7;border-radius:17px;padding:14px;background:#fff;color:#5e6d65;text-align:left}.role-grid button>i{display:grid;width:33px;height:33px;place-items:center;margin-bottom:10px;border-radius:11px;background:#f0f4f1;color:#73827a;font-size:17px;font-style:normal}.role-grid button>b{font-size:13px}.role-grid button>span{margin-top:3px;color:#99a29d;font-size:10px}.role-grid button.active{border-color:#65a778;background:linear-gradient(145deg,#edf7f0,#fff);color:var(--green-700);box-shadow:0 7px 18px rgba(42,99,63,.08)}.role-grid button.active>i{background:var(--green-100);color:var(--green-700)}.role-check{position:absolute;right:10px;top:10px;opacity:0;color:var(--green-500)}.role-grid button.active .role-check{opacity:1}.role-preview{display:flex;align-items:center;gap:11px;margin-top:13px;padding:12px;border-radius:15px;background:linear-gradient(135deg,#f1f6f2,#fafcfa);color:var(--green-700)}.role-preview>.van-icon{font-size:20px}.role-preview>div{display:flex;flex-direction:column}.role-preview b{font-size:11px}.role-preview span{margin-top:2px;color:#748078;font-size:10px;line-height:1.4}.submit-button{height:54px;margin-top:18px;box-shadow:0 11px 25px rgba(40,106,77,.2);font-size:14px;font-weight:750}.privacy-note{display:flex;align-items:center;justify-content:center;gap:5px;margin:13px 0 0;color:#8a9690;font-size:10px}@media(max-width:350px){.role-grid{grid-template-columns:1fr}.setup-hero h1{font-size:28px}}
</style>
