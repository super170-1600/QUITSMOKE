<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount,watch} from 'vue'
import {createConstellation} from '../scene/scene'
import type {StudyOptions,StudyReport,StudyTarget} from '../types'
import type {EffectId} from '../config/effects'
const props=defineProps<{options:StudyOptions}>()
const emit=defineEmits<{frame:[targets:StudyTarget[],report:StudyReport];unavailable:[]}>()
const host=ref<HTMLElement>(),loading=ref(true),abort=new AbortController()
let controller:Awaited<ReturnType<typeof createConstellation>>,intersection:IntersectionObserver|undefined
function lost(event:Event){event.preventDefault();controller?.dispose();controller=undefined;emit('unavailable')}
onMounted(async()=>{
 try{controller=await createConstellation(host.value!,props.options,(targets,report)=>emit('frame',targets,report),abort.signal);if(abort.signal.aborted){controller?.dispose();return}controller?.update(props.options);host.value?.querySelector('canvas')?.addEventListener('webglcontextlost',lost);intersection=new IntersectionObserver(entries=>controller?.setPaused(!entries[0]?.isIntersecting));intersection.observe(host.value!)}catch(error){if(import.meta.env.DEV)console.warn('Constellation initialization failed',error);if(!abort.signal.aborted)emit('unavailable')}finally{loading.value=false}
})
watch(()=>props.options,options=>controller?.update(options),{deep:true})
onBeforeUnmount(()=>{abort.abort();intersection?.disconnect();host.value?.querySelector('canvas')?.removeEventListener('webglcontextlost',lost);controller?.dispose()})
defineExpose({projectSupporter:(id:string,open:boolean)=>controller?.projectSupporter(id,open),reset:()=>controller?.reset(),feedback:(kind:'record'|'node'|'plan')=>controller?.feedback(kind),playEffect:(id:EffectId,sender:string)=>controller?.playEffect(id,sender),seekEffect:(progress:number)=>controller?.seekEffect(progress),cancelEffect:()=>controller?.cancelEffect()})
</script>
<template><div ref="host" class="constellation-render" aria-hidden="true"><div v-if="loading" class="loading-core"/></div></template>
<style scoped>.constellation-render{position:absolute;inset:0}.constellation-render :deep(canvas){display:block;width:100%;height:100%;touch-action:none}.loading-core{position:absolute;left:50%;top:45%;width:110px;height:110px;border-radius:50%;border:1px solid #d2c7b4;transform:translate(-50%,-50%);background:radial-gradient(circle at 30% 25%,#fff,#dce5e433,transparent)}</style>
