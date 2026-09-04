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

<template><router-view /></template>
