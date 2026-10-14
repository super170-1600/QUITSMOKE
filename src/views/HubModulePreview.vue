<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { hubModules } from '@/config/hubModules'
import { isJourneyModule } from '@/visuals/hubJourney'
import HubBusinessModule from '@/components/HubBusinessModule.vue'
const route=useRoute()
const module=computed(()=>hubModules.find(m=>m.id===route.params.face&&m.enabled))
</script>
<template><main class="module-preview"><router-link v-if="!isJourneyModule(route.path)" to="/__hub-preview">返回晶体预览</router-link><HubBusinessModule v-if="module" :face="module.id" preview/></main></template>
<style scoped>.module-preview{max-width:960px;min-height:60vh;margin:auto;padding:48px 28px;color:#35424a}.module-preview h1{font-size:24px;font-weight:500}.module-preview p{font-size:13px;color:#78868d}.preview-surface{display:grid;gap:20px;margin-top:40px}.preview-surface span{height:78px;border-radius:16px;background:linear-gradient(110deg,#e4e9e970,#fff9);border:1px solid #fff}.preview-surface span:last-child{height:160px}</style>
<style scoped>.module-preview:has(.identity-space),.module-preview:has(.constellation-study),.module-preview:has(.orbital-console),.module-preview:has(.pulse-demo-shell){max-width:none;padding:0;width:100%}.module-preview>:deep(.optical-module){padding:0}.module-preview :deep(.constellation-stage){min-height:440px;height:65svh}</style>
