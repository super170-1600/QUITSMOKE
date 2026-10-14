<script setup lang="ts">
import {computed,ref,onMounted,onBeforeUnmount} from 'vue'
import type {CheckinModel} from '@/types/domain'
import {archiveWeekDates,moodLabels} from '@/utils/dailyPulse'
import {haloVisual} from '@/visuals/haloVisual'
import OpticalHaloScene from './OpticalHaloScene.vue'
const projected=ref<{date:string;x:number;y:number;ring:number}[]>([]),mobileRing=ref(6)
const props=defineProps<{today:string;selectedDate:string;records:CheckinModel[];startDate:string;reducedMotion:boolean}>()
const emit=defineEmits<{close:[];edit:[date:string]}>()
const offset=ref(0),focusDate=ref<string|null>(null),closeButton=ref<HTMLButtonElement>()
const dates=computed(()=>archiveWeekDates(props.today,offset.value))
const byDate=computed(()=>new Map(props.records.map(record=>[record.checkinDate,record])))
const selectedRecord=computed(()=>focusDate.value?byDate.value.get(focusDate.value):undefined)

const pose=ref({yaw:0,pitch:0}),dragging=ref(false)
let pointer:{id:number;x:number;y:number;yaw:number;pitch:number}|null=null,suppressClick=false
let velocity=0,lastMoveTime=0,inertiaFrame=0
function stopInertia(){cancelAnimationFrame(inertiaFrame);inertiaFrame=0;velocity=0}
function beginDrag(event:PointerEvent){if(event.button!==0)return;stopInertia();pointer={id:event.pointerId,x:event.clientX,y:event.clientY,...pose.value};lastMoveTime=performance.now();suppressClick=false}
function moveDrag(event:PointerEvent){
 if(!pointer||event.pointerId!==pointer.id)return
 const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y
 if(!dragging.value&&Math.hypot(dx,dy)<6)return
 if(!dragging.value){try{(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)}catch{}}
 dragging.value=true;suppressClick=true
 const now=performance.now(),yaw=pointer.yaw+dx*.008,deltaTime=Math.max(16,now-lastMoveTime)/1000
 velocity=Math.max(-2.4,Math.min(2.4,velocity*.4+(yaw-pose.value.yaw)/deltaTime*.6));lastMoveTime=now
 pose.value={yaw,pitch:0}
}
function endDrag(event:PointerEvent){
 if(!pointer)return
 const shouldCoast=dragging.value&&!props.reducedMotion&&event.type!=='pointercancel'&&performance.now()-lastMoveTime<100
 pointer=null;dragging.value=false
 if(!shouldCoast){stopInertia();return}
 let previous=performance.now()
 function coast(now:number){
  const dt=Math.min(.05,(now-previous)/1000);previous=now
  pose.value={yaw:pose.value.yaw+velocity*dt,pitch:0};velocity*=Math.exp(-4.2*dt)
  if(Math.abs(velocity)>.012)inertiaFrame=requestAnimationFrame(coast)
  else stopInertia()
 }
 inertiaFrame=requestAnimationFrame(coast)
}
function captureClick(event:MouseEvent){if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false}}
function rotateKey(event:KeyboardEvent){
 stopInertia()
 const directions:Record<string,[number,number]>={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[-.15,0],ArrowDown:[.15,0]}
 if(event.key==='Home'){event.preventDefault();pose.value={yaw:0,pitch:0};return}
 const direction=directions[event.key];if(!direction)return;event.preventDefault();pose.value={yaw:pose.value.yaw+direction[0],pitch:0}
}
function changeWindow(delta:number){offset.value=Math.max(0,offset.value+delta);focusDate.value=null}
onMounted(()=>closeButton.value?.focus())
onBeforeUnmount(stopInertia)
</script>
<template><section class="pulse-overlay archive-overlay" role="dialog" aria-modal="true" aria-label="同心圆光环档案"><div class="halo-archive">
 <header class="archive-heading"><div><h2>光环档案</h2></div><button ref="closeButton" @click="emit('close')" aria-label="关闭光环档案">×</button></header>
 <nav class="archive-window" aria-label="49 日时间窗口"><button @click="changeWindow(1)">← 上一个 49 天</button><button :disabled="offset===0" @click="changeWindow(-1)">较近 49 天 →</button></nav>
 <nav class="archive-ring-selector" aria-label="选择轨道"><button v-for="ring in 7" :key="ring" :aria-pressed="mobileRing===ring-1" @click="mobileRing=ring-1;focusDate=null">{{dates[(ring-1)*7]?.slice(5)}} — {{dates[ring*7-1]?.slice(5)}}</button></nav>
 <div class="archive-content"><div class="archive-scroll"><div class="halo-space" :class="{'has-focus':focusDate,'is-dragging':dragging}" tabindex="0" role="group" aria-label="水平光环转盘，左右拖动旋转；方向键转动，Home 复位" @pointerdown="beginDrag" @pointermove="moveDrag" @pointerup="endDrag" @pointercancel="endDrag" @lostpointercapture="endDrag" @click.capture="captureClick" @keydown.self="rotateKey" @click="focusDate=null">
 <OpticalHaloScene mode="archive" :date="today" :dates="dates" :records="records" :selected-date="focusDate" :pose="pose" @project="projected=$event"/>
  <button class="archive-center" @click="focusDate=null" aria-label="取消节点选择"><span>NICØ</span></button>
  <button v-for="(date,index) in dates" :key="date" class="archive-node" :class="{'mobile-inactive':mobileRing!==Math.floor(index/7),'is-empty':!byDate.get(date)}" :data-date="date" :data-slot="index" :data-day="date.slice(-2)" :disabled="date>today" :data-ring="Math.floor(index/7)" :style="{'--slot':index%7,left:`${projected[index]?.x??50}%`,top:`${projected[index]?.y??50}%`}" :aria-pressed="focusDate===date" :aria-label="haloVisual(date,byDate.get(date),date===today).label" @click.stop="focusDate=date"><span v-if="focusDate===date">{{date.slice(5)}}</span></button>
 </div></div>
 <aside class="archive-sidebar"><section v-if="focusDate" class="archive-detail" aria-live="polite"><h3>{{focusDate}}</h3><template v-if="selectedRecord"><dl><div><dt>吸烟量</dt><dd>{{selectedRecord.cigarettes}} 支</dd></div><div><dt>当天最强烟瘾</dt><dd>{{selectedRecord.cravingScore===undefined?`旧量表 ${selectedRecord.cravingLevel}/5`:`${selectedRecord.cravingScore}/10`}}</dd></div><div><dt>每日感受</dt><dd>{{selectedRecord.mood?moodLabels[selectedRecord.mood]:'未记录'}}</dd></div></dl><p v-if="selectedRecord.note" class="archive-note">{{selectedRecord.note}}</p></template><template v-else><p>{{focusDate===today?'今天待记录':'该日期尚无记录'}}</p></template><button :disabled="focusDate<startDate||focusDate>today" @click="emit('edit',focusDate)">{{selectedRecord?'查看 / 编辑':focusDate===today?'填写今日记录':'补签这一天'}} →</button><p v-if="focusDate<startDate" class="archive-range-note">戒烟计划开始前的日期不开放补签。</p></section>
 
 </aside></div>
 <footer class="archive-footer pulse-sr-only">7 层轨道 · 每层 7 个自然日 <span class="archive-touch-hint">选择上方轨道，查看对应七日</span></footer>
</div></section></template>
<style scoped>
.halo-archive{width:min(1120px,100%);max-height:calc(100svh - 32px);overflow:auto;padding:28px;box-sizing:border-box;background:linear-gradient(130deg,#fffdf8f5,#edf4f7f5);border:1px solid #fff;border-radius:26px;box-shadow:0 30px 100px #28445425}.archive-heading{display:flex;align-items:center;justify-content:space-between}.archive-heading span,.archive-detail>span,.archive-intro>span{font-size:10px;letter-spacing:.18em;color:#65818e}.archive-heading h2{font-size:24px;font-weight:400;margin:10px 0}.archive-window{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0;font-size:12px}.archive-window span{color:#597686}.archive-content{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:32px;align-items:center}.archive-scroll{min-width:0;overflow:auto}.halo-space{position:relative;min-width:440px;width:100%;aspect-ratio:1;background:radial-gradient(circle at 50% 48%,#ffffff80,#e8f0f440 60%,#fff0)}.archive-tracks{position:absolute;inset:0;width:100%;height:100%}.daily-pulse .archive-node{position:absolute;transform:translate(-50%,-50%);padding:0;width:48px;height:54px;border:0;background:transparent;display:flex;align-items:center;flex-direction:column;justify-content:center;border-radius:12px;transition:opacity .2s}.archive-node span{font-size:9px;line-height:12px;color:#627d8c}.daily-pulse .archive-node[aria-pressed=true]{background:#fff8;box-shadow:0 0 15px #dfcead44}.has-focus .archive-node:not([aria-pressed=true]){opacity:.58}.daily-pulse .archive-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:110px;height:110px;padding:0;border:1px solid #fff;border-radius:50%;background:radial-gradient(circle,#fff9e8,#fff8 45%,#d9e8ef44);display:grid;align-content:center;justify-items:center;gap:5px;box-shadow:inset 0 0 15px #fff,0 0 24px #e6d3ad44}.archive-center b{font-size:24px;font-weight:300}.archive-center small{font-size:12px}.archive-center>span:last-child{font-size:10px;color:#627a86}.archive-detail,.archive-intro{padding:22px;border:1px solid #fff;border-radius:20px;background:#fff8;box-shadow:0 12px 35px #28495808}.archive-detail h3,.archive-intro h3{font-size:20px;font-weight:400;margin:14px 0}.archive-detail dl>div{display:flex;justify-content:space-between;gap:10px;margin:18px 0;font-size:12px}.archive-detail dt{color:#627d8c}.archive-detail dd{margin:0}.archive-detail p,.archive-intro p{font-size:12px;line-height:1.8;overflow-wrap:anywhere}.archive-detail small{font-size:10px;color:#637e8c}.archive-detail button{margin-top:20px;width:100%}.archive-weeks{list-style:none;padding:0;margin:22px 0}.archive-weeks li{display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #b9cbd344;font-size:12px}.archive-weeks b{font-weight:400;color:#b19673}.archive-weeks small{font-size:9px;color:#6f8894;margin-left:auto}.archive-legend,.archive-footer{font-size:10px;color:#607e8d;line-height:1.9}.archive-footer{margin-top:20px;border-top:1px solid #c2d1d744;padding-top:16px}.archive-touch-hint{display:none}@media(max-width:760px){.halo-archive{padding:16px;max-height:calc(100svh - 16px)}.archive-content{grid-template-columns:1fr;gap:16px}.archive-window{flex-wrap:wrap}.archive-window span{order:3;width:100%;text-align:center}.archive-sidebar{display:grid;grid-template-columns:1fr}.archive-weeks{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}.archive-weeks small{display:none}.archive-touch-hint{display:block}.archive-intro h3{font-size:17px}.archive-footer{margin-top:8px}}@media(prefers-reduced-motion:reduce){.archive-node{transition:none}}
</style>
<style scoped>
.halo-archive{width:min(1240px,100%);padding:22px 28px;background:#eef2f3}.archive-content{display:block;position:relative}.archive-scroll{overflow:hidden}.halo-space{width:100%;height:560px;min-width:0;aspect-ratio:auto;background:#e9edef;border-radius:16px;overflow:hidden}.daily-pulse .archive-node{width:52px;height:52px;border:0;padding:0;background:transparent;box-shadow:none}.daily-pulse .archive-node[aria-pressed=true]{background:none;border:1px solid #b79d76;box-shadow:none;border-radius:50%}.archive-node span{position:absolute;top:calc(100% + 3px);font-size:10px;background:#f9fbfbee;border-radius:4px;padding:3px 6px;white-space:nowrap}.has-focus .archive-node:not([aria-pressed=true]){opacity:1}.daily-pulse .archive-center{top:53%;width:96px;height:66px;background:none;border:0;box-shadow:none;color:#4e6978;gap:8px}.archive-center>span{letter-spacing:.2em;font-size:13px}.archive-center small{font-size:9px}.archive-sidebar{position:absolute;right:18px;bottom:16px;width:225px;pointer-events:none}.archive-detail{padding:18px;background:#f9fcfde8;backdrop-filter:blur(12px);pointer-events:auto}.archive-detail h3{font-size:17px;margin:10px 0}.archive-detail dl>div{margin:12px 0;font-size:11px}.archive-detail p{font-size:10px}.archive-detail button{font-size:11px;margin-top:12px;padding:10px}.archive-intro{border:0;background:none;box-shadow:none;padding:8px;font-size:10px;text-align:right}.archive-footer{margin-top:10px;padding-top:10px;font-size:10px}.archive-heading h2{font-size:20px}.archive-window{margin:12px 0;font-size:10px}.daily-pulse .archive-window button{font-size:10px;padding:9px 13px}.archive-ring-selector{display:none}@media(max-width:760px){.halo-archive{padding:16px 12px}.halo-space{height:380px;border-radius:12px}.archive-sidebar{position:relative;right:auto;bottom:auto;width:auto;margin-top:12px}.archive-detail dl{display:flex;flex-wrap:wrap;gap:10px}.archive-detail dl>div{display:block;flex:1;min-width:78px;margin:4px 0}.archive-detail dd{margin-top:6px}.archive-detail .archive-note{margin:8px 0}.archive-ring-selector{display:flex;gap:4px;margin:10px 0}.daily-pulse .archive-ring-selector button{flex:1;padding:9px 4px;font-size:11px;min-height:44px;border-radius:7px}.archive-ring-selector span{display:none}.daily-pulse .archive-node.mobile-inactive{visibility:hidden;pointer-events:none}.daily-pulse .archive-node{width:44px;height:44px}.archive-center{pointer-events:none}.archive-touch-hint{display:none}.archive-intro{margin:0;text-align:center}.archive-window span{font-size:10px}.archive-center small{font-size:8px}}
</style>
<style scoped>.halo-space{background:radial-gradient(ellipse at 35% 20%,#f8f6f0,#d6e1e7 85%)}@media(max-width:760px){.archive-center{pointer-events:auto}}</style>
<style scoped>@media(max-width:760px){.halo-space{height:320px}}</style>
<style scoped>.halo-space{background:radial-gradient(ellipse at 20% 10%,#fff7e9,#bed0dc 100%)}.halo-archive{background:#e7eef2}.archive-heading h2{margin:0 0 8px}</style>
<style scoped>@media(max-width:760px){.halo-space{padding-bottom:52px;box-sizing:content-box}.halo-space :deep(.optical-scene){bottom:52px}.daily-pulse .archive-node{left:calc(var(--slot) * (100% / 7) + (100% / 14) - 22px)!important;top:auto!important;bottom:4px;transform:none;border-radius:8px}.archive-node::after{content:attr(data-day);font-size:12px;color:#436275}.daily-pulse .archive-node[aria-pressed=true]{border-radius:8px;background:#fff8}.archive-node span{display:none}.daily-pulse .archive-center{top:48%;width:80px;pointer-events:none}}</style>
<style scoped>.halo-space{touch-action:none;cursor:grab;user-select:none}.halo-space.is-dragging{cursor:grabbing}.halo-space.is-dragging .archive-node{pointer-events:none}.daily-pulse .archive-center{top:50%}@media(max-width:760px){.daily-pulse .archive-center{top:43%}.archive-node{touch-action:manipulation}}</style>
<style scoped>.archive-ring-selector{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:12px 0}.daily-pulse .archive-ring-selector button{min-height:44px;padding:8px 4px;font-size:11px;border:0;border-bottom:1px solid #8ba4b344;border-radius:0;background:none;box-shadow:none}.daily-pulse .archive-ring-selector button[aria-pressed=true]{border-bottom:2px solid #b78236;background:none}.archive-window{justify-content:space-between}@media(max-width:760px){.archive-ring-selector{grid-template-columns:repeat(4,1fr);gap:3px}.daily-pulse .archive-ring-selector button{font-size:10px;min-height:38px}}</style>
