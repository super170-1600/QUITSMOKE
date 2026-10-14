<script setup lang="ts">
import { computed } from 'vue'
import type { ConsoleModule } from './consoleTypes'
const props = defineProps<{ module: ConsoleModule }>()
const columnHeight=(value:number)=>value/Math.max(1,...props.module.values.map(value=>Math.abs(value??0)))*43
const spectrum = computed(() => {
  let connected = false
  return props.module.values.map((value, i) => {
    if (value === null) { connected = false; return '' }
    const command = connected ? 'L' : 'M'; connected = true
    return `${command}${12 + i * 216 / Math.max(1, props.module.values.length - 1)},${62 - value * 4.7}`
  }).join(' ')
})
</script>
<template>
  <svg viewBox="0 0 240 76" aria-hidden="true" :style="{color:module.accent}">
    <defs><linearGradient :id="`optical-${module.id}`" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fff"/><stop offset=".3" :stop-color="module.accent"/><stop offset=".55" stop-color="#eaf8fd"/><stop offset=".75" :stop-color="module.accent"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>
    <g v-if="module.shape==='timeline'">
      <path d="M12 55 Q120 67 228 47" fill="none" stroke="currentColor" stroke-width=".8" opacity=".3"/>
      <g v-for="(value,i) in module.values" :key="i" :transform="`translate(${24+i*32},${40-i*.7})`">
        <ellipse rx="9" ry="15" :stroke="`url(#optical-${module.id})`" stroke-width="4" fill="none"/>
        <ellipse rx="5" ry="10" stroke="currentColor" stroke-width="1" fill="none"/>
        <circle v-if="value===0" r="2" fill="currentColor"/>
      </g>
    </g>
    <g v-else-if="module.shape==='spectrum'">
      <path d="M12 62H228" stroke="currentColor" stroke-width=".6" opacity=".3"/>
      <path :d="spectrum" stroke="currentColor" stroke-width="8" opacity=".11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path :d="spectrum" :stroke="`url(#optical-${module.id})`" stroke-width="3" fill="none" stroke-linejoin="round"/>
      <path :d="spectrum" stroke="currentColor" stroke-width=".8" fill="none"/>
    </g>
    <g v-else-if="module.shape==='columns'">
      <path d="M18 62H224" stroke="currentColor" stroke-width=".6" opacity=".3"/>
      <g v-for="(value,i) in module.values" :key="i">
        <path v-if="value!==null" :d="`M${25+i*29} 62v${-columnHeight(value)}l12 -5 8 4v${columnHeight(value)}l-8 5Z`" :fill="`url(#optical-${module.id})`" fill-opacity=".45" stroke="currentColor" stroke-width=".7"/>
      </g>
    </g>
    <g v-else>
      <path d="M30 59L86 46L143 32L207 18" stroke="currentColor" stroke-width=".7" stroke-dasharray="3 6" opacity=".4"/>
      <path v-for="(_,i) in module.values" :key="i" :d="`M${30+i*57} ${49-i*12}l9 -13 9 13 -9 14Z M${30+i*57} ${49-i*12}h18 M${39+i*57} ${36-i*12}v27`" fill="#fff" fill-opacity=".4" stroke="currentColor" stroke-width=".9" opacity=".65"/>
    </g>
  </svg>
</template>
<style scoped>svg{display:block;width:100%;height:68px;overflow:visible}</style>
