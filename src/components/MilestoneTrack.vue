<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
const props = defineProps<{ days: number }>()
const milestones = [1, 3, 7, 14, 30]
const complete = (day: number) => props.days >= day
const nextMilestone = computed(() => milestones.find((day) => day > props.days) ?? null)
const nextLabel = computed(() => nextMilestone.value ? `距离 ${nextMilestone.value} 天还差 ${nextMilestone.value-props.days} 天` : '30 天里程碑已达成')
const celebrating=ref(false)
onMounted(()=>{if(!milestones.includes(props.days)||typeof window==='undefined')return;const key=`quit-smoking-milestone-seen-${props.days}`;if(window.localStorage.getItem(key))return;celebrating.value=true;window.localStorage.setItem(key,'1');window.setTimeout(()=>{celebrating.value=false},1200)})
</script>

<template>
  <section class="milestone-track" :class="{celebrating}">
    <header><div><span>戒烟里程碑</span><b>{{ nextLabel }}</b></div><strong>{{ days }} 天</strong></header>
    <div class="track-scroll">
      <div class="track">
        <span class="progress" :style="{ width: `${Math.min(days / 30 * 100, 100)}%` }"></span>
        <div v-for="day in milestones" :key="day" class="node" :class="{ complete: complete(day), next:nextMilestone===day }">
          <i><van-icon v-if="complete(day)" name="success" /><template v-else>{{ day }}</template></i>
          <small>{{ day }} 天</small>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.milestone-track{overflow:hidden;margin-top:14px;padding:18px 18px 16px;border-radius:20px;background:linear-gradient(125deg,#e4f1e7,#f7fbf8);box-shadow:0 9px 28px rgba(39,91,59,.07)}
header{display:flex;align-items:flex-end;justify-content:space-between}header div{display:flex;flex-direction:column;gap:4px}header span{color:var(--green-700);font-size:11px;font-weight:700}header b{font-size:15px}header strong{color:var(--green-900);font-size:24px}
.track-scroll{overflow-x:auto;padding:19px 2px 4px;scrollbar-width:none}.track-scroll::-webkit-scrollbar{display:none}
.track{position:relative;display:flex;min-width:390px;justify-content:space-between}.track:before,.progress{content:"";position:absolute;z-index:0;left:20px;top:14px;height:3px;border-radius:9px;background:#d5ded8}.track:before{right:20px}.progress{right:auto;max-width:calc(100% - 40px);background:linear-gradient(90deg,#78ba89,#2f8150);transition:width .6s ease}
.node{position:relative;z-index:1;display:flex;width:40px;align-items:center;flex-direction:column;gap:7px;color:#8a958f}.node>i{display:grid;width:31px;height:31px;place-items:center;border:3px solid #e5ebe7;border-radius:50%;background:#fff;font-size:10px;font-style:normal}.node.complete{color:var(--green-700)}.node.complete>i{border-color:#fff;background:var(--green-700);box-shadow:0 0 0 1px rgba(47,129,80,.18);color:#fff}.node small{white-space:nowrap;font-size:10px}
.node.next>i{border-color:#9acaa7;box-shadow:0 0 0 0 rgba(73,151,96,.2);animation:next-pulse 2.6s ease-out infinite}@keyframes next-pulse{55%,100%{box-shadow:0 0 0 8px rgba(73,151,96,0)}}
@media(prefers-reduced-motion:reduce){.progress{transition:none}.node.next>i{animation:none}}
.celebrating:after{content:"";position:absolute;inset:0;border-radius:20px;box-shadow:inset 0 0 0 2px rgba(74,154,98,.3);animation:celebrate-ring 1.1s ease-out both;pointer-events:none}.milestone-track{position:relative}@keyframes celebrate-ring{0%{opacity:0;transform:scale(.98)}35%{opacity:1}100%{opacity:0;transform:scale(1.02)}}@media(prefers-reduced-motion:reduce){.celebrating:after{display:none}}
</style>
