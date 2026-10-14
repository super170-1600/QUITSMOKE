<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hubJourney, hubDestinations } from '@/visuals/hubJourney'
import { hubModuleDestination } from '@/visuals/hubModuleRoutes'
import { useDisplayMode } from '@/composables/useDisplayMode'
import type { HubView } from '@/visuals/hubScene'
import type { HubStage, HubScheme } from '@/visuals/hubAssetScene'
import type { HubAssetScene } from '@/visuals/hubAssetScene'
import { hubModules, type HubFaceId } from '@/config/hubModules'
import type { HubInteractionState } from '@/visuals/hubInteraction'
import HubLegend from '@/components/HubLegend.vue'

const route = useRoute()
const router=useRouter()
const {isDesktop}=useDisplayMode()
defineOptions({name:'HubView'})
const opening=ref(false),closing=ref(false),navigationError=ref(false)
let operation=0,needsClosing=false
const host = ref<HTMLElement>()
const ready = ref(false), unavailable = ref(false)
let scene: HubAssetScene | undefined, disposed = false, media: MediaQueryList | undefined
const selected=ref<HubFaceId|null>(null),hovered=ref<HubFaceId|null>(null),interacted=ref(false),confirmed=ref(false),staticPreview=ref(false)
function interactionChanged(state:HubInteractionState){selected.value=state.face;hovered.value=state.hover;confirmed.value=state.activated;if(state.mode==='focused'||state.mode==='dragging')interacted.value=true;if(state.activated&&state.face)void openModule(state.face)}
async function openModule(face:HubFaceId){
  if(opening.value||closing.value||!scene||!hubDestinations[face])return
  const token=++operation;opening.value=true;navigationError.value=false
  hubJourney.origin=route.path;hubJourney.face=face;hubJourney.mode='opening'
  hubJourney.progress=0;hubJourney.transitioning=true
  const transfer=scene.transitionFace(face,true)
  if(token!==operation||disposed)return
  try{
    const destination=route.path==='/__hub-preview'?`/__hub-module/${face}`:hubModuleDestination(face,isDesktop.value)!
    needsClosing=true
    const failure=await router.push(destination)
    await transfer
    if(token!==operation||disposed)return
    if(failure||router.currentRoute.value.path===hubJourney.origin)throw new Error('Navigation failed')
    const current=router.currentRoute.value.path
    if(['/checkin','/trend','/home','/family','/profile','/dashboard','/achievements'].includes(current)||current.startsWith('/__hub-module/')){hubJourney.target=current;hubJourney.mode='module'}else hubJourney.mode='idle'
    opening.value=false
    hubJourney.transitioning=false
  }catch{if(token!==operation)return;needsClosing=false;scene.cancelOpening();opening.value=false;hubJourney.transitioning=false;hubJourney.mode='idle';navigationError.value=true}
}
function cancelOpening(){if(!opening.value)return;++operation;scene?.cancelOpening();opening.value=false;needsClosing=true;hubJourney.transitioning=false;void router.push(hubJourney.origin)}
function escape(event:KeyboardEvent){if(event.key==='Escape')cancelOpening()}
function chooseFace(face:HubFaceId){if(selected.value===face)void openModule(face);else scene?.focusFace(face)}
watch(()=>route.path,path=>{
  if(path===hubJourney.origin&&needsClosing){++operation;needsClosing=false;opening.value=false;scene?.cancelOpening();hubJourney.transitioning=false;hubJourney.mode='idle';requestAnimationFrame(()=>host.value?.querySelector<HTMLElement>('.hub-interaction')?.focus({preventScroll:true}))}
})
function motionChanged() { scene?.setReducedMotion(Boolean(media?.matches)) }
function sceneFailed(){++operation;opening.value=false;closing.value=false;hubJourney.transitioning=false;hubJourney.mode='idle';unavailable.value=true;ready.value=false;scene?.dispose();scene=undefined}
onMounted(async () => {
  window.addEventListener('keydown',escape)
  media = matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', motionChanged)
  try {
    const { createHubAssetScene, HUB_VIEWS, HUB_STAGES, HUB_SCHEMES } = await import('@/visuals/hubAssetScene')
    if (disposed || !host.value) return
    const requested = import.meta.env.DEV && typeof route.query.view === 'string' ? route.query.view : undefined
    const view = requested && HUB_VIEWS.includes(requested as HubView) ? requested as HubView : undefined
    staticPreview.value=Boolean(view)
    const stage = import.meta.env.DEV && HUB_STAGES.includes(route.query.stage as HubStage) ? route.query.stage as HubStage : undefined
    const scheme = import.meta.env.DEV && HUB_SCHEMES.includes(route.query.scheme as HubScheme) ? route.query.scheme as HubScheme : undefined
    const photons = import.meta.env.DEV ? route.query.photons !== '0' : true
    const density = import.meta.env.DEV && typeof route.query.density === 'string' ? Number(route.query.density) : undefined
    const animatePreview = import.meta.env.DEV && route.query.motion === '1'
    const created = await createHubAssetScene(host.value, { view, stage, scheme, photons, density, animatePreview, reducedMotion: media.matches, onInteraction:interactionChanged, onTransition:(progress,anchor)=>{hubJourney.progress=progress;hubJourney.anchor=anchor}, onFailure:sceneFailed })
    if (disposed) { created.dispose(); return }
    scene = created
    ready.value = true
  } catch (error) { if(import.meta.env.DEV) console.error('Hub scene initialization failed',error instanceof Error?error.stack:error);unavailable.value = true }
})
onBeforeUnmount(() => { disposed = true;++operation;window.removeEventListener('keydown',escape);media?.removeEventListener('change', motionChanged); scene?.dispose() })
</script>

<template>
  <main class="crystal-hub" :class="{ 'is-ready': ready,'is-opening':opening,'is-closing':closing }">
    <header class="hub-header">
      <router-link class="hub-brand" to="/" aria-label="NICØ 首页">NICØ</router-link>
      <router-link class="hub-account" to="/profile" aria-label="个人中心"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.25"/><path d="M5.5 20v-2.25a6.5 6.5 0 0 1 13 0V20"/></svg></router-link>
    </header>
    <div ref="host" class="hub-scene" aria-label="玻璃晶体导航" />
    <HubLegend v-if="ready&&!opening&&!closing&&['/hub','/__hub-preview'].includes(route.path)" />
    <p v-if="ready" class="hub-face-label" :class="{'is-confirmed':confirmed}" aria-live="polite">{{ hubModules.find(m=>m.id===(hovered||selected))?.label || '' }}</p>
    <nav v-if="ready" class="hub-keyboard" aria-label="选择晶体功能面"><template v-for="module in hubModules" :key="module.id"><button v-if="module.enabled" :disabled="opening||closing" :aria-pressed="selected===module.id" @focus="scene?.focusFace(module.id)" @click="chooseFace(module.id)">{{ module.label }}</button></template></nav>
    <p v-if="navigationError" class="hub-transition-error" role="status">暂时无法进入，请重试</p>
    <div v-if="!ready && !unavailable" class="hub-loading" role="status" aria-label="加载晶体"><span/></div>
    <section v-if="unavailable" class="hub-unavailable" role="status"><p>3D 暂不可用</p><router-link to="/home">返回首页</router-link></section>
  </main>
</template>

<style scoped>
.crystal-hub{position:relative;isolation:isolate;height:100svh;min-height:560px;overflow:hidden;color:#23282b;background:radial-gradient(ellipse at 29% 19%,#fffdf7 0%,transparent 51%),radial-gradient(ellipse at 80% 63%,#e9edef55,transparent 52%),#f5f5f1;font-family:"Helvetica Neue",Inter,"PingFang SC","Microsoft YaHei",sans-serif}
.hub-header{position:absolute;z-index:3;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;padding:36px 48px}.hub-brand{font-size:20px;letter-spacing:.27em;text-decoration:none;color:#25282a;font-weight:500}.hub-account{display:grid;place-items:center;width:42px;height:42px;border:1px solid #9ba4a638;border-radius:50%;color:#596469;background:#fff5;transition:background .2s}.hub-account:hover{background:#fff}.hub-account svg{width:21px;height:21px;stroke:currentColor;stroke-width:1.15;stroke-linecap:round}
.hub-scene{position:absolute;inset:0;opacity:0;transition:opacity .6s}.is-ready .hub-scene{opacity:1}.hub-scene :deep(canvas){display:block;width:100%;height:100%}.hub-loading{position:absolute;inset:0;display:grid;place-items:center}.hub-loading span{width:24px;height:24px;border:1px solid #c2b6a2;border-right-color:transparent;border-radius:50%;animation:loading 1.5s linear infinite}.hub-unavailable{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px;font-size:13px;color:#737b7e}.hub-unavailable a{color:#49565c;text-underline-offset:5px}.hub-unavailable p{margin:0}
@keyframes loading{to{transform:rotate(360deg)}}@media(max-width:700px){.crystal-hub{min-height:500px}.hub-header{padding:24px}.hub-brand{font-size:14px}.hub-account{width:36px;height:36px}}@media(prefers-reduced-motion:reduce){.hub-scene{transition:none}.hub-loading span{animation:none}}
</style>


<style scoped>
.hub-morph-panel{position:absolute;inset:12% 9%;z-index:2;pointer-events:none;border-radius:28px;background:linear-gradient(135deg,#fffdf7f5,#eff3f5f5);box-shadow:0 20px 90px #30445320,inset 0 0 0 1px #ffffffb0;opacity:0;transform:scale(.24);transition:transform .78s cubic-bezier(.2,.7,.2,1),opacity .78s}
.is-opening .hub-morph-panel{opacity:1;transform:scale(1);transition-duration:.54s;transition-delay:.24s}.is-closing .hub-morph-panel{animation:panel-close .78s both}.is-opening .hub-face-label,.is-closing .hub-face-label{opacity:0}.hub-transition-controls{position:absolute;right:36px;bottom:28px;z-index:5;display:flex;gap:8px}.hub-transition-controls button{border:1px solid #a9a49a70;background:#fff8;border-radius:24px;padding:9px 18px;color:#5e625f}.hub-transition-error{position:absolute;bottom:4%;width:100%;text-align:center;font-size:12px;color:#84694f}
@keyframes panel-close{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.24)}}
@media(prefers-reduced-motion:reduce){.hub-morph-panel{transition:none}.is-closing .hub-morph-panel{animation:none}}
</style>

<style scoped>
.hub-face-label{position:absolute;bottom:9%;left:50%;transform:translateX(-50%);margin:0;font-size:12px;letter-spacing:.14em;color:#687780;pointer-events:none}.hub-face-label.is-confirmed{color:#9c7950}
.hub-keyboard{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.hub-keyboard:focus-within{width:auto;height:auto;clip-path:none;bottom:24px;left:50%;transform:translateX(-50%);display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:90%;z-index:4}.hub-keyboard button{border:1px solid #adb9bf;background:#fffffff0;padding:10px 12px;border-radius:24px;font:inherit;font-size:12px;color:#36444b}.hub-keyboard button:focus-visible{outline:2px solid #b19469;outline-offset:3px}.hub-scene :deep(.hub-interaction:focus-visible){outline:none}.hub-scene :deep(.hub-interaction:focus-visible::after){content:'';position:absolute;bottom:12px;left:calc(50% - 10px);width:20px;height:2px;border-radius:2px;background:#b19469}
</style>
