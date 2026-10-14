<script setup lang="ts">
import { ref,onBeforeUnmount } from 'vue'
import OverviewScene from './OverviewScene.vue'
import ModuleGlyph from './ModuleGlyph.vue'
import type { ConsoleModule } from './consoleTypes'
import type { PanelAnchor, SceneReport } from '../scene/overviewScene'
defineProps<{ modules: ConsoleModule[]; view?: 'front' | 'side';focusId?:string }>()
const emit = defineEmits<{select:[id:string];focus:[id:string]}>()
const anchors = ref<PanelAnchor[]>([]), report = ref<SceneReport>(), failed = ref(false)
const yaw=ref(0)
let drag:{id:number;start:number;last:number;time:number;velocity:number}|undefined,wasDrag=false,frameId=0
function stop(){cancelAnimationFrame(frameId);frameId=0}
function down(event:PointerEvent){if(event.button!==0||failed.value)return;stop();wasDrag=false;drag={id:event.pointerId,start:event.clientX,last:event.clientX,time:performance.now(),velocity:0}}
function move(event:PointerEvent){if(!drag||event.pointerId!==drag.id)return;const now=performance.now();if(!wasDrag&&Math.abs(event.clientX-drag.start)<6)return;if(!wasDrag)(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);wasDrag=true;const delta=(event.clientX-drag.last)*.008;yaw.value+=delta;drag.velocity=Math.max(-2.4,Math.min(2.4,delta/Math.max(.008,(now-drag.time)/1000)));drag.last=event.clientX;drag.time=now}
function up(event:PointerEvent){if(!drag||event.pointerId!==drag.id)return;let velocity=performance.now()-drag.time<100?drag.velocity:0;drag=undefined;if((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId))(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);if(event.type==='pointercancel'||!wasDrag||matchMedia('(prefers-reduced-motion:reduce)').matches)return;let previous=performance.now();const tick=(now:number)=>{const dt=Math.min(.05,(now-previous)/1000);previous=now;velocity*=Math.exp(-4.5*dt);yaw.value+=velocity*dt;if(Math.abs(velocity)>.012)frameId=requestAnimationFrame(tick);else frameId=0};frameId=requestAnimationFrame(tick)}
function keyboard(event:KeyboardEvent){if(event.target!==event.currentTarget)return;if(['ArrowLeft','ArrowRight','Home'].includes(event.key)){event.preventDefault();stop();yaw.value=event.key==='Home'?0:yaw.value+(event.key==='ArrowLeft'?-.18:.18)}}
function select(id:string,mouse=false){if(mouse&&wasDrag)return;stop();emit('focus',id);emit('select',id)}
onBeforeUnmount(stop)
function frame(next: PanelAnchor[], stats: SceneReport) { anchors.value = next; report.value = stats }
function style(index: number) {
  const anchor = anchors.value[index]
  return anchor ? { left: `${anchor.x}px`, top: `${anchor.y}px`, width: `${anchor.width}px`, height: `${anchor.height}px`, transform:anchor.transform } : {}
}
</script>
<template>
  <section class="orbital-console" :class="{'fallback':failed,'side-study':view==='side'}" :data-render-report="JSON.stringify(report)" :data-yaw="yaw" aria-label="空间总览，拖动旋转，方向键旋转，Home 复位" tabindex="0" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @keydown="keyboard">
    <div class="orbital-stage">
      <OverviewScene :view="view" :yaw="yaw" :modules="modules" :focus-id="focusId" @frame="frame" @unavailable="failed=true" />
      <div v-if="failed" class="fallback-platform" aria-hidden="true"><span v-for="i in 5" :key="i" :style="{transform:`translateY(${i*18}px) rotate(-24deg)`}"/></div>
      <div class="center-caption"><slot name="center" /></div>
    </div>
    <div class="orbital-modules">
      <article v-for="(module,i) in modules" :key="module.id" class="orbital-panel" :style="style(i)" :aria-label="module.accessibilityLabel" :data-domain="module.id" :data-orbit-node="JSON.stringify(anchors[i]?.orbit)" role="button" tabindex="0" @pointerenter="!drag && emit('focus',module.id)" @focus="emit('focus',module.id)" @click="select(module.id,true)" @keydown.enter.prevent="select(module.id)" @keydown.space.prevent="select(module.id)">
        <div class="panel-graphic"><ModuleGlyph :module="module" /></div>
      </article>
    </div>
  </section>
</template>
<style scoped>
.orbital-console{position:relative;min-height:650px;height:calc(100svh - 110px);color:#314b5b;background:#fff}
.orbital-console{touch-action:pan-y;outline:none}.orbital-console:focus-visible{outline:1px solid #a4bcc4;outline-offset:-4px}.orbital-stage{cursor:grab}.orbital-stage:active{cursor:grabbing}
.orbital-stage{position:absolute;inset:0}.center-caption{position:absolute;left:50%;top:71%;transform:translateX(-50%);font-size:15px;letter-spacing:.35em;color:#426473}.center-caption span{display:block;text-align:center;font-size:8px;letter-spacing:.19em;margin-top:9px;color:#72848b}
.orbital-panel{box-sizing:border-box;position:absolute;transform-origin:0 0;padding:22px 24px 16px;outline:none;background:transparent;min-width:240px;cursor:pointer;transition:filter .16s}.orbital-panel:hover{filter:drop-shadow(0 0 7px #b6dce7)}
.panel-graphic{display:none}.fallback .panel-graphic{display:block}
.orbital-panel header{display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:.12em}.orbital-panel header small{font-size:9px;color:#748a93;letter-spacing:.16em}
.orbital-panel header{padding-bottom:10px;border-bottom:1px solid #7398a533}.orbital-panel p{border-left:2px solid #a4c2ce;padding-left:7px}.orbital-panel :deep(svg){margin-top:6px}
.panel-reading{margin-top:12px;font-size:42px;font-weight:300;line-height:1;letter-spacing:-.045em;font-variant-numeric:tabular-nums;color:#294854}.panel-reading small{font-size:12px;margin-left:8px;font-weight:400;letter-spacing:0}.panel-reading.pending{font-size:28px;padding-top:5px}
.orbital-panel p{font-size:10px;letter-spacing:.04em;color:#627983;margin:8px 0 1px}.orbital-panel footer{display:flex;justify-content:space-between;font-size:8px;color:#5c7381;padding-top:5px;border-top:1px solid #48687820}.orbital-panel footer b{font-size:11px;font-weight:500;color:#314b5b;margin-left:4px}
.orbital-panel:focus-visible{outline:2px solid #8b7046;outline-offset:3px;border-radius:12px}.side-study .center-caption{display:none}
.fallback-platform{position:absolute;inset:20% 35% 35%}.fallback-platform span{position:absolute;inset:0;border:1px solid #91bdc5;background:#d9edef80;box-shadow:2px 3px 0 #7dabb538;border-radius:14px}
.fallback .orbital-panel{background:#fff9;border:1px solid #b6c8cb80;border-radius:15px}.fallback .orbital-modules{position:absolute;inset:2% 7%;display:grid;grid-template-columns:1fr 1fr;gap:40% 30%}.fallback .orbital-panel{position:static;transform:none!important;width:auto!important;height:auto!important;min-height:0!important}
@media(max-width:700px){
 .orbital-console{height:auto;min-height:0;padding:0 16px 22px}.orbital-stage{position:relative;height:334px;margin:0 -16px}.center-caption{top:89%;font-size:13px}.center-caption span{display:none}
 .orbital-modules,.fallback .orbital-modules{position:relative;inset:auto;display:grid;grid-template-columns:1fr 1fr;gap:12px}
 .orbital-panel,.fallback .orbital-panel{position:relative;left:auto!important;top:auto!important;transform:none!important;width:auto!important;height:auto!important;min-height:182px!important;min-width:0;padding:16px 15px 10px;border:1px solid #afc3c766;border-top-color:#fff;border-radius:12px;background:linear-gradient(135deg,#fffdfb,#dfecec82)}
 .orbital-panel header{font-size:11px;letter-spacing:.05em}.panel-reading{font-size:34px;margin-top:12px}.panel-reading.pending{font-size:23px;padding-top:4px}.orbital-panel p{font-size:9px}.orbital-panel :deep(svg){height:52px}.orbital-panel footer{font-size:7px;gap:4px}.orbital-panel footer b{display:block;margin-left:0;margin-top:2px;font-size:10px}
 .panel-graphic{display:block}.orbital-panel,.fallback .orbital-panel{min-height:140px!important;background:#f1f8f93d;border-color:#9bbdc338}.orbital-panel :deep(svg){height:100px}
 .side-study .orbital-stage{height:700px}
}
</style>
