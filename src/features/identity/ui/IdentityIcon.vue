<script setup lang="ts">
defineProps<{name:string}>()
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
 <template v-if="name==='identity'"><path d="M4 5h16v14H4z"/><circle cx="9" cy="10" r="2"/><path d="M6 16c0-4 6-4 6 0m3-7h3m-3 4h3"/></template>
 <template v-else-if="name==='leaf'"><path d="M5 18C3 8 10 4 19 5c1 9-5 15-14 13Zm0 0L15 9"/></template>
 <template v-else-if="name==='links'"><circle cx="8.5" cy="12" r="5.5"/><circle cx="15.5" cy="12" r="5.5"/></template>
 <template v-else-if="name==='shield'"><path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></template>
 <template v-else-if="name==='spark'"><path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z"/></template>
 <template v-else-if="name==='lock'"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></template>
 <template v-else><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 0v10m9-5-9 5-9-5m9 5v10"/></template>
</svg></template>
