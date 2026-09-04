<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
const props=withDefaults(defineProps<{value:number;prefix?:string;suffix?:string;decimals?:number;duration?:number}>(),{prefix:'',suffix:'',decimals:0,duration:360})
const shown=ref(props.value);let frame=0
function animate(next:number,previous:number){cancelAnimationFrame(frame);if(typeof window==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches){shown.value=next;return}const started=performance.now();const tick=(now:number)=>{const progress=Math.min((now-started)/props.duration,1);shown.value=previous+(next-previous)*(1-Math.pow(1-progress,3));if(progress<1)frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick)}
watch(()=>props.value,(next,previous)=>animate(next,previous));onBeforeUnmount(()=>cancelAnimationFrame(frame))
const label=computed(()=>`${props.prefix}${shown.value.toFixed(props.decimals)}${props.suffix}`)
</script>
<template><span class="animated-value">{{label}}</span></template>
<style scoped>.animated-value{font:inherit;font-variant-numeric:tabular-nums}</style>
