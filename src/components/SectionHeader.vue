<script setup lang="ts">
defineProps<{ title: string; caption?: string }>()
</script>

<template>
  <header class="section-header">
    <h2>{{ title }}</h2>
    <span v-if="caption">{{ caption }}</span>
    <slot />
  </header>
</template>

<style scoped>
.section-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:24px 2px 12px}.section-header h2{margin:0;font-size:19px;line-height:1.35;letter-spacing:-.02em}.section-header span{color:var(--text-muted);font-size:13px}
</style>
