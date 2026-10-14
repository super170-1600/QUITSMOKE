<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { createOverviewScene, type PanelAnchor, type SceneReport } from '../scene/overviewScene'
import type {ConsoleModule} from './consoleTypes'
const props = defineProps<{ view?: 'front' | 'side';yaw?:number;modules:ConsoleModule[];focusId?:string }>()
const emit = defineEmits<{ frame: [anchors: PanelAnchor[], report: SceneReport]; unavailable: [] }>()
const host = ref<HTMLElement>()
let controller: ReturnType<typeof createOverviewScene> | undefined
function unavailable() { controller?.dispose(); controller = undefined; emit('unavailable') }
onMounted(() => {
  host.value?.addEventListener('orbital-context-lost', unavailable)
  try { controller = createOverviewScene(host.value!, (anchors, report) => emit('frame', anchors, report),props.modules); controller.setView(props.view ?? 'front') } catch { unavailable() }
})
watch(() => props.view, view => controller?.setView(view ?? 'front'))
watch(()=>props.yaw,yaw=>controller?.setYaw(yaw??0))
watch(()=>props.focusId,id=>{if(id)controller?.setFocus(id)})
onBeforeUnmount(() => { host.value?.removeEventListener('orbital-context-lost', unavailable); controller?.dispose() })
</script>
<template><div ref="host" class="orbital-render" aria-hidden="true" /></template>
<style scoped>.orbital-render{position:absolute;inset:0}.orbital-render :deep(canvas){display:block;width:100%;height:100%}</style>
