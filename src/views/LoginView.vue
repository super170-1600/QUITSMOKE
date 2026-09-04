<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { useAuthStore } from '@/stores/auth'

const email = ref('')
const password = ref('')
const loadingAction = ref<'login' | 'register' | null>(null)
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作未完成，请稍后再试。'
}

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
    showFailToast(getErrorMessage(error))
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
      showSuccessToast('注册成功，请查收验证邮件后登录')
    }
  } catch (error: unknown) {
    showFailToast(getErrorMessage(error))
  } finally {
    loadingAction.value = null
  }
}
</script>

<template>
  <main class="login">
    <div class="brand">🚭</div>
    <h1>无烟之家</h1>
    <p class="muted">一家人一起，把每天的变化记录下来。</p>
    <van-cell-group inset>
      <van-field v-model="email" type="email" label="邮箱" placeholder="name@example.com" />
      <van-field v-model="password" type="password" label="密码" placeholder="请输入密码" @keyup.enter="login" />
    </van-cell-group>
    <van-button type="primary" round block size="large" :loading="loadingAction === 'login'" :disabled="loadingAction !== null" @click="login">登录</van-button>
    <van-button class="register" plain type="primary" round block size="large" :loading="loadingAction === 'register'" :disabled="loadingAction !== null" @click="register">注册</van-button>
  </main>
</template>

<style scoped>.login{max-width:480px;margin:0 auto;padding:72px 18px}.brand{font-size:54px}.login h1{font-size:34px;margin:10px 0}.login p{margin-bottom:28px}.van-cell-group{margin:0 0 18px}.register{margin-top:12px}</style>
