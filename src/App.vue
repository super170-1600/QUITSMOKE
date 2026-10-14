<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplayMode } from '@/composables/useDisplayMode'
import { hubJourney, hubDestinations, isJourneyModule } from '@/visuals/hubJourney'
import { hubModules } from '@/config/hubModules'
import { hubModuleDestination, resolveHubModule } from '@/visuals/hubModuleRoutes'
import FamilyJoinHint from '@/components/FamilyJoinHint.vue'
import '@/styles/readability.css'
import {useAuthStore} from '@/stores/auth'
import {useFamilyStore} from '@/stores/family'

const route = useRoute()
const router = useRouter()
const auth=useAuthStore(),family=useFamilyStore()
const { isDesktop,displayMode } = useDisplayMode()

const spatialModule=computed(()=>isJourneyModule(route.path))
const HubBackground=defineAsyncComponent(()=>import('@/views/HubView.vue'))
const HubBusiness=defineAsyncComponent(()=>import('@/components/HubBusinessModule.vue'))
const businessFace=computed(()=>resolveHubModule(route.path,route.query.module))
const isHub=computed(()=>['/hub','/__hub-preview'].includes(route.path))
const sharedCrystal=computed(()=>isHub.value||(hubJourney.mode!=='idle'&&hubJourney.face!==null))
const floatingPanel=computed(()=>sharedCrystal.value&&(!isHub.value||hubJourney.mode==='opening'))
const moduleLabel=computed(()=>hubModules.find(m=>m.id===hubJourney.face)?.label)
const morphStyle=computed(()=>{
  if(!floatingPanel.value)return undefined
  const p=Math.min(1,Math.max(0,(hubJourney.progress-.4)/.6)),t=p*p*(3-2*p),a=hubJourney.anchor
  const sx=a.width/.92+(1-a.width/.92)*t,sy=a.height/.84+(1-a.height/.84)*t
  return {opacity:t,transform:`perspective(1100px) translate3d(${(a.x-.5)*100*(1-t)}vw,${(a.y-.5)*100*(1-t)}vh,0) rotateY(${14*(1-t)}deg) rotateX(${-9*(1-t)}deg) scale(${sx},${sy})`}
})
function returnToCrystal(){void router.push(hubJourney.origin)}
function escape(event:KeyboardEvent){if(event.key==='Escape'&&!event.defaultPrevented&&spatialModule.value){event.preventDefault();returnToCrystal()}}
onMounted(()=>window.addEventListener('keydown',escape))
onBeforeUnmount(()=>window.removeEventListener('keydown',escape))
watch(()=>route.fullPath,()=>{const path=route.path;if(hubJourney.mode==='module'&&path!==hubJourney.origin){if(Object.values(hubDestinations).includes(path)||path==='/dashboard'||(import.meta.env.DEV&&/^\/__hub-module\/(checkin|progress|achievements|support|profile)$/.test(path))||(path==='/setup'&&route.query.edit==='1')){hubJourney.target=path;if(businessFace.value)hubJourney.face=businessFace.value}else hubJourney.mode='idle'}})

</script>

<template>
  <div class="nico-app-layout" :class="{'shared-crystal':sharedCrystal,'layout-mobile':displayMode==='mobile','layout-desktop':displayMode==='desktop'}">
    <FamilyJoinHint v-if="route.path==='/hub'&&!floatingPanel&&auth.isAuthenticated&&!family.hasFamily" />
    <div v-if="sharedCrystal" class="crystal-background" :inert="floatingPanel||hubJourney.mode==='opening'"><HubBackground /></div>
    <div v-if="!isHub||floatingPanel" :class="{'floating-module':floatingPanel,'is-spatial-morph':floatingPanel}" :style="morphStyle" :inert="floatingPanel&&hubJourney.transitioning" :role="floatingPanel?'dialog':undefined" :aria-modal="floatingPanel?true:undefined" :aria-label="floatingPanel?moduleLabel:undefined" :aria-busy="floatingPanel&&hubJourney.mode==='opening'">
      <div v-if="floatingPanel&&hubJourney.progress>.4" class="panel-entry-light" aria-hidden="true" />
      <header v-if="floatingPanel" class="spatial-return"><button @click="returnToCrystal" aria-label="返回晶体导航">← <span>返回晶体</span></button><span>{{moduleLabel}}</span></header>
      <div :class="{'floating-content':floatingPanel}"><section v-if="isHub&&floatingPanel" class="panel-preparing" role="status"><p>正在准备内容</p><div aria-hidden="true"><span/><span/><span/></div></section><HubBusiness v-else-if="businessFace" :face="businessFace" :key="businessFace"/><router-view v-else v-slot="{Component,route}"><section v-if="floatingPanel" class="optical-module"><component :is="Component" :key="route.path"/></section><component v-else :is="Component" :key="route.path"/></router-view></div>
    </div>
  </div>
</template>
<style>
/* One simultaneous entrance; the crystal and its background never move. */
.shared-crystal .floating-module{animation:optical-panel-appear 1s cubic-bezier(.22,.56,.2,1) both}
.shared-crystal .floating-module.is-spatial-morph{animation:none;will-change:transform,opacity}
.panel-preparing{padding:40px clamp(24px,7vw,100px);color:#75838b;font-size:12px}.panel-preparing>div{display:grid;gap:20px;margin-top:32px}.panel-preparing span{height:84px;border-radius:16px;background:linear-gradient(110deg,#dee7e850,#ffffff90);border:1px solid #ffffff80}.panel-preparing span:last-child{height:160px}
.panel-entry-light{position:absolute;inset:-1px;z-index:10;border-radius:inherit;overflow:hidden;pointer-events:none}
.panel-entry-light::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;background:conic-gradient(from 220deg,#e5f3ff20,#f8deb5e0 16%,#fff9df 26%,#ffffff30 42%,#d2edfff0 67%,#ffffff30 82%,#e5f3ff20);mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude;animation:optical-rim 1.1s ease-out both}
.panel-entry-light::after{content:'';position:absolute;inset:-30% -15%;background:linear-gradient(110deg,transparent 38%,#fff9e510 44%,#fffaf052 49%,#e4f4ff20 54%,transparent 61%);animation:optical-sheen 1.1s cubic-bezier(.2,.6,.3,1) both}
@keyframes optical-panel-appear{from{opacity:0;transform:translateY(9px) scale(.986);box-shadow:0 12px 45px #253d4918}to{opacity:1;transform:translateY(0) scale(1);box-shadow:0 28px 90px #253d4930,0 0 26px #fff1d426}}
@keyframes optical-rim{0%{opacity:0}28%{opacity:1}100%{opacity:.22}}
@keyframes optical-sheen{0%{opacity:0;transform:translateX(-55%)}22%{opacity:.65}100%{opacity:0;transform:translateX(55%)}}
@media(prefers-reduced-motion:reduce){.shared-crystal .floating-module{animation:none}.panel-entry-light{display:none}}
</style>
<style>.shared-crystal{height:100svh;overflow:hidden}.crystal-background{position:fixed;inset:0}.floating-module{position:fixed;z-index:5;inset:8vh max(4vw,calc((100vw - 1400px)/2));display:flex;flex-direction:column;max-height:84svh;background:linear-gradient(135deg,#fffdf8f0,#edf2f4f2);border:1px solid #ffffffb0;border-radius:26px;box-shadow:0 28px 90px #253d4930;backdrop-filter:blur(12px);animation:panel-appear .18s ease-out}.floating-module .spatial-return{box-sizing:border-box;flex:none;width:100%;height:60px;padding:0 24px;border-bottom:1px solid #9baeb125}.floating-content{min-height:0;overflow:auto;overscroll-behavior:contain;flex:1;border-radius:0 0 26px 26px}.floating-content>.module-preview{margin:0 auto;min-height:0}.floating-content>.desktop-shell{min-height:0}@keyframes panel-appear{from{opacity:0}to{opacity:1}}@media(max-width:700px){.floating-module{inset:9vh 12px 6vh;max-height:85svh;border-radius:20px}.floating-module .spatial-return{padding:0 16px}.floating-content{border-radius:0 0 20px 20px}}@media(prefers-reduced-motion:reduce){.floating-module{animation:none}}</style>
<style>.page-shift-enter-active,.page-shift-leave-active{transition:opacity .24s ease,transform .24s ease}.page-shift-enter-from{opacity:0;transform:translateY(7px)}.page-shift-leave-to{opacity:0;transform:translateY(-4px)}@media(prefers-reduced-motion:reduce){.page-shift-enter-active,.page-shift-leave-active{transition:none}}</style>
<style>.spatial-module{min-height:100svh;background:linear-gradient(135deg,#faf8f2,#e8eef1);padding:0 4vw 4vh}.spatial-return{height:64px;display:flex;align-items:center;justify-content:space-between;max-width:1440px;margin:auto;font-size:12px;letter-spacing:.08em;color:#69767d}.spatial-return button{font:inherit;border:1px solid #9aa7ad60;border-radius:24px;background:#ffffff80;color:#46545c;padding:9px 16px;cursor:pointer}.spatial-return button:focus-visible{outline:2px solid #aa8d60;outline-offset:3px}.spatial-module>.desktop-shell,.spatial-module>.shell,.spatial-module>.module-preview{border-radius:24px;overflow:hidden;box-shadow:0 24px 70px #2c414314;border:1px solid #ffffffa0}.spatial-handoff-enter-active,.spatial-handoff-leave-active{transition:opacity .16s}.spatial-handoff-enter-from,.spatial-handoff-leave-to{opacity:0}@media(max-width:700px){.spatial-module{padding:0 12px 18px}.spatial-return{height:56px}.spatial-module>.shell{margin-bottom:60px}}@media(prefers-reduced-motion:reduce){.spatial-handoff-enter-active,.spatial-handoff-leave-active{transition:none}}</style>

<style>
.nico-app-layout.layout-mobile{max-width:480px;margin:auto}.layout-mobile .identity-settings{grid-template-columns:1fr}.layout-desktop .identity-settings{grid-template-columns:repeat(2,minmax(0,1fr))}.layout-mobile .crystal-background{left:50%;right:auto;width:min(480px,100%);transform:translateX(-50%)}.layout-mobile .floating-module{left:max(12px,calc((100vw - 456px)/2));right:auto;width:min(456px,calc(100% - 24px))}
</style>
