<script setup lang="ts">
import { computed } from 'vue'
export type CigaretteHeroState = 'burning' | 'weak' | 'extinguished'
const props = defineProps<{ state: CigaretteHeroState; nickname?: string }>()

const title = computed(() => props.state === 'extinguished' ? '今天，无烟' : props.state === 'weak' ? '每一点减少都算数' : '今天也照顾好自己')
const caption = computed(() => props.state === 'extinguished' ? '做得很好，继续保持轻松的节奏' : props.state === 'weak' ? '已经记录，明天仍是新的开始' : '用十秒记录今天的状态')
</script>

<template>
  <section class="cigarette-hero" :class="`is-${state}`">
    <div class="hero-copy">
      <span>{{ nickname ? `${nickname}，` : '' }}戒烟进行中</span>
      <h1>{{ title }}</h1>
      <p>{{ caption }}</p>
    </div>
    <div class="visual" aria-hidden="true">
      <div class="smoke smoke-one"></div><div class="smoke smoke-two"></div><i class="spark spark-one"></i><i class="spark spark-two"></i>
      <svg viewBox="0 0 320 90" role="presentation">
        <defs><linearGradient id="paper" x1="0" x2="1"><stop stop-color="#f7ead9"/><stop offset="1" stop-color="#fffaf3"/></linearGradient><linearGradient id="ember" x1="0" x2="1"><stop stop-color="#f9c56f"/><stop offset=".5" stop-color="#e36b32"/><stop offset="1" stop-color="#5f483c"/></linearGradient></defs>
        <rect x="24" y="42" width="88" height="21" rx="5" fill="#d69750"/><path d="M24 46h88M24 58h88" stroke="#bd7d3d" opacity=".45"/>
        <rect x="112" y="42" width="144" height="21" rx="4" fill="url(#paper)"/><rect class="ember" x="252" y="42" width="18" height="21" rx="3" fill="url(#ember)"/>
        <path class="ash" d="M270 43l24 4 7 10-31 6z" fill="#706961"/><path d="M276 48l12 3M281 57l13-1" stroke="#b8aea3" stroke-width="2"/>
      </svg>
    </div>
    <div class="status-chip"><span><van-icon v-if="state==='extinguished'" name="success" /></span>{{ state === 'extinguished' ? '已熄灭' : state === 'weak' ? '正在熄灭' : '等待今日记录' }}</div>
  </section>
</template>

<style scoped>
.cigarette-hero{position:relative;min-height:258px;overflow:hidden;border-radius:24px;padding:24px;background:radial-gradient(circle at 84% 12%,rgba(255,255,255,.95),transparent 34%),linear-gradient(145deg,#eef7f0,#fff 62%);box-shadow:0 14px 40px rgba(31,71,53,.07)}.hero-copy{position:relative;z-index:2}.hero-copy>span{color:var(--green-700);font-size:13px;font-weight:700}.hero-copy h1{margin:7px 0 5px;font-size:29px;line-height:1.2;letter-spacing:-.04em}.hero-copy p{margin:0;color:var(--text-muted);font-size:14px}.visual{position:absolute;left:8px;right:2px;bottom:30px;height:105px}.visual svg{position:absolute;inset:12px 0 0;width:100%;height:90px}.ember{transition:opacity .8s ease}.ash{transition:transform 1s ease;transform-origin:270px 52px}.smoke{position:absolute;z-index:1;width:30px;height:70px;left:77%;bottom:54px;border-radius:50%;border-left:7px solid rgba(142,151,145,.15);filter:blur(3px);animation:drift 4.8s ease-in-out infinite}.smoke-two{left:82%;height:56px;animation-delay:-2.2s}.spark{position:absolute;z-index:2;left:82%;bottom:46px;width:4px;height:4px;border-radius:50%;background:#f39a3f;animation:spark 2.2s ease-out infinite}.spark-two{animation-delay:-1.1s}.status-chip{position:absolute;right:18px;bottom:16px;display:flex;align-items:center;gap:8px;color:#607069;font-size:12px}.status-chip span{display:grid;width:18px;height:18px;place-items:center;border-radius:50%;background:#e28a43;color:#fff;box-shadow:0 0 0 5px rgba(226,138,67,.1);font-size:11px}.is-extinguished .ember{opacity:.12}.is-extinguished .ash{transform:translateX(-10px)}.is-extinguished .smoke{animation-duration:7s;opacity:.32}.is-extinguished .spark{display:none}.is-extinguished .status-chip span{background:var(--green-500);box-shadow:0 0 0 5px rgba(64,145,96,.1);animation:check-in .5s ease}.is-weak .ember{opacity:.48}.is-weak .spark{opacity:.35}.is-burning .ember{animation:ember-pulse 2s ease-in-out infinite}@keyframes drift{0%,100%{transform:translate(0,8px) scale(.9);opacity:.12}45%{transform:translate(-8px,-20px) scale(1.12);opacity:.38}80%{transform:translate(5px,-35px) scale(1.3);opacity:0}}@keyframes spark{0%{transform:translate(0,0);opacity:0}30%{opacity:.8}100%{transform:translate(16px,-18px);opacity:0}}@keyframes ember-pulse{50%{opacity:.7}}@keyframes check-in{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.18)}100%{transform:scale(1)}}@media(prefers-reduced-motion:reduce){.smoke,.spark,.ember,.status-chip span{animation:none!important}.ember,.ash{transition:none}}
</style>
