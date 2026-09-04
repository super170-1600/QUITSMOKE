<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplayMode } from '@/composables/useDisplayMode'

const route = useRoute()
const router = useRouter()
const { isDesktop } = useDisplayMode()
const mobileMainRoutes = new Set(['/home', '/trend', '/family', '/profile'])

watch(isDesktop, (desktop) => {
  if (desktop && mobileMainRoutes.has(route.path)) void router.replace('/dashboard')
  if (!desktop && route.path === '/dashboard') void router.replace('/home')
})
</script>

<template><router-view v-slot="{Component,route}"><transition name="page-shift" mode="out-in"><component :is="Component" :key="route.path"/></transition></router-view></template>
<style>.page-shift-enter-active,.page-shift-leave-active{transition:opacity .24s ease,transform .24s ease}.page-shift-enter-from{opacity:0;transform:translateY(7px)}.page-shift-leave-to{opacity:0;transform:translateY(-4px)}@media(prefers-reduced-motion:reduce){.page-shift-enter-active,.page-shift-leave-active{transition:none}}</style>
