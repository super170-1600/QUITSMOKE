<script setup lang="ts">
import {ref,onMounted} from 'vue'
import {hubModules} from '@/config/hubModules'
const expanded=ref(true)
onMounted(()=>{expanded.value=matchMedia('(min-width:700px)').matches})
</script>
<template>
 <aside class="hub-legend" aria-label="晶体功能图例">
  <button class="legend-toggle" :aria-expanded="expanded" aria-controls="hub-legend-list" :aria-label="expanded?'收起模块说明':'展开模块说明'" @click="expanded=!expanded"><span aria-hidden="true">{{expanded?'−':'＋'}}</span></button>
  <ul v-if="expanded" id="hub-legend-list">
   <li v-for="module in hubModules" :key="module.id">
    <svg viewBox="0 0 32 32" aria-hidden="true" fill="none">
     <defs><linearGradient :id="`legend-metal-${module.id}`" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7fbfd"/><stop offset=".5" stop-color="#90a7b3"/><stop offset="1" stop-color="#c9ae7c"/></linearGradient></defs>
     <g :stroke="`url(#legend-metal-${module.id})`" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <template v-if="module.id==='checkin'"><circle cx="16" cy="16" r="11"/><path d="m10 16 4 4 8-9"/></template>
      <template v-else-if="module.id==='progress'"><path d="M4 27h24"/><path d="M7 24v-6h3v6zm6 0V13h3v11zm6 0V8h3v16zm6 0V4h3v20z"/></template>
      <template v-else-if="module.id==='achievements'"><circle cx="16" cy="16" r="12"/><path d="m16 7 2.6 5.6 6.2.8-4.5 4.4 1 6.2-5.3-2.9-5.3 2.9 1-6.2-4.5-4.4 6.2-.8z"/></template>
      <template v-else-if="module.id==='support'"><path d="m16 7-9 16h18z"/><circle cx="16" cy="7" r="3" fill="none"/><circle cx="7" cy="23" r="3" fill="none"/><circle cx="25" cy="23" r="3" fill="none"/></template>
      <template v-else-if="module.id==='profile'"><circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="8"/><circle cx="16" cy="16" r="4"/><rect x="14" y="13" width="4" height="6" fill="none"/></template>
      <rect v-else x="6" y="6" width="20" height="20" rx="3" stroke-dasharray="2 4" opacity=".7"/>
     </g>
    </svg>
    <span>{{module.enabled?module.label:'预留面'}}</span>
   </li>
  </ul>
 </aside>
</template>
<style scoped>
.hub-legend{position:absolute;z-index:4;right:32px;bottom:28px;width:120px;padding:0;border:0;background:transparent;box-shadow:none;color:#34434c;font:11px Inter,'Microsoft YaHei',sans-serif}.legend-toggle{display:flex;align-items:center;justify-content:flex-end;width:100%;min-height:24px;border:0;background:transparent;color:#45525c;font:inherit;letter-spacing:.08em;padding:0;cursor:pointer}.legend-toggle span{font-size:15px;color:#7c898f}.legend-toggle:focus-visible{outline:2px solid #b9a16f;outline-offset:3px}.hub-legend ul{list-style:none;margin:5px 0 0;padding:0}.hub-legend li{display:flex;align-items:center;gap:12px;min-height:26px}.hub-legend svg{width:23px;height:23px;flex:none}.hub-legend li:last-child{color:#62717a}@media(max-width:700px){.hub-legend{right:18px;bottom:18px;width:120px;padding:0}.hub-legend:has(.legend-toggle[aria-expanded=false]){width:36px}.legend-toggle{min-height:36px}.hub-legend li{min-height:26px}}
</style>
