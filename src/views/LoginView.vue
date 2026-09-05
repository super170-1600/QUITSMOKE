<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { getFriendlyAuthError } from '@/utils/authError'

const email = ref('')
const password = ref('')
const mode = ref<'login' | 'register'>('login')
const confirmationSent = ref(false)
const loadingAction = ref<'login' | 'register' | null>(null)
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

function validateForm() {
  if (!email.value.trim() || !password.value) {
    showFailToast('请输入邮箱和密码')
    return false
  }
  return true
}

async function login() {
  if (!validateForm() || loadingAction.value) return
  loadingAction.value = 'login'
  try {
    await authStore.login(email.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/home'
    await router.replace(redirect)
  } catch (error: unknown) {
    showFailToast(getFriendlyAuthError(error))
  } finally {
    loadingAction.value = null
  }
}

async function register() {
  if (!validateForm() || loadingAction.value) return
  loadingAction.value = 'register'
  try {
    const session = await authStore.register(email.value.trim(), password.value)
    if (session) {
      showSuccessToast('注册成功')
      await router.replace('/home')
    } else {
      confirmationSent.value = true
    }
  } catch (error: unknown) {
    showFailToast(getFriendlyAuthError(error))
  } finally {
    loadingAction.value = null
  }
}

function selectMode(nextMode: 'login' | 'register') {
  mode.value = nextMode
  confirmationSent.value = false
}
</script>

<template>
  <main class="login-page">
    <div class="brand-glow glow-one" /><div class="brand-glow glow-two" />
    <section class="brand-panel">
      <div class="brand-lockup"><div class="brand-mark"><span>无</span><i /></div><div><b>无烟之家</b><small>QUIT SMOKING · TOGETHER</small></div></div>
      <div class="brand-copy"><span>为爱戒烟 · 为家前行</span><h1>每天一点改变，<br />家人都看得见。</h1><p>记录真实状态，理解变化，也让陪伴有回应。</p></div>
      <div class="feature-row"><span><van-icon name="shield-o" />家庭可见</span><span><van-icon name="chart-trending-o" />趋势记录</span><span><van-icon name="friends-o" />共同陪伴</span></div>
    </section>

    <section class="auth-card">
      <template v-if="confirmationSent">
        <div class="mail-success"><div><van-icon name="passed" /></div><span>验证邮件已发送</span><h2>去邮箱完成最后一步</h2><p>我们已向 <b>{{ email.trim() }}</b> 发送验证链接。确认后回到这里登录。</p><button @click="selectMode('login')">返回登录</button></div>
      </template>
      <template v-else>
        <div class="auth-heading"><span>{{ mode === 'login' ? '欢迎回来' : '创建你的账号' }}</span><h2>{{ mode === 'login' ? '继续今天的记录' : '和家人一起开始' }}</h2></div>
        <nav class="auth-switch" aria-label="账号操作">
          <button :class="{ active: mode === 'login' }" @click="selectMode('login')">登录</button>
          <button :class="{ active: mode === 'register' }" @click="selectMode('register')">注册</button>
        </nav>
        <form @submit.prevent="mode === 'login' ? login() : register()">
          <label>邮箱</label>
          <van-field v-model="email" type="email" autocomplete="email" placeholder="name@example.com" left-icon="envelop-o" />
          <label>密码</label>
          <van-field v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" placeholder="请输入密码" left-icon="lock" />
          <small v-if="mode === 'register'" class="password-note">请使用一个只有你知道的安全密码</small>
          <van-button native-type="submit" class="auth-submit" type="primary" round block size="large" :loading="loadingAction === mode" :disabled="loadingAction !== null">
            {{ mode === 'login' ? '登录无烟之家' : '创建账号' }}
          </van-button>
        </form>
        <p class="mode-hint">{{ mode === 'login' ? '第一次来到这里？' : '已经有账号？' }}<button @click="selectMode(mode === 'login' ? 'register' : 'login')">{{ mode === 'login' ? '注册账号' : '直接登录' }}</button></p>
      </template>
    </section>

    <footer><van-icon name="shield-o" />账号只用于保存你与家人的戒烟记录</footer>
  </main>
</template>

<style scoped>
.login-page{position:relative;isolation:isolate;min-height:100vh;overflow:hidden;max-width:480px;margin:auto;padding:34px 18px 28px}.brand-glow{position:fixed;z-index:-1;border-radius:50%;filter:blur(2px);pointer-events:none}.glow-one{width:280px;height:280px;left:-160px;top:-100px;background:rgba(108,171,126,.13)}.glow-two{width:260px;height:260px;right:-150px;top:280px;background:rgba(218,194,146,.12)}.brand-panel{padding:3px 4px 22px}.brand-lockup{display:flex;align-items:center;gap:10px}.brand-mark{position:relative;display:grid;width:42px;height:42px;place-items:center;border-radius:15px;background:linear-gradient(145deg,#3f8d59,#225f43);box-shadow:0 9px 22px rgba(35,100,65,.22);color:#fff;font-size:15px;font-weight:850}.brand-mark i{position:absolute;width:9px;height:6px;right:4px;top:4px;border-radius:90% 0 90% 0;background:#a9d4b5;transform:rotate(-18deg)}.brand-lockup>div:last-child{display:flex;flex-direction:column}.brand-lockup b{color:var(--green-900);font-size:18px}.brand-lockup small{margin-top:1px;color:#97a39c;font-size:7px;letter-spacing:.12em}.brand-copy{margin-top:30px}.brand-copy>span{color:var(--green-700);font-size:11px;font-weight:750}.brand-copy h1{margin:7px 0 9px;color:#183b2c;font-size:34px;line-height:1.16;letter-spacing:-.055em}.brand-copy p{margin:0;color:var(--text-muted);font-size:13px}.feature-row{display:flex;gap:16px;margin-top:18px;color:#718078;font-size:10px}.feature-row span{display:flex;align-items:center;gap:4px}.feature-row .van-icon{color:var(--green-700)}.auth-card{padding:20px;border-radius:25px;background:rgba(255,255,255,.9);box-shadow:0 18px 50px rgba(29,63,45,.1);backdrop-filter:blur(16px)}.auth-heading>span{color:var(--green-700);font-size:10px;font-weight:750}.auth-heading h2{margin:4px 0 16px;font-size:21px}.auth-switch{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:18px;padding:4px;border-radius:14px;background:#edf1ee}.auth-switch button{border:0;border-radius:11px;padding:9px;background:transparent;color:#7c8881;font-size:12px}.auth-switch button.active{background:#fff;color:var(--green-700);box-shadow:0 3px 11px rgba(28,67,45,.08);font-weight:750}.auth-card form>label{display:block;margin:12px 3px 7px;color:#48594f;font-size:11px;font-weight:700}.auth-card :deep(.van-field){padding:12px 13px;border-radius:14px;background:#f5f8f6}.password-note{display:block;margin:7px 3px 0;color:#98a19c;font-size:9px}.auth-submit{height:50px;margin-top:19px;box-shadow:0 10px 23px rgba(40,106,77,.2);font-size:14px;font-weight:750}.mode-hint{margin:15px 0 0;text-align:center;color:var(--text-muted);font-size:10px}.mode-hint button{border:0;background:transparent;color:var(--green-700);font-weight:750}.mail-success{display:flex;min-height:330px;align-items:center;justify-content:center;flex-direction:column;text-align:center}.mail-success>div{display:grid;width:58px;height:58px;place-items:center;border-radius:20px;background:var(--green-100);color:var(--green-700);font-size:29px}.mail-success>span{margin-top:18px;color:var(--green-700);font-size:11px;font-weight:750}.mail-success h2{margin:6px 0 9px;font-size:23px}.mail-success p{max-width:310px;margin:0;color:var(--text-muted);font-size:12px;line-height:1.6}.mail-success p b{color:#53635a}.mail-success button{margin-top:22px;border:0;border-radius:14px;padding:11px 22px;background:var(--green-700);color:#fff;font-weight:700}.login-page>footer{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:16px;color:#98a19c;font-size:9px}@media(min-height:760px){.login-page{padding-top:48px}.brand-copy{margin-top:38px}}@media(max-width:350px){.brand-copy h1{font-size:30px}.feature-row{gap:9px}}
</style>
