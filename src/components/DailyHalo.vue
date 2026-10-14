<script setup lang="ts">
import {computed,useId} from 'vue'
import type {CheckinModel} from '@/types/domain'
import {haloVisual,haloAmount,haloMood} from '@/visuals/haloVisual'
const props=withDefaults(defineProps<{date:string;record?:CheckinModel|null;selected?:boolean;isToday?:boolean;reducedMotion?:boolean;size?:number;mood?:CheckinModel['mood']}>(),{size:36})
const amount=computed(()=>haloAmount(props.record?.cigarettes)),color=computed(()=>haloMood(props.mood??props.record?.mood).color)
const state=computed(()=>haloVisual(props.date,props.record,props.isToday)),id=useId()
</script>
<template><svg class="daily-halo" :class="{'halo-selected':selected,'halo-static':reducedMotion,'halo-recorded':state.status==='recorded'}" :width="size" :height="size" viewBox="0 0 64 64" role="img" :aria-label="state.label">
 <defs><radialGradient :id="id"><stop offset="0" stop-color="#fff"/><stop offset=".5" :stop-color="color"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></radialGradient></defs>
 <circle v-if="selected" cx="32" cy="32" r="30" fill="none" stroke="#b19469" stroke-width="1"/>
 <template v-if="state.status==='recorded'"><circle cx="32" cy="32" r="26" fill="none" stroke="#dae5ea" stroke-width="2"/><circle cx="32" cy="32" r="26" fill="none" stroke="#7d9eaf" stroke-width="1.5" :stroke-dasharray="state.complete?undefined:`${163.36/amount.fragments*amount.coverage} ${163.36/amount.fragments*(1-amount.coverage)}`"/><circle cx="32" cy="32" r="20" fill="none" :stroke="color" stroke-width="1.5"/><g v-for="tick in state.texture*4" :key="tick" :transform="`rotate(${tick*360/(state.texture*4)} 32 32)`"><path d="M32 12v3" stroke="#869faa" stroke-width="1"/></g><circle cx="32" cy="32" r="15" :fill="`url(#${id})`"/><circle cx="32" cy="32" r="8" :fill="color" opacity=".55"/><path d="M17 18q10-9 23-2" fill="none" stroke="#fff" stroke-width="1.5"/></template>
 <template v-else><circle v-if="mood" cx="32" cy="32" r="10" :fill="color"/><circle cx="32" cy="32" r="24" fill="none" stroke="#a7bdc7" stroke-width="1" :stroke-dasharray="state.status==='today'?'12 5':'2 6'"/><path v-if="state.status==='today'" d="m30 5 4 3-4 3" fill="none" stroke="#9f8259"/></template>
</svg></template>
<style scoped>.daily-halo{display:block;overflow:visible;flex:none}.halo-selected{filter:drop-shadow(0 0 5px #e0cc9c66);transform:scale(1.06)}.halo-recorded:not(.halo-static){animation:halo-shimmer 6s ease-in-out infinite}@keyframes halo-shimmer{50%{opacity:.85}}@media(prefers-reduced-motion:reduce){.halo-recorded{animation:none!important}}</style>
