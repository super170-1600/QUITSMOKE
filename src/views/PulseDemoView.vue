<script setup lang="ts">
import {ref} from 'vue'
import CheckinView from './CheckinView.vue'
import {createPulseDemo} from '@/visuals/pulseDemo'
import '@/styles/hubModules.css'
const source=createPulseDemo(localStorage),revision=ref(0),message=ref('')
function reset(){if(!confirm('恢复示例记录会清除本浏览器的测试修改，继续吗？'))return;try{source.reset();sessionStorage.removeItem('nico-local-pulse-demo-drafts');revision.value++}catch{message.value='无法清除本地测试记录，请检查浏览器存储权限'}}
</script>
<template><main class="pulse-demo-shell"><header class="demo-header"><router-link to="/__hub-preview">NICØ</router-link><span title="免登录示例，修改仅保存在当前浏览器">本地测试</span><button @click="reset" aria-label="恢复示例" title="恢复示例">↺</button></header><p v-if="message" role="alert">{{message}}</p><section class="optical-module demo-panel"><CheckinView :key="revision" :source="source"/></section></main></template>
<style scoped>.pulse-demo-shell{min-height:100svh;padding:28px clamp(12px,4vw,60px);background:radial-gradient(ellipse at 15% 5%,#fffaf0,transparent 60%),linear-gradient(135deg,#f5f5f1,#e2ebef);color:#48616d}.demo-header{max-width:1150px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px}.demo-header>a{letter-spacing:.25em;color:#35434a;text-decoration:none;font-size:18px}.demo-header button{padding:10px 16px;border:1px solid #a5b9c566;border-radius:22px;background:#fff8;color:#536e7b;cursor:pointer}.demo-notice{max-width:1150px;margin:20px auto;font-size:12px;line-height:1.8;color:#627e8c}.demo-panel{max-width:1150px;margin:auto;border:1px solid #fff;border-radius:28px;background:linear-gradient(135deg,#fffdf9e8,#edf4f6e8);box-shadow:0 25px 75px #3d566419}@media(max-width:650px){.pulse-demo-shell{padding:18px 10px}.demo-header{flex-wrap:wrap}.demo-header>a{font-size:14px}.demo-header span{font-size:10px}.demo-panel{padding:18px 12px;border-radius:20px}}</style>
