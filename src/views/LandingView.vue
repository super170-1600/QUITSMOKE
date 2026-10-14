<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import CoverAuthForm from '@/components/CoverAuthForm.vue'
import { useAuthStore } from '@/stores/auth'
import type { SculptureScene } from '@/visuals/sculptureScene'
import { coverLayout, COVER_ENTRY_DURATION_MS } from '@/visuals/coverLayout'

const router = useRouter()
const props=withDefaults(defineProps<{loginOnMount?:boolean}>(),{loginOnMount:false})
const authStore=useAuthStore()
const authOpen=ref(false),authBusy=ref(false),authDialog=ref<HTMLElement>()
let destination='/hub'
let openingAuth=false
let returnFocus:HTMLElement|null=null
async function openAuthentication(){
  if(entering.value||openingAuth||authOpen.value)return
  openingAuth=true
  try{if(!authStore.initialized)await authStore.initialize()}catch{/* Login reports actionable authentication errors. */}
  openingAuth=false
  if(disposed)return
  if(authStore.isAuthenticated){start();return}
  returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null
  authOpen.value=true;scene?.setHover(false);scene?.setPointer(0,0)
  await nextTick();authDialog.value?.querySelector<HTMLButtonElement>('.auth-close')?.focus()
}
function closeAuthentication(){
  if(authBusy.value)return
  authOpen.value=false
  if(props.loginOnMount)void router.replace('/')
  else void nextTick(()=>returnFocus?.focus())
}
function authKeyboard(event:KeyboardEvent){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeAuthentication();return}
  if(event.key!=='Tab')return
  const items=Array.from(authDialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')??[]).filter(item=>item.getClientRects().length)
  const first=items[0],last=items[items.length-1]
  if(!first){event.preventDefault();return}
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
}
function authenticated(target:string){destination=target;authOpen.value=false;start()}
const host = ref<HTMLElement>()
const ready = ref(false)
const fallback = ref(false)
const entering = ref(false)
const navigationError = ref(false)
const artwork = `${import.meta.env.BASE_URL}images/breath-portal-v3.webp`
const artStyle = ref({ left: '0%', top: '0%', width: '100%', height: '100%' })
const portalStyle = ref({ left: '21.4%', top: '43.9%', width: '22vw', height: '22vw' })
let scene: SculptureScene | undefined
let disposed = false
let enterTimer: ReturnType<typeof setTimeout> | undefined
let media: MediaQueryList | undefined
let layoutObserver: ResizeObserver | undefined

function updateLayout() {
  if (!host.value) return
  const width = host.value.clientWidth, height = host.value.clientHeight
  if (!width || !height) return
  const layout = coverLayout(width, height)
  artStyle.value = { left: `${layout.x * 100}%`, top: `${layout.y * 100}%`, width: `${layout.width * 100}%`, height: `${layout.height * 100}%` }
  const diameter = Math.max(120, Math.min(360, width * layout.width * .22))
  portalStyle.value = { left: `${(layout.x + layout.width * .214) * 100}%`, top: `${(layout.y + layout.height * .439) * 100}%`, width: `${diameter}px`, height: `${diameter}px` }
}

function motionChanged() { scene?.setReducedMotion(Boolean(media?.matches)) }
function pointerMove(event: PointerEvent) {
  if (!host.value || event.pointerType === 'touch'||authOpen.value) return
  const bounds = host.value.getBoundingClientRect()
  scene?.setPointer((event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1)
}
async function navigate() {
  try {
    const failure = await router.replace(destination)
    if (failure || router.currentRoute.value.path === '/'||router.currentRoute.value.path==='/login') throw new Error('Navigation did not complete')
  } catch {
    if (!disposed) { navigationError.value = true; entering.value = false; scene?.reset() }
  }
}
function start() {
  if (entering.value) return
  entering.value = true
  navigationError.value = false
  scene?.begin()
  enterTimer = setTimeout(() => void navigate(), media?.matches || !scene ? 160 : COVER_ENTRY_DURATION_MS)
}
onMounted(async () => {
  if(props.loginOnMount)void openAuthentication()
  updateLayout()
  layoutObserver = new ResizeObserver(updateLayout)
  if (host.value) layoutObserver.observe(host.value)
  media = matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', motionChanged)
  try {
    const { createSculptureScene } = await import('@/visuals/sculptureScene')
    if (disposed || !host.value) return
    const created = await createSculptureScene(host.value, {
      reducedMotion: media.matches,
      onFailure: () => { fallback.value = true; ready.value = false; scene?.dispose(); scene = undefined },
    })
    if (disposed || entering.value) { created.dispose(); return }
    scene = created
    scene.setReducedMotion(media.matches)
    ready.value = true
  } catch { if (!disposed) fallback.value = true }
})
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(enterTimer)
  media?.removeEventListener('change', motionChanged)
  scene?.dispose()
  layoutObserver?.disconnect()
})
</script>

<template>
  <main class="breath-cover" :style="{ '--entry-duration': `${COVER_ENTRY_DURATION_MS}ms` }" :class="{ 'is-ready': ready, 'is-entering': entering, 'is-fallback': fallback }" @pointermove="pointerMove" @pointerleave="scene?.setPointer(0, 0)">
    <img class="artwork-fallback" :style="artStyle" :src="artwork" alt="" fetchpriority="high" aria-hidden="true" />
    <div ref="host" class="scene-host" aria-hidden="true" />
    <header class="cover-header" :inert="authOpen">
      <router-link to="/" class="cover-wordmark" aria-label="NICØ 首页">NICØ</router-link>
      <button class="cover-login" :disabled="entering" @click="openAuthentication">登录</button>
    </header>
    <section class="cover-copy" aria-labelledby="cover-title" :inert="authOpen">
      <h1 id="cover-title">自由呼吸</h1>
      <button class="breath-entry" :style="portalStyle" :disabled="entering" aria-label="点击光环，进入戒烟旅程" @pointerenter="scene?.setHover(true)" @pointerleave="scene?.setHover(false)" @focus="scene?.setHover(true)" @blur="scene?.setHover(false)" @click="openAuthentication">
        <span class="portal-aura" aria-hidden="true" /><span class="portal-orbit orbit-one" aria-hidden="true" /><span class="portal-orbit orbit-two" aria-hidden="true" />
        <span class="portal-flare flare-one" aria-hidden="true" /><span class="portal-flare flare-two" aria-hidden="true" />
      </button>
    </section>
    <div class="entry-veil" aria-hidden="true" />
    <div v-if="authOpen" class="cover-auth-overlay" @click.self="closeAuthentication" @keydown="authKeyboard">
      <section ref="authDialog" class="cover-auth-dialog" role="dialog" aria-modal="true" aria-label="账户登录" :aria-busy="authBusy">
        <button class="auth-close" aria-label="关闭登录" :disabled="authBusy" @click="closeAuthentication">×</button>
        <CoverAuthForm embedded @authenticated="authenticated" @busy="authBusy=$event" />
      </section>
    </div>
    <p class="cover-error" role="status" aria-live="polite">{{ navigationError ? '暂时无法进入，请再试一次' : entering ? '正在进入戒烟计划' : '' }}</p>
  </main>
</template>

<style scoped>
.breath-cover{position:relative;isolation:isolate;height:100svh;min-height:560px;overflow:hidden;background:#f4f3f0;color:#252628;font-family:"Helvetica Neue",Inter,"PingFang SC","Microsoft YaHei",sans-serif}
.cover-auth-overlay{position:absolute;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;padding:24px;background:#29364124;backdrop-filter:blur(5px);overflow:auto}
.cover-auth-dialog{position:relative;width:min(400px,100%);margin:auto;padding:42px 38px 24px;border:1px solid #fff9;border-radius:22px;background:linear-gradient(145deg,#fffdf6ed,#edf2f3df 64%,#f9f7f1e6);box-shadow:0 28px 85px #25344235,inset 0 1px 0 #fff;animation:auth-arrive .45s ease both}
.auth-close{position:absolute;right:10px;top:8px;width:40px;height:40px;border:0;background:transparent;font-size:25px;font-weight:300;color:#69777f;cursor:pointer}.auth-close:disabled{opacity:.4}
.cover-auth-dialog :deep(.workflow-embedded){min-height:0;background:transparent}.cover-auth-dialog :deep(.workflow-content){width:100%;margin:0;padding:0}.cover-auth-dialog :deep(.workflow-tabs){margin-bottom:18px}.cover-auth-dialog :deep(.workflow-submit){margin-top:14px}
.cover-login{background:transparent;cursor:pointer}
@keyframes auth-arrive{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.cover-auth-dialog{animation:none}}
.artwork-fallback{position:absolute;z-index:0;object-fit:fill;max-width:none;pointer-events:none;transition:opacity .65s ease}.is-ready .artwork-fallback{opacity:0}
.scene-host{position:absolute;inset:0;z-index:1;opacity:0;transition:opacity .65s ease}.is-ready .scene-host{opacity:1}.scene-host :deep(canvas){display:block;width:100%;height:100%}
.cover-header{position:absolute;z-index:5;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:4.1vh 3.25vw;transition:opacity .4s ease}
.cover-wordmark{text-decoration:none;color:#252628;font-size:clamp(17px,1.48vw,24px);font-weight:500;letter-spacing:.27em;line-height:1.4}
.cover-login{display:grid;place-items:center;width:clamp(94px,7.35vw,120px);height:clamp(37px,4.5vh,46px);border:1px solid #55565b;border-radius:40px;color:#353639;text-decoration:none;font-size:clamp(13px,1.04vw,17px);letter-spacing:.06em;transition:background .3s,border-color .3s}.cover-login:hover{background:#ffffff80;border-color:#292a2d}
.cover-copy{position:absolute;inset:0;z-index:4;pointer-events:none}
.cover-copy h1{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.breath-entry{position:absolute;transform:translate(-50%,-50%);margin:0;padding:0;border:0;border-radius:50%;background:transparent;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent;isolation:isolate}
.breath-entry:not(:disabled):active{transform:translate(-50%,-50%) scale(.985)}.breath-entry:focus-visible{outline:1px solid #aa9874;outline-offset:12px}.breath-entry:disabled{cursor:wait}.is-entering .cover-header{opacity:0;pointer-events:none}.is-entering .breath-entry{pointer-events:none}
.portal-aura{position:absolute;inset:-24%;border-radius:50%;background:radial-gradient(circle,#fff7df50,transparent 61%);mix-blend-mode:screen;opacity:.25;transition:opacity .6s,transform .8s;animation:portal-breathe 7s ease-in-out infinite}.breath-entry:hover .portal-aura,.breath-entry:focus-visible .portal-aura{opacity:.8;transform:scale(1.1)}
.portal-orbit{position:absolute;inset:3%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 69%,#fff6e855 76%,#fffdf8b0 78%,transparent 84%);mask:radial-gradient(farthest-side,transparent calc(100% - 1px),#000 calc(100% - 1px));opacity:.38;animation:portal-orbit 18s linear infinite;transition:opacity .6s}.orbit-two{inset:-10%;opacity:.22;animation-duration:27s;animation-direction:reverse}.breath-entry:hover .portal-orbit,.breath-entry:focus-visible .portal-orbit{opacity:.95;animation-duration:9s}
.portal-flare{position:absolute;left:50%;top:50%;width:70%;height:1px;transform:translate(-50%,-50%) rotate(-8deg);background:linear-gradient(90deg,transparent,#fffef7,transparent);box-shadow:0 0 12px 2px #fff1cf55;opacity:.3;transition:opacity .6s,width .6s}.flare-two{width:36%;transform:translate(-50%,-50%) rotate(82deg);opacity:.18}.breath-entry:hover .portal-flare,.breath-entry:focus-visible .portal-flare{opacity:.85;width:100%}
.is-entering .portal-aura{animation:none;opacity:.8;transform:scale(1)}.is-entering .portal-orbit{opacity:.7;animation-duration:2.5s}.is-entering .portal-flare{opacity:.8;width:100%}
@keyframes portal-breathe{0%,100%{transform:scale(.98)}50%{transform:scale(1.04)}}@keyframes portal-orbit{to{transform:rotate(360deg)}}
.entry-veil{position:absolute;inset:0;z-index:6;background:#f4f3f0;opacity:0;pointer-events:none}.is-entering .entry-veil{animation:entry-clear var(--entry-duration) linear both}@keyframes entry-clear{0%,88%{opacity:0}100%{opacity:1}}.cover-error{position:absolute;z-index:7;bottom:38px;left:4.65%;font-size:12px;color:#615d58}.cover-error:empty{display:none}.is-entering .cover-error{clip-path:inset(50%);width:1px;height:1px;overflow:hidden}
@media(max-width:700px){.breath-cover{min-height:580px}.cover-header{padding:25px 24px}.cover-wordmark{font-size:14px;letter-spacing:.24em}.cover-login{width:83px;height:34px;font-size:12px}.artwork-fallback{mask-image:linear-gradient(to bottom,transparent,#000 7%,#000 88%,transparent)}.cover-error{left:27px;bottom:24px}}
@media(prefers-reduced-motion:reduce){.scene-host,.artwork-fallback,.cover-header,.breath-entry,.portal-aura,.portal-orbit,.portal-flare{transition:none;animation:none!important}.is-entering .entry-veil{animation:none;opacity:1}}
</style>
