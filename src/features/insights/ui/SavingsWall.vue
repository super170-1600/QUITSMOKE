<script setup lang="ts">
import {computed} from 'vue'
import type {DailyPoint} from '../domain/types'
const props=defineProps<{points:DailyPoint[];selected?:string}>()
const emit=defineEmits<{select:[date:string]}>()
const maximum=computed(()=>Math.max(1,...props.points.map(point=>Math.abs(Number(point.estimatedAmount??0)))))
const ratio=(point:DailyPoint)=>Math.sqrt(Math.abs(Number(point.estimatedAmount??0))/maximum.value)
const layers=(point:DailyPoint)=>point.estimatedAmount===null||Number(point.estimatedAmount)===0?1:1+Math.round(ratio(point)*3)
const amount=(point:DailyPoint)=>point.estimatedAmount===null?'未记录':`¥ ${point.estimatedAmount}`
</script>
<template>
 <div class="savings-wall" role="group" aria-label="每日节省金额墙">
  <button v-for="point in points" :key="point.date" class="money-day" :class="{missing:point.estimatedAmount===null,zero:point.estimatedAmount!==null&&Number(point.estimatedAmount)===0,negative:Number(point.estimatedAmount)<0,chosen:selected===point.date}" :aria-pressed="selected===point.date" :aria-label="`${point.date}，${point.estimatedAmount===null?'缺少记录或估算条件':point.estimatedAmount+'元'}，查看明细`" @click="emit('select',point.date)">
   <div class="money-space">
    <svg v-if="point.estimatedAmount!==null" viewBox="0 0 190 128" aria-hidden="true" :style="{transform:`scale(${.62+.38*ratio(point)})`}">
     <g v-for="layer in layers(point)" :key="layer" :transform="`translate(${(layers(point)-layer)*4},${-(layers(point)-layer)*4}) rotate(${(layers(point)-layer)*2},95,66)`">
      <rect x="19" y="36" width="148" height="78" rx="10" class="note-shadow"/>
      <rect x="18" y="30" width="148" height="78" rx="10" class="note-paper"/>
      <rect x="25" y="37" width="134" height="64" rx="6" class="note-border"/>
      <path d="M31 54v-7h11m107 7v-7h-11M31 84v8h11m107-8v8h-11" class="note-ornament"/>
      <ellipse cx="92" cy="68" rx="28" ry="27" class="note-medal"/>
      <text x="92" y="80" text-anchor="middle" class="yuan-symbol">¥</text>
      <path d="M45 68h9m-9 6h9m-9 6h9m78-12h9m-9 6h9m-9 6h9" class="note-ornament"/>
      <circle cx="145" cy="88" r="3" class="note-stamp"/>
     </g>
    </svg>
    <span v-else class="empty-note" aria-hidden="true">—</span>
   </div>
   <strong>{{amount(point)}}</strong><time>{{point.date.slice(5)}}</time>
   <small v-if="Number(point.estimatedAmount)<0">超出基线</small>
  </button>
 </div>
</template>
<style scoped>
.savings-wall{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px 9px;padding:28px 16px 20px;background:radial-gradient(ellipse at 50% 0,#f4e5d94d,transparent 65%),linear-gradient(#fffaf5,#fff);border-top:1px solid #d6c4ac55;border-bottom:1px solid #d6c4ac55;border-radius:14px;max-height:52svh;overflow:auto}
.money-day{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;min-height:140px;padding:6px 2px 12px;border:1px solid transparent;border-radius:10px;background:transparent;color:#4d3937;cursor:pointer;font:inherit;transition:background .2s,transform .2s}
.money-space{display:grid;place-items:center;width:100%;height:91px;perspective:500px}.money-space svg{width:100%;max-width:175px;overflow:visible;transform-origin:50% 90%;filter:drop-shadow(0 6px 4px #68493a15)}
.note-paper{fill:#e6aca3;stroke:#b27870;stroke-width:1}.note-shadow{fill:#ac776f;opacity:.4}.note-border{fill:#f6d1c1;stroke:#c3937b;stroke-width:1}.note-medal{fill:#fff0d4;stroke:#bf956c;stroke-width:1.3}.note-ornament{fill:none;stroke:#ac7066;stroke-width:1.2;stroke-linecap:round}.note-stamp{fill:#a67b55}.yuan-symbol{fill:#956c48;font:34px Georgia,serif;font-weight:700}.money-day strong{font-size:13px;font-weight:500;line-height:1.4;margin-top:5px}.money-day time{font-size:10px;color:#71615a;margin-top:5px}.money-day small{font-size:9px;margin-top:4px;color:#785953}
.money-day:hover{background:#eddbcb33;transform:translateY(-2px)}.money-day.chosen{border-color:#b99066;background:#f8e8d75e;box-shadow:0 5px 18px #a4845814}.money-day:focus-visible{outline:2px solid #8e6e45;outline-offset:2px}
.zero .note-paper,.negative .note-paper{fill:#bdcad0;stroke:#81949e}.zero .note-border,.negative .note-border{fill:#e0e8e9;stroke:#a4b5bb}.zero .note-medal,.negative .note-medal{fill:#f2f3f0;stroke:#a4b5bb}.zero .note-ornament,.negative .note-ornament{stroke:#8b9da4}.zero .note-shadow,.negative .note-shadow{fill:#899ca5}.zero .yuan-symbol,.negative .yuan-symbol{fill:#7a8d95}
.empty-note{display:grid;place-items:center;width:80%;height:52px;border:1px dashed #c3c8c955;border-radius:8px;color:#a0a8ab}.missing strong{font-size:10px;color:#78858b}
@media(max-width:700px){.savings-wall{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 4px;padding:18px 8px;max-height:50svh}.money-day{min-height:120px}.money-space{height:80px}.money-day strong{font-size:12px}}
@media(prefers-reduced-motion:reduce){.money-day{transition:none}}
</style>
