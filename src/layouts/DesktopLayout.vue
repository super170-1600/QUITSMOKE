<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { useDisplayMode, type DisplayMode } from '@/composables/useDisplayMode'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()
const { displayMode, setDisplayMode } = useDisplayMode()

function changeMode(mode: DisplayMode) {
  setDisplayMode(mode)
  if (mode === 'mobile') void router.replace('/home')
}
</script>

<template>
  <div class="desktop-shell">
    <header class="desktop-header">
      <div class="brand"><span class="brand-icon"><van-icon name="like" /></span><div><b>NO SMOKING</b><small>{{ familyStore.currentFamily?.name ?? '家庭健康空间' }}</small></div></div>
      <div class="header-actions">
        <slot name="toolbar" />
        <label>显示模式</label>
        <div class="mode-switch" role="group" aria-label="显示模式">
          <button v-for="mode in (['auto','mobile','desktop'] as DisplayMode[])" :key="mode" :class="{active:displayMode===mode}" @click="changeMode(mode)">{{ mode==='auto'?'自动':mode==='mobile'?'手机':'桌面' }}</button>
        </div>
        <div class="account"><span>{{ familyStore.currentMember?.nickname ?? authStore.profile?.nickname ?? '家庭成员' }}</span><small>{{ authStore.user?.email ?? authStore.user?.username }}</small></div>
      </div>
    </header>
    <main class="desktop-content"><slot /></main>
  </div>
</template>

<style scoped>
.desktop-shell{min-height:100vh;background:#f4f7f4}.desktop-header{display:flex;height:76px;align-items:center;justify-content:space-between;padding:0 36px;border-bottom:1px solid rgba(31,72,51,.07);background:rgba(255,255,255,.88);backdrop-filter:blur(14px)}.brand,.header-actions,.account{display:flex;align-items:center}.brand{gap:12px}.brand-icon{display:grid;width:40px;height:40px;place-items:center;border-radius:14px;background:var(--green-700);color:#fff;font-size:20px}.brand div,.account{flex-direction:column;align-items:flex-start}.brand b{font-size:19px;color:var(--green-900)}.brand small,.account small{margin-top:2px;color:var(--text-muted);font-size:11px}.header-actions{gap:16px}.header-actions>label{color:var(--text-muted);font-size:12px}.mode-switch{display:flex;padding:3px;border-radius:12px;background:#edf1ee}.mode-switch button{border:0;border-radius:9px;padding:7px 11px;background:transparent;color:#6d7b74;font-size:12px}.mode-switch button.active{background:#fff;color:var(--green-700);box-shadow:0 2px 8px rgba(25,55,43,.08)}.account{min-width:150px;padding-left:16px;border-left:1px solid #e7ebe8}.account span{font-size:13px;font-weight:700}.desktop-content{max-width:1440px;margin:auto;padding:24px 32px 32px}@media(max-width:1100px){.desktop-header{padding:0 24px}.desktop-content{padding:20px 24px}.account small{display:none}.account{min-width:auto}}
</style>
