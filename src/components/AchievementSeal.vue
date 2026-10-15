<script setup lang="ts">
import {computed} from 'vue'
const props=defineProps<{day:number;earned:boolean;hero?:boolean}>()
const ticks=computed(()=>Array.from({length:props.day>=14?24:12},(_,i)=>i*360/(props.day>=14?24:12)))
const star=computed(()=>{
 const points=props.day>=30?8:props.day>=7?6:4
 return Array.from({length:points*2},(_,i)=>{const angle=i*Math.PI/points-Math.PI/2,r=i%2?12:30;return `${80+Math.cos(angle)*r},${80+Math.sin(angle)*r}`}).join(' ')
})
</script>
<template><div class="optical-seal" :class="{'is-earned':earned,'is-hero':hero}" aria-hidden="true"><span class="seal-aura"/><svg viewBox="0 0 160 160" fill="none"><circle class="seal-surface" cx="80" cy="80" r="66"/><circle class="seal-rim" cx="80" cy="80" r="65"/><circle class="seal-inner" cx="80" cy="80" r="55"/><path class="seal-reflection" d="M22 62A61 61 0 0 1 121 34M38 128A61 61 0 0 0 139 94"/><g class="seal-ticks"><path v-for="angle in ticks" :key="angle" d="M80 25V30" :transform="`rotate(${angle} 80 80)`"/></g><circle class="seal-core" cx="80" cy="80" r="40"/><polygon class="seal-symbol" :points="star"/><circle class="seal-pin" cx="80" cy="80" r="5"/></svg><span class="seal-plinth"/></div></template>
<style scoped>
.optical-seal{position:relative;width:124px;height:142px;margin:auto;--seal-metal:#8b9da7;--seal-shadow:#69839325;--seal-face:#e8eff040;--seal-center:#c0d2dd25;--seal-symbol:#e9f0f2;isolation:isolate}
.optical-seal.is-earned{--seal-metal:#a48042;--seal-shadow:#a2874c2a;--seal-face:#e7d7b432;--seal-center:#e6c88d40;--seal-symbol:#f5e4be}
svg{position:relative;width:100%;height:100%;filter:drop-shadow(0 12px 9px var(--seal-shadow));overflow:visible}
.seal-surface{fill:var(--seal-face);stroke:#ffffff;stroke-width:2.5}
.seal-rim{stroke:var(--seal-metal);stroke-width:1.1}.seal-inner{stroke:var(--seal-metal);stroke-width:.5;opacity:.55}
.seal-reflection{stroke:#fff;stroke-width:3;stroke-linecap:round}.seal-ticks{stroke:var(--seal-metal);stroke-width:.8;opacity:.75}
.seal-core{fill:var(--seal-center);stroke:#fff;stroke-width:.7}.seal-symbol{fill:var(--seal-symbol);stroke:var(--seal-metal);stroke-width:1.3;stroke-linejoin:round}.seal-pin{fill:#fffcf5;stroke:var(--seal-metal);stroke-width:.65}
.seal-aura{position:absolute;inset:10%;border-radius:50%;background:radial-gradient(circle,var(--seal-center),transparent 70%);z-index:-1}
.seal-plinth{position:absolute;bottom:0;left:20%;right:20%;height:7px;border-radius:50%;background:radial-gradient(ellipse,var(--seal-shadow),transparent 72%)}
.is-hero{width:220px;height:238px}.is-hero .seal-rim{stroke-width:.85}.is-hero .seal-aura{inset:-14%;background:radial-gradient(circle,var(--seal-center),transparent 65%)}
@media(max-width:650px){.optical-seal{width:108px;height:120px}.is-hero{width:148px;height:165px}}
</style>
