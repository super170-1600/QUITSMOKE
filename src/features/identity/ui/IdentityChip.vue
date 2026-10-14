<script setup lang="ts">
import {ref,computed,onMounted,onBeforeUnmount} from 'vue'
import type {IdentityModel} from '../types'
const props=defineProps<{identity:IdentityModel;static?:boolean;compact?:boolean}>()
const emit=defineEmits<{open:[]}>()
const x=ref(0),y=ref(0),reduced=ref(false)
let media:MediaQueryList|undefined
const role=computed(()=>props.identity.role==='quitter'?'戒烟者':props.identity.role==='supporter'?'支持者':'未设置身份')
const stationary=computed(()=>props.static||reduced.value)
const style=computed(()=>({'--rx':`${stationary.value?0:x.value}deg`,'--ry':`${stationary.value?0:y.value}deg`,'--light-x':`${50+y.value*5}%`,'--light-y':`${40-x.value*5}%`}))
function reset(){x.value=y.value=0}
function move(event:PointerEvent){if(stationary.value||event.pointerType!=='mouse')return;const rect=(event.currentTarget as HTMLElement).getBoundingClientRect();x.value=Math.max(-5,Math.min(5,-((event.clientY-rect.top)/rect.height-.5)*8));y.value=Math.max(-5,Math.min(5,((event.clientX-rect.left)/rect.width-.5)*8))}
function motion(){reduced.value=Boolean(media?.matches);reset()}
onMounted(()=>{media=matchMedia('(prefers-reduced-motion: reduce)');motion();media.addEventListener('change',motion)})
onBeforeUnmount(()=>media?.removeEventListener('change',motion))
</script>
<template>
 <div class="chip-space" :class="{'is-static':stationary,'is-compact':compact}" :style="style">
  <div class="chip-shadow" aria-hidden="true"/>
  <button class="identity-chip" aria-label="查看身份晶片" @pointermove="move" @pointerleave="reset" @blur="reset" @click="emit('open')">
   <span class="chip-thickness" aria-hidden="true"/>
   <span class="chip-front">
    <span class="optical-grain" aria-hidden="true"/><span class="edge-refraction" aria-hidden="true"/>
    <span class="chip-top"><span class="chip-wordmark">NICØ</span><span class="account-mark"><i/>{{identity.accountLabel}}</span></span>
    <span class="identity-symbol" aria-hidden="true"><i class="symbol-ring first"/><i class="symbol-ring second"/><i class="symbol-core"/><i class="symbol-axis"/></span>
    <span class="chip-name">{{identity.nickname}}</span>
    <span class="chip-bottom"><span class="role-mark"><i/>{{role}}</span><time v-if="identity.joinedAt">{{identity.joinedAt}}</time><span v-else class="chip-etch" aria-hidden="true"><i/><i/><i/><i/><i/></span></span>
   </span>
  </button>
 </div>
</template>
<style scoped>
.chip-space{position:relative;width:min(510px,100%);height:336px;perspective:1100px;transition:height .55s ease,transform .55s ease;margin:auto;--rx:0deg;--ry:0deg}.identity-chip{display:block;position:absolute;left:0;right:0;top:20px;width:100%;height:280px;padding:0;background:none;border:0;color:#3a4346;cursor:pointer;transform-style:preserve-3d;transform:rotateX(calc(3deg + var(--rx))) rotateY(calc(-4deg + var(--ry)));transition:transform .3s ease;animation:identity-float 7s ease-in-out infinite;font-family:inherit;text-align:left;-webkit-tap-highlight-color:transparent}.chip-front,.chip-thickness{position:absolute;inset:0;border-radius:17px;clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px)}
.chip-thickness{transform:translateZ(-8px) translateY(4px);background:linear-gradient(135deg,#fcffff,#95a2ac 28%,#dfdfd7 48%,#83929d 65%,#fff4d3);box-shadow:0 0 0 1px #8a959b}.chip-front{overflow:hidden;border:1px solid #fffef8;background:radial-gradient(ellipse at var(--light-x) var(--light-y),#ffffffb8,transparent 60%),linear-gradient(118deg,#ffffff8a,#e2e9ed4d 38%,#ffffff9e 52%,#f5e4bc28 80%,#f6f6f36e);box-shadow:inset 0 0 0 1px #8d9da33b,inset 0 2px 4px #fff,inset -2px -3px 7px #8698a943;backdrop-filter:blur(3px);transform:translateZ(1px)}
.optical-grain{position:absolute;inset:0;opacity:.4;background:repeating-linear-gradient(118deg,transparent 0,transparent 4px,#bcc9d314 4px,#bcc9d314 5px);mask-image:linear-gradient(110deg,#000,transparent 70%)}.edge-refraction{position:absolute;inset:3px;border:1px solid #fffefa91;border-radius:13px;box-shadow:inset 0 -2px 2px #c5d3dc88;pointer-events:none}.edge-refraction:after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 20%,#fffefaab 35%,#d6ecfa3d 37%,transparent 43%,transparent 76%,#ddbc7640 92%);opacity:.75}
.chip-top{position:absolute;left:30px;right:30px;top:24px;display:flex;justify-content:space-between;align-items:center}.chip-wordmark{font-size:18px;letter-spacing:.16em;font-weight:400}.account-mark{display:flex;align-items:center;gap:7px;font-size:10px;letter-spacing:.1em;color:#768184}.account-mark i{width:4px;height:4px;border-radius:50%;background:#b3955e}.chip-name{position:absolute;left:32px;bottom:70px;font-size:34px;letter-spacing:.09em;font-weight:400;text-shadow:0 1px 0 #fff}.chip-bottom{position:absolute;left:32px;right:32px;bottom:30px;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#667278;letter-spacing:.12em}.role-mark{display:flex;gap:10px;align-items:center}.role-mark>i{width:5px;height:5px;transform:rotate(45deg);border:1px solid #a6a08f}.chip-etch{display:flex;gap:4px;align-items:center;opacity:.5}.chip-etch i{height:12px;width:1px;background:#7b898f}.chip-etch i:nth-child(2n){height:7px}.identity-symbol{position:absolute;right:56px;top:86px;width:110px;height:110px;filter:drop-shadow(0 12px 14px #63788425)}.symbol-ring{position:absolute;inset:9px;border-radius:50%;border:5px solid #eaf0f2;box-shadow:inset 2px 2px 3px #fff,2px 2px 1px #8f9fa466,-2px -2px 1px #fff,inset -2px -2px 3px #b69c6355}.symbol-ring.first{transform:rotate(-32deg) scaleX(.57)}.symbol-ring.second{transform:rotate(35deg) scaleX(.65);border-width:3px;border-color:#fff9e9}.symbol-core{position:absolute;inset:34px;border-radius:50%;background:radial-gradient(circle at 27% 23%,#fffef9,#e9e5da 30%,#c1cbd0 65%,#7f929f);box-shadow:inset -3px -5px 7px #96a6b899,inset 2px 2px 6px white,0 0 18px #ffedc344}.symbol-axis{position:absolute;top:51%;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#fffdf3,#acbac0,transparent);transform:rotate(-32deg)}.chip-shadow{position:absolute;left:12%;right:9%;height:32px;bottom:0;border-radius:50%;background:radial-gradient(ellipse,#77889235,transparent 70%);filter:blur(12px);transform:rotate(-4deg)}.identity-chip:focus-visible{outline:2px solid #a68c5b;outline-offset:10px;border-radius:17px}.is-compact{height:235px;transform:translateY(-8px) scale(.83)}.is-static .identity-chip{animation:none;transform:rotateX(0) rotateY(0);transition:none}.is-static{transition:none}@keyframes identity-float{0%,100%{translate:0 0}50%{translate:0 -6px}}@media(max-width:600px){.chip-space{height:270px;max-width:360px}.identity-chip{height:225px;top:10px}.chip-top{left:23px;right:23px;top:22px}.chip-name{left:24px;bottom:62px;font-size:28px}.chip-bottom{left:24px;right:24px;bottom:25px}.identity-symbol{right:26px;top:70px;width:90px;height:90px}.symbol-core{inset:28px}.symbol-ring{inset:8px}.is-compact{height:190px;transform:scale(.88)}}@media(prefers-reduced-motion:reduce){.identity-chip,.chip-space{animation:none;transition:none}.identity-chip{transform:none}}
</style>

<style scoped>
/* Keep the metal only at the cut edge; the center remains genuinely translucent. */
.chip-thickness{padding:3px;mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude}
.chip-front{background:radial-gradient(ellipse at var(--light-x) var(--light-y),#ffffff74,transparent 60%),linear-gradient(118deg,#ffffff48,#d2e0e829 38%,#ffffff76 52%,#f5e4bc1c 80%,#f6f6f330)}
</style>

<style scoped>.chip-front{background:var(--identity-glass)}.role-mark>i{border-color:var(--identity-gold)}</style>
<style scoped>.chip-name{right:36%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}</style>
