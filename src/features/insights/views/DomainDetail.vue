<script setup lang="ts">
import {computed,ref,watch,onMounted,onBeforeUnmount} from 'vue'
import type {ConsoleModule} from '../ui/consoleTypes'
import type {InsightsSnapshot,InsightsRange} from '../domain/types'
import {selectPoints} from '../domain/metrics'
import SavingsWall from '../ui/SavingsWall.vue'
const props=defineProps<{module:ConsoleModule;snapshot:InsightsSnapshot}>()
const emit=defineEmits<{close:[];select:[id:string]}>()
const range=ref<InsightsRange>(30),selected=ref<string>(),closeButton=ref<HTMLButtonElement>()
const points=computed(()=>selectPoints(props.snapshot,range.value))
const selectedPoint=computed(()=>points.value.find(point=>point.date===selected.value))
const value=(point:InsightsSnapshot['points'][number])=>props.module.id==='craving'?point.cravingScore:props.module.id==='savings'?(point.estimatedAmount===null?null:Number(point.estimatedAmount)):point.cigarettesCount
const extent=computed(()=>props.module.id==='craving'?{min:0,max:10}:{min:Math.min(0,...points.value.map(point=>value(point)??0)),max:Math.max(1,...points.value.map(point=>value(point)??0))})
const x=(index:number)=>54+index*732/Math.max(1,points.value.length-1)
const y=(number:number)=>270-(number-extent.value.min)/(extent.value.max-extent.value.min)*210
const line=computed(()=>{let connected=false;return points.value.map((point,i)=>{const number=value(point);if(number===null){connected=false;return ''}const command=connected?'L':'M';connected=true;return `${command}${x(i)},${y(number)}`}).join(' ')})
const ticks=computed(()=>[extent.value.max,(extent.value.max+extent.value.min)/2,extent.value.min])
const ranges:InsightsRange[]=[7,30,90,'all']
const names=[{id:'journey',label:'历程'},{id:'craving',label:'烟瘾'},{id:'savings',label:'节省'},{id:'recovery',label:'恢复'}]
const axisLabel=computed(()=>props.module.id==='craving'?'烟瘾 · 0–10':props.module.id==='savings'?'每日差额 · CNY':'每日吸烟 · 支')
watch(()=>props.module.id,()=>{selected.value=undefined})
watch(range,()=>{selected.value=undefined})
function escape(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();emit('close')}}
onMounted(()=>{closeButton.value?.focus();document.addEventListener('keydown',escape,true)})
onBeforeUnmount(()=>document.removeEventListener('keydown',escape,true))
function trap(event:KeyboardEvent){
 if(event.defaultPrevented)return
 if(event.key==='Escape'){event.preventDefault();emit('close');return}
 if(event.key!=='Tab')return
 const nodes=Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex="0"]'))
 const first=nodes[0],last=nodes[nodes.length-1]
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
}
</script>
<template>
 <div class="detail-backdrop" @click.self="emit('close')">
 <section class="domain-detail" role="dialog" aria-modal="true" :aria-label="module.label" @keydown="trap" :style="{'--accent':module.accent}">
  <header class="detail-top"><nav aria-label="数据领域"><button v-for="item in names" :key="item.id" :aria-pressed="module.id===item.id" @click="emit('select',item.id)">{{item.label}}</button></nav><button ref="closeButton" class="detail-close" aria-label="返回轨道" @click="emit('close')">×</button></header>
  <div class="detail-heading"><div><span>{{module.label}}</span><h2>{{module.summary}} <small>{{module.unit}}</small></h2><p>{{module.detail}} · 自档案起</p></div><div v-if="module.id!=='recovery'" class="detail-ranges"><button v-for="item in ranges" :key="item" :aria-pressed="range===item" @click="range=item">{{item==='all'?'ALL':`${item}D`}}</button></div></div>
  <template v-if="module.id==='savings'">
   <SavingsWall :points="points" :selected="selected" @select="selected=$event"/>
   <div class="day-inspect" aria-live="polite"><template v-if="selectedPoint"><time>{{selectedPoint.date}}</time><strong>{{selectedPoint.estimatedAmount===null?'缺少记录或估算条件':`¥ ${selectedPoint.estimatedAmount}`}}</strong><span v-if="selectedPoint.cigarettesCount!==null">吸烟 {{selectedPoint.cigarettesCount}} 支</span></template><template v-else>选择一叠钱查看当天记录</template></div>
   <footer>{{snapshot.summary.savings.assumptions.join(' · ')}}</footer>
  </template>
  <template v-else-if="module.id!=='recovery'">
   <div v-if="module.secondary" class="journey-summary"><span v-for="item in module.secondary" :key="item.label">{{item.label}} <b>{{item.value}}</b></span></div>
   <p class="chart-caption">{{axisLabel}}</p>
   <div class="detail-chart" :class="module.shape">
    <svg viewBox="0 0 840 330" role="group" :aria-label="`${module.label}逐日数据，详细读数见下方日期按钮`">
     <defs><linearGradient id="detail-optic" x1="0" y1="0" x2="0" y2="1"><stop :stop-color="module.accent" stop-opacity=".75"/><stop offset=".4" stop-color="#f4ffff"/><stop offset="1" :stop-color="module.accent" stop-opacity=".16"/></linearGradient></defs>
     <g v-for="tick in ticks" :key="tick"><line x1="54" x2="786" :y1="y(tick)" :y2="y(tick)" stroke="#728b9828"/><text x="36" :y="y(tick)+4" text-anchor="end">{{Number(tick.toFixed(1))}}</text></g>
     <line v-if="extent.min<0" x1="54" x2="786" :y1="y(0)" :y2="y(0)" stroke="#718491"/>
     <path v-if="module.id!=='savings'" :d="line" fill="none" :stroke="module.accent" :stroke-width="module.id==='craving'?18:2" :opacity="module.id==='craving'?.15:.4" stroke-linejoin="round"/>
     <path v-if="module.id!=='savings'" :d="line" fill="none" :stroke="module.accent" stroke-width="2.5" stroke-linejoin="round"/>
     <g v-for="(point,i) in points" :key="point.date" class="chart-point" role="button" tabindex="0" :aria-label="`${point.date}，${value(point)===null?'暂无记录':value(point)}${module.id==='savings'?'元':module.id==='craving'?'分':'支'}`" @click="selected=point.date" @keydown.enter.prevent="selected=point.date" @keydown.space.prevent="selected=point.date">
      <circle :cx="x(i)" :cy="value(point)===null?270:y(value(point)!)" r="11" fill="transparent"/>
      <rect v-if="module.id==='savings'&&value(point)!==null" :x="x(i)-Math.min(9,290/points.length)" :y="Math.min(y(value(point)!),y(0))" :width="Math.min(18,580/points.length)" :height="Math.max(1,Math.abs(y(value(point)!)-y(0)))" rx="3" fill="url(#detail-optic)" :stroke="module.accent" stroke-width=".65"/>
      <ellipse v-else-if="module.id==='journey'&&value(point)!==null" :cx="x(i)" :cy="y(value(point)!)" rx="5" ry="8" fill="#f5ffff" :stroke="module.accent" stroke-width="2"/>
      <circle v-else-if="value(point)!==null" :cx="x(i)" :cy="y(value(point)!)" r="3" fill="#effaff" :stroke="module.accent"/>
     </g>
     <template v-for="(point,i) in points" :key="`guide-${point.date}`"><line v-if="selected===point.date" :x1="x(i)" :x2="x(i)" y1="40" y2="280" :stroke="module.accent" stroke-dasharray="3 4" pointer-events="none"/></template>
     <text x="54" y="310">{{points[0]?.date.slice(5)}}</text><text x="786" y="310" text-anchor="end">{{points[points.length-1]?.date.slice(5)}}</text>
    </svg>
   </div>
   <div class="day-inspect" aria-live="polite"><template v-if="selectedPoint"><time>{{selectedPoint.date}}</time><strong>{{value(selectedPoint)===null?'暂无记录':value(selectedPoint)}} <small>{{value(selectedPoint)===null?'':module.id==='savings'?'元':module.id==='craving'?'/ 10':'支'}}</small></strong></template><template v-else>选择日期查看读数</template></div>
   <div class="detail-dates" aria-label="逐日读数"><button v-for="point in points" :key="point.date" :aria-pressed="selected===point.date" :aria-label="`${point.date}，${value(point)===null?'暂无记录':value(point)}${module.id==='savings'?'元':module.id==='craving'?'分':'支'}`" @click="selected=point.date">{{point.date.slice(5)}}<span>{{value(point)===null?'—':value(point)}}</span></button></div>
   <footer v-if="module.id==='savings'">仅已记录日期 · 按当前档案参数估算</footer>
   <footer v-else>{{snapshot.summary.coverage.recordedDays}} / {{snapshot.summary.coverage.expectedDays}} 天已记录 · {{snapshot.summary.timezone}}</footer>
  </template>
  <div v-else class="recovery-pending"><svg viewBox="0 0 400 210" aria-hidden="true"><path d="M30 170L365 45" stroke="#b6c8ce" stroke-dasharray="3 9" fill="none"/><path v-for="i in 4" :key="i" :d="`M${30+i*75} ${170-i*30}l20 -35 20 35 -20 35Z M${30+i*75} ${170-i*30}h40`" fill="#edf4f5" stroke="#99b1bb"/></svg><p>尚无法确认</p><small>参考配置与持续无烟依据待确认</small></div>
 </section>
 </div>
</template>
<style scoped>
.detail-backdrop{position:fixed;inset:0;z-index:30;background:#e4eae9b8;backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:24px}.domain-detail{box-sizing:border-box;width:min(960px,100%);max-height:92svh;overflow:auto;padding:28px 40px;background:linear-gradient(140deg,#fffefbef,#e4eef0f5);border:1px solid #ffffff;border-radius:24px;box-shadow:0 24px 90px #31525c24;color:#314b5b;animation:detail-enter .3s ease-out}.detail-top{display:flex;align-items:center;justify-content:space-between}.detail-top nav{display:flex;gap:4px}button{font:inherit;color:inherit;cursor:pointer;border:0;background:transparent;min-height:44px;min-width:44px}.detail-top nav button{font-size:12px;padding:0 14px;color:#758a93}.detail-top nav button[aria-pressed=true]{color:var(--accent);border-bottom:1px solid var(--accent)}.detail-close{font-size:25px;border:1px solid #adc2c955;border-radius:50%}.detail-heading{display:flex;align-items:flex-end;justify-content:space-between;margin:24px 0 12px}.detail-heading span{font-size:13px}.detail-heading h2{font-size:56px;font-weight:300;margin:8px 0;color:var(--accent);letter-spacing:-.04em}.detail-heading h2 small{font-size:14px}.detail-heading p,.chart-caption{font-size:11px;color:#667e88}.detail-ranges{display:flex;gap:2px}.detail-ranges button{font-size:10px;border-radius:22px}.detail-ranges button[aria-pressed=true]{background:#c5dbe488;color:#274e63}.detail-chart{margin:10px 0;border-top:1px solid #aec6cc40}.detail-chart svg{width:100%;display:block;min-height:210px}svg text{font-size:11px;fill:#627f8a}.day-inspect{min-height:36px;display:flex;align-items:center;gap:20px;font-size:11px;color:#657d87}.day-inspect strong{font-size:20px;font-weight:400;color:var(--accent)}.day-inspect strong small{font-size:11px}.detail-dates{display:flex;gap:5px;overflow:auto;padding:8px 0;scrollbar-width:thin}.detail-dates button{font-size:9px;flex:0 0 49px;min-height:55px;border:1px solid #abc0c635;border-radius:8px}.detail-dates button span{display:block;font-size:12px;margin-top:5px}.detail-dates button[aria-pressed=true]{background:#d6e7ec;border-color:var(--accent)}footer{font-size:10px;color:#7c8e94;margin-top:14px}.recovery-pending{text-align:center;padding:30px}.recovery-pending svg{width:min(500px,100%)}.recovery-pending p{font-size:20px}.recovery-pending small{font-size:11px;color:#708791}button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}@keyframes detail-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@media(max-width:700px){.detail-backdrop{padding:12px}.domain-detail{padding:20px 18px;max-height:95svh;border-radius:18px}.detail-top nav button{padding:0 8px;font-size:11px}.detail-heading{align-items:flex-start;flex-direction:column;gap:8px;margin-top:20px}.detail-heading h2{font-size:44px}.detail-ranges{align-self:flex-end}.detail-chart svg{min-height:170px}.recovery-pending{padding:22px 0}}@media(prefers-reduced-motion:reduce){.domain-detail{animation:none}}
</style>
<style scoped>.journey-summary{display:flex;gap:28px;padding:4px 0 8px;color:#6b818c;font-size:11px}.journey-summary b{font-weight:400;font-size:18px;margin-left:5px;color:var(--accent)}.chart-point{cursor:pointer}.chart-point:focus-visible{outline:2px solid var(--accent)}@media(max-width:700px){svg text{font-size:26px}}</style>
