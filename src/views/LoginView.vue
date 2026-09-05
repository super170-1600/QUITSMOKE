<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { getFriendlyAuthError } from '@/utils/authError'
import { authPresentation } from '@/api/auth'

const identifier = ref('')
const password = ref('')
const mode = ref<'login' | 'register'>('login')
const confirmationSent = ref(false)
const loadingAction = ref<'login' | 'register' | null>(null)
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const devToolsEnabled = import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true'

function validateForm() {
  if (!identifier.value.trim() || !password.value) {
    showFailToast(`请输入${authPresentation.label}和密码`)
    return false
  }
  return true
}

async function login() {
  if (!validateForm() || loadingAction.value) return
  loadingAction.value = 'login'
  try {
    await authStore.login(identifier.value.trim(), password.value)
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
    const session = await authStore.register(identifier.value.trim(), password.value)
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
      <div class="brand-lockup"><div class="brand-mark"><span>N</span><i /></div><div><b>NO SMOKING</b><small>FAMILY QUIT COMPANION</small></div></div>
      <div class="brand-copy"><span>一起戒烟</span><h1>今天，轻一点。</h1></div>
      <figure class="hero-visual"><img src="/images/no-smoking-hero.jpg" alt="熄灭的香烟与新生绿叶" /><figcaption><van-icon name="friends-o" />家人同行</figcaption></figure>
    </section>

    <section class="auth-card">
      <template v-if="confirmationSent">
        <div class="mail-success"><div><van-icon name="passed" /></div><span>{{ authPresentation.identifierKind === 'email' ? '验证邮件已发送' : '账号已创建' }}</span><h2>{{ authPresentation.identifierKind === 'email' ? '去邮箱完成最后一步' : '现在可以登录了' }}</h2><p v-if="authPresentation.identifierKind === 'email'">我们已向 <b>{{ identifier.trim() }}</b> 发送验证链接。确认后回到这里登录。</p><p v-else>请使用刚才设置的用户名和密码登录。</p><button @click="selectMode('login')">返回登录</button></div>
      </template>
      <template v-else>
        <div class="auth-heading"><h2>{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</h2></div>
        <nav class="auth-switch" aria-label="账号操作">
          <button :class="{ active: mode === 'login' }" @click="selectMode('login')">登录</button>
          <button :class="{ active: mode === 'register' }" @click="selectMode('register')">注册</button>
        </nav>
        <form @submit.prevent="mode === 'login' ? login() : register()">
          <label>{{ authPresentation.label }}</label>
          <van-field v-model="identifier" :type="authPresentation.inputType" :autocomplete="authPresentation.autocomplete" :placeholder="authPresentation.placeholder" :left-icon="authPresentation.identifierKind === 'email' ? 'envelop-o' : 'contact-o'" />
          <label>密码</label>
          <van-field v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" placeholder="请输入密码" left-icon="lock" />
          <small v-if="mode === 'register'" class="password-note">请使用一个只有你知道的安全密码</small>
          <van-button native-type="submit" class="auth-submit" type="primary" round block size="large" :loading="loadingAction === mode" :disabled="loadingAction !== null">
            {{ mode === 'login' ? '登录 NO SMOKING' : '创建账号' }}
          </van-button>
        </form>
        <p class="mode-hint">{{ mode === 'login' ? '第一次来到这里？' : '已经有账号？' }}<button @click="selectMode(mode === 'login' ? 'register' : 'login')">{{ mode === 'login' ? '注册账号' : '直接登录' }}</button></p>
      </template>
    </section>

    <footer><van-icon name="shield-o" />家庭数据仅成员可见</footer>
    <button v-if="devToolsEnabled" class="auth-debug-link" @click="router.push('/auth-debug')">账号诊断</button>
  </main>
</template>

<style scoped>
.login-page{position:relative;isolation:isolate;min-height:100vh;overflow:hidden;max-width:480px;margin:auto;padding:25px 18px 24px}.brand-glow{position:fixed;z-index:-1;border-radius:50%;filter:blur(2px);pointer-events:none}.glow-one{width:280px;height:280px;left:-160px;top:-100px;background:rgba(108,171,126,.13)}.glow-two{width:260px;height:260px;right:-150px;top:280px;background:rgba(218,194,146,.12)}.brand-panel{padding:3px 4px 16px}.brand-lockup{display:flex;align-items:center;gap:10px}.brand-mark{position:relative;display:grid;width:42px;height:42px;place-items:center;border-radius:15px;background:linear-gradient(145deg,#3f8d59,#225f43);box-shadow:0 9px 22px rgba(35,100,65,.22);color:#fff;font-size:15px;font-weight:850}.brand-mark i{position:absolute;width:9px;height:6px;right:4px;top:4px;border-radius:90% 0 90% 0;background:#a9d4b5;transform:rotate(-18deg)}.brand-lockup>div:last-child{display:flex;flex-direction:column}.brand-lockup b{color:var(--green-900);font-size:18px;letter-spacing:.02em}.brand-lockup small{margin-top:1px;color:#97a39c;font-size:7px;letter-spacing:.12em}.brand-copy{display:flex;align-items:baseline;justify-content:space-between;margin-top:19px}.brand-copy>span{color:var(--green-700);font-size:10px;font-weight:750}.brand-copy h1{margin:0;color:#183b2c;font-size:27px;line-height:1.1;letter-spacing:-.045em}.hero-visual{position:relative;overflow:hidden;height:178px;margin:13px 0 0;border-radius:23px;background:#edf2e7;box-shadow:0 14px 34px rgba(42,77,50,.11)}.hero-visual img{width:100%;height:100%;object-fit:cover;object-position:center 59%;display:block}.hero-visual:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(19,54,37,.22))}.hero-visual figcaption{position:absolute;z-index:1;left:13px;bottom:11px;display:flex;align-items:center;gap:5px;border-radius:99px;padding:6px 10px;background:rgba(255,255,255,.82);backdrop-filter:blur(9px);color:var(--green-700);font-size:9px;font-weight:750}.auth-card{padding:19px 20px 20px;border-radius:25px;background:rgba(255,255,255,.9);box-shadow:0 18px 50px rgba(29,63,45,.1);backdrop-filter:blur(16px)}.auth-heading h2{margin:0 0 14px;font-size:20px}.auth-switch{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:16px;padding:4px;border-radius:14px;background:#edf1ee}.auth-switch button{border:0;border-radius:11px;padding:9px;background:transparent;color:#7c8881;font-size:12px}.auth-switch button.active{background:#fff;color:var(--green-700);box-shadow:0 3px 11px rgba(28,67,45,.08);font-weight:750}.auth-card form>label{display:block;margin:11px 3px 7px;color:#48594f;font-size:11px;font-weight:700}.auth-card :deep(.van-field){padding:12px 13px;border-radius:14px;background:#f5f8f6}.password-note{display:block;margin:7px 3px 0;color:#98a19c;font-size:9px}.auth-submit{height:50px;margin-top:18px;box-shadow:0 10px 23px rgba(40,106,77,.2);font-size:14px;font-weight:750}.mode-hint{margin:14px 0 0;text-align:center;color:var(--text-muted);font-size:10px}.mode-hint button{border:0;background:transparent;color:var(--green-700);font-weight:750}.mail-success{display:flex;min-height:330px;align-items:center;justify-content:center;flex-direction:column;text-align:center}.mail-success>div{display:grid;width:58px;height:58px;place-items:center;border-radius:20px;background:var(--green-100);color:var(--green-700);font-size:29px}.mail-success>span{margin-top:18px;color:var(--green-700);font-size:11px;font-weight:750}.mail-success h2{margin:6px 0 9px;font-size:23px}.mail-success p{max-width:310px;margin:0;color:var(--text-muted);font-size:12px;line-height:1.6}.mail-success p b{color:#53635a}.mail-success button{margin-top:22px;border:0;border-radius:14px;padding:11px 22px;background:var(--green-700);color:#fff;font-weight:700}.login-page>footer{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:13px;color:#98a19c;font-size:9px}@media(min-height:860px){.login-page{padding-top:35px}.hero-visual{height:192px}}@media(max-width:350px){.brand-copy h1{font-size:24px}.hero-visual{height:158px}}
.auth-debug-link{display:block;margin:9px auto 0;border:0;background:transparent;color:#739080;font-size:10px;text-decoration:underline}
</style>
