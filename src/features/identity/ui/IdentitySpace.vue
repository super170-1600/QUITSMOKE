<script setup lang="ts">
import {ref,computed,nextTick} from 'vue'
import type {IdentityModel,IdentitySection} from '../types'
import {identitySections} from '../types'
import IdentityCard from './IdentityCard.vue'
import IdentitySettingsList from './IdentitySettingsList.vue'
import IdentityIcon from './IdentityIcon.vue'
const props=defineProps<{identity:IdentityModel;static?:boolean;returnTo:string;feedback?:number}>()
const active=ref<IdentitySection|null>(null),expanded=ref(false),panel=ref<HTMLElement>(),root=ref<HTMLElement>()
let previousFocus:HTMLElement|null=null,returnSection:IdentitySection|null=null
const label=computed(()=>identitySections.find(value=>value.id===active.value)?.label)
function focusPanel(){if(active.value)panel.value?.querySelector<HTMLElement>('button')?.focus();else if(returnSection){const target=root.value?.querySelector<HTMLElement>('[data-section='+returnSection+']');if(target){target.focus();returnSection=null}}}
async function open(section:IdentitySection){previousFocus=document.activeElement as HTMLElement;active.value=section;expanded.value=false;await nextTick();root.value?.focus({preventScroll:true});focusPanel()}
async function close(){returnSection=active.value;active.value=null;await nextTick();if(previousFocus?.isConnected)previousFocus.focus();focusPanel()}
defineExpose({open})
</script>
<template>
 <main ref="root" tabindex="-1" class="identity-space" :class="{'is-stationary':static,'has-panel':active}" @keydown.esc.stop.prevent="active?close():expanded=false">
  <div class="space-light cool" aria-hidden="true"/><div class="space-light warm" aria-hidden="true"/>
  <header class="identity-header"><router-link to="/" class="identity-brand" aria-label="NICØ 首页">NICØ</router-link><router-link :to="returnTo" class="crystal-return" aria-label="返回晶体主页面"><IdentityIcon name="crystal"/></router-link></header>
  <section class="identity-content" aria-label="数字身份空间">
   <div class="chip-position" :class="{'is-expanded':expanded}"><IdentityCard :identity="identity" :static="static" :compact="Boolean(active)" @open="expanded=!expanded"/><i v-if="feedback" :key="feedback" class="confirmed-edge" aria-hidden="true"/></div>
   <div v-if="expanded" class="identity-detail" role="status"><span>{{identity.nickname}}</span><span>{{identity.role==='quitter'?'戒烟者':identity.role==='supporter'?'支持者':'未设置身份'}}</span><span>{{identity.accountLabel}}</span></div>
   <Transition name="settings" mode="out-in" @after-enter="focusPanel"><section v-if="active" :key="active" ref="panel" class="identity-panel" :aria-label="label"><header><button @click="close" aria-label="返回设置总览">←</button><span>{{label}}</span></header><slot :name="active"/></section><IdentitySettingsList v-else :role="identity.role" @select="open"/></Transition>
   <footer class="identity-footer"><slot name="footer"/></footer>
  </section>
 </main>
</template>
<style scoped>
.identity-space{position:relative;isolation:isolate;min-height:100svh;overflow:hidden;background:radial-gradient(ellipse at 52% 27%,#fffefa 0,#f0f1ef 54%,#e5e9eb 100%);color:#465257;font:13px Inter,'Helvetica Neue','PingFang SC','Microsoft YaHei',sans-serif}.identity-space *{box-sizing:border-box}.space-light{position:absolute;z-index:-1;pointer-events:none;width:75vw;height:75vw;border-radius:50%;filter:blur(40px)}.cool{left:-45%;top:-30%;background:radial-gradient(circle,#aabfc525,transparent 60%)}.warm{right:-40%;top:20%;background:radial-gradient(circle,#dec39430,transparent 60%)}.identity-space:before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(119deg,transparent 23%,#ffffff6b 25%,transparent 28%,transparent 68%,#fff9e961 71%,transparent 78%)}.identity-header{height:94px;display:flex;align-items:center;justify-content:space-between;padding:0 4.2%}.identity-brand{text-decoration:none;color:#3d474b;letter-spacing:.34em;font-size:15px}.crystal-return{width:44px;height:44px;display:grid;place-items:center;color:#727e84;border-radius:50%;border:1px solid #9ba9aa4d;background:#fff4}.crystal-return svg{width:23px;height:23px}.identity-content{position:relative;max-width:650px;margin:44px auto 0;padding:0 30px 26px}.chip-position{margin:0 auto 34px;transition:transform .4s ease}.is-expanded{transform:scale(1.025)}.identity-detail{display:flex;gap:20px;justify-content:center;margin:-24px 0 32px;font-size:11px;color:#7b8589}.identity-panel{padding:0 8px;min-height:235px}.identity-panel>header{display:flex;gap:14px;align-items:center;padding-bottom:18px;margin-bottom:10px;border-bottom:1px solid #8a989c26}.identity-panel>header button{width:44px;height:44px;border:0;background:none;font-size:23px;color:#7b878b;cursor:pointer}.identity-panel>header>span{font-size:14px;letter-spacing:.08em}.identity-footer{display:flex;align-items:center;justify-content:space-between;min-height:68px;margin-top:25px;color:#939a9d;font-size:10px}.identity-space a:focus-visible,.identity-space button:focus-visible{outline:2px solid #a68c5b;outline-offset:4px}.settings-enter-active,.settings-leave-active{transition:opacity .23s ease,transform .23s ease}.settings-enter-from{opacity:0;transform:translateY(10px)}.settings-leave-to{opacity:0;transform:translateY(-5px)}.is-stationary .settings-enter-active,.is-stationary .settings-leave-active,.is-stationary .chip-position{transition:none}@media(max-width:600px){.identity-header{height:74px;padding:0 24px}.identity-brand{font-size:12px;letter-spacing:.24em}.crystal-return{width:40px;height:40px}.identity-content{margin-top:34px;padding:0 24px 18px}.chip-position{margin-bottom:16px}.identity-detail{margin:-10px 0 22px;gap:12px;font-size:10px}.identity-footer{margin-top:22px}.identity-panel{padding:0;min-height:280px}}@media(prefers-reduced-motion:reduce){.settings-enter-active,.settings-leave-active,.chip-position{transition:none}}
</style>

<style scoped>.identity-space:focus{outline:none}</style>

<style scoped>.chip-position{position:relative}.confirmed-edge{position:absolute;inset:20px 40px 46px;pointer-events:none;border-radius:16px;border:1px solid #d3b779;animation:confirmed-edge .65s ease both}@keyframes confirmed-edge{0%,100%{opacity:0}40%{opacity:.7;box-shadow:0 0 14px #debb7625}}@media(prefers-reduced-motion:reduce){.confirmed-edge{display:none}}</style>