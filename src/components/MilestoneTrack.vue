<script setup lang="ts">
const props = defineProps<{ days: number }>()
const milestones = [1, 3, 7, 14, 30]
const complete = (day: number) => props.days >= day
</script>

<template>
  <section class="milestone-track">
    <header><div><span>戒烟里程碑</span><b>每一天都值得被看见</b></div><strong>{{ days }} 天</strong></header>
    <div class="track-scroll">
      <div class="track">
        <span class="progress" :style="{ width: `${Math.min(days / 30 * 100, 100)}%` }"></span>
        <div v-for="day in milestones" :key="day" class="node" :class="{ complete: complete(day) }">
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
.node{position:relative;z-index:1;display:flex;width:40px;align-items:center;flex-direction:column;gap:7px;color:#8a958f}.node i{display:grid;width:31px;height:31px;place-items:center;border:3px solid #e5ebe7;border-radius:50%;background:#fff;font-size:10px;font-style:normal}.node.complete{color:var(--green-700)}.node.complete i{border-color:#fff;background:var(--green-700);box-shadow:0 0 0 1px rgba(47,129,80,.18);color:#fff}.node small{white-space:nowrap;font-size:10px}
@media(prefers-reduced-motion:reduce){.progress{transition:none}}
</style>
