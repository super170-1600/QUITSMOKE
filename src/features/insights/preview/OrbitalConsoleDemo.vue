<script setup lang="ts">
import { computed,watch,nextTick,onBeforeUnmount,ref } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import OrbitalConsole from '../ui/OrbitalConsole.vue'
import { nicoDomains,demoSnapshot } from '../config/nicoDomains'
import DomainDetail from '../views/DomainDetail.vue'
const route = useRoute(),router=useRouter()
const view = computed(() => route.query.view === 'side' ? 'side' : 'front')
const selectedModule=computed(()=>nicoDomains.find(module=>module.id===route.query.domain))
const focusId=ref('journey')
const focusedModule=computed(()=>selectedModule.value??nicoDomains.find(module=>module.id===focusId.value)??nicoDomains[0]!)
let previousFocus:HTMLElement|null=null,previousOverflow=''
function select(id:string){router.push({query:{...route.query,domain:id}})}
function close(){const query={...route.query};delete query.domain;router.replace({query})}
watch(()=>Boolean(selectedModule.value),async opened=>{
 if(opened){previousFocus=document.activeElement as HTMLElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden'}
 else {document.body.style.overflow=previousOverflow;await nextTick();previousFocus?.focus()}
},{immediate:true})
onBeforeUnmount(()=>{document.body.style.overflow=previousOverflow})
</script>
<template>
  <main class="orbital-demo">
    <header class="orbital-top"><a href="#/__hub-preview" aria-label="返回晶体预览">NICØ</a><div class="top-identity">NICØ <time>2026.09.16 — 10.13</time></div><a href="#/__pulse-demo" aria-label="打卡测试">↗</a></header>
    <div :inert="selectedModule ? true : undefined"><OrbitalConsole :modules="nicoDomains" :view="view" :focus-id="focusedModule.id" @focus="focusId=$event" @select="select" /></div>
    <DomainDetail v-if="selectedModule" :module="selectedModule" :snapshot="demoSnapshot" @close="close" @select="select" />
    <footer class="orbital-note"><span>固定样本 · 非账户数据</span><span>↔</span></footer>
  </main>
</template>
<style scoped>
.orbital-demo{min-height:100svh;background:#f5f4ef;color:#314b5b;font-family:Inter,'Helvetica Neue','PingFang SC','Microsoft YaHei',sans-serif}.orbital-top{height:72px;padding:0 4.2%;display:flex;align-items:center;justify-content:space-between}.orbital-top a{color:inherit;text-decoration:none;font-size:16px;letter-spacing:.36em}.orbital-top span{font-size:10px;letter-spacing:.17em;color:#637780}.orbital-top a:last-child{letter-spacing:0;font-size:20px;border:1px solid #91a4ab77;width:34px;height:34px;display:grid;place-items:center;border-radius:50%}.orbital-note{height:38px;padding:0 4.2%;display:flex;justify-content:space-between;align-items:center;font-size:9px;letter-spacing:.08em;color:#71858b}
.center-index{display:block;text-align:center;font-size:8px;letter-spacing:.19em;margin-top:9px;color:#72848b}
.top-identity{position:absolute;left:50%;transform:translateX(-50%);text-align:center;font-size:19px;letter-spacing:.24em}.top-identity time{display:block;font-size:9px;letter-spacing:.09em;color:#657e88;margin-top:6px}
@media(max-width:700px){.orbital-top{height:62px;padding:0 20px}.orbital-top a{font-size:12px;letter-spacing:.25em}.orbital-top span{font-size:9px}.orbital-top a:last-child{width:30px;height:30px}.orbital-note{padding:0 20px;height:32px;font-size:8px}.center-index{display:none}}
</style>
