<script setup lang="ts">
import WorkflowSpace from '@/components/WorkflowSpace.vue'
import {loginDestination} from '@/utils/newFlow'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { getFriendlyAuthError } from '@/utils/authError'
import { authPresentation } from '@/api/auth'

const errorMessage=ref('')
const props=withDefaults(defineProps<{embedded?:boolean}>(),{embedded:false})
const emit=defineEmits<{authenticated:[destination:string];busy:[value:boolean]}>()
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
    errorMessage.value='请输入账号和密码'
    return false
  }
  return true
}

async function login() {
  if (!validateForm() || loadingAction.value) return
  errorMessage.value='';loadingAction.value = 'login'
  emit('busy',true)
  try {
    await authStore.login(identifier.value.trim(), password.value)
    const redirect = loginDestination(route.query.redirect)
    if(props.embedded)emit('authenticated',redirect)
    else await router.replace(redirect)
  } catch (error: unknown) {
    errorMessage.value=getFriendlyAuthError(error)
  } finally {
    loadingAction.value = null
    password.value = '';emit('busy',false)
  }
}

async function register() {
  if (!validateForm() || loadingAction.value) return
  errorMessage.value='';loadingAction.value = 'register'
  emit('busy',true)
  try {
    const session = await authStore.register(identifier.value.trim(), password.value)
    if (session) {
      showSuccessToast('注册成功')
      if(props.embedded)emit('authenticated','/hub')
      else await router.replace('/hub')
    } else {
      confirmationSent.value = true
    }
  } catch (error: unknown) {
    errorMessage.value=getFriendlyAuthError(error)
  } finally {
    loadingAction.value = null
    password.value = '';emit('busy',false)
  }
}

function selectMode(nextMode: 'login' | 'register') {
  mode.value = nextMode
  confirmationSent.value = false
}
</script>
<template>
  <WorkflowSpace :embedded="embedded" code="IDENTITY / ACCESS">
    <div v-if="embedded" class="auth-optic workflow-optic" aria-hidden="true"><i/><i/><b/></div>
    <template v-if="confirmationSent">
      <p>{{authPresentation.identifierKind==='email'?'验证邮件已发送，请完成验证后登录。':'账号已创建，请登录。'}}</p>
      <button @click="selectMode('login')">返回登录</button>
    </template>
    <form v-else class="auth-form" @submit.prevent="mode==='login'?login():register()">
      <fieldset :disabled="loadingAction!==null">
        <div class="auth-input"><input v-model="identifier" :type="authPresentation.inputType" :autocomplete="authPresentation.autocomplete" :placeholder="authPresentation.label" required :aria-label="authPresentation.label"/><span aria-hidden="true"/></div>
        <div class="auth-input"><input v-model="password" type="password" :autocomplete="mode==='login'?'current-password':'new-password'" placeholder="密码" required aria-label="密码"/><span aria-hidden="true"/></div>
        <p v-if="errorMessage" class="workflow-error" role="alert">{{errorMessage}}</p>
        <button class="workflow-submit auth-submit" type="submit">{{loadingAction?'处理中…':mode==='login'?'登录':'创建账号'}}</button>
        <nav class="auth-switch" aria-label="账号操作"><button type="button" :disabled="loadingAction!==null" @click="selectMode(mode==='login'?'register':'login')">{{mode==='login'?'注册':'登录'}}</button></nav>
      </fieldset>
    </form>
    <router-link v-if="devToolsEnabled&&!embedded" to="/auth-debug" style="display:block;text-align:center;margin-top:20px;color:#859398;font-size:10px">账号诊断</router-link>
  </WorkflowSpace>
</template>
<style scoped>
.auth-optic{width:98px;height:98px;margin:0 auto 36px;filter:drop-shadow(0 12px 12px #5a738329)}
.auth-optic i{border-width:2px;background:linear-gradient(125deg,#ffffff35,transparent 48%,#8ba4b31a);box-shadow:inset 1px 1px 2px #fff,1px 1px 2px #71889580}
.auth-optic b{inset:32px;background:radial-gradient(circle at 28% 20%,#fff 3%,#e3e9eb 30%,#afbec5 72%,#7d919c);box-shadow:inset -1px -2px 3px #647f9133,0 0 20px #efd9ae55}
.nico-workflow .auth-input{position:relative;margin:0 0 22px}
.nico-workflow .auth-input input{height:56px;margin:0;padding:15px 14px;background:linear-gradient(110deg,#ffffff33,#ffffff0a);border:0;border-bottom:1px solid #a4b2ba70;border-radius:4px 4px 0 0;color:#354a55;box-shadow:none;transition:background .25s}
.auth-input input::placeholder{color:#7f8e96;font-size:13px;letter-spacing:.08em;opacity:1;transition:opacity .15s}
.auth-input input:focus::placeholder{opacity:0}
.nico-workflow .auth-input input:focus{background:#ffffff45;outline:none;box-shadow:none}
.auth-input>span{position:absolute;bottom:0;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,#b8a274 25%,#f3dfab 50%,#9dafba 80%,transparent);transform:scaleX(0);transition:transform .3s;pointer-events:none}
.auth-input:focus-within>span{transform:scaleX(1)}
.nico-workflow .auth-submit{height:48px;margin-top:14px;border-radius:9px;background:linear-gradient(125deg,#53636c,#36454f);font-size:13px;letter-spacing:.18em;box-shadow:inset 0 1px 0 #aab8c24d,0 8px 18px #35495917}
.auth-switch{display:flex;justify-content:center;margin-top:10px}.nico-workflow .auth-switch button{min-height:44px;padding:8px 24px;border:0;background:transparent;color:#78858c;font-size:12px;letter-spacing:.12em;box-shadow:none}.nico-workflow .auth-switch button:hover{color:#947e51}
@media(prefers-reduced-motion:reduce){.auth-input>span,.auth-input input{transition:none}}
</style>