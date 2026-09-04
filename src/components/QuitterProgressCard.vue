<script setup lang="ts">
import type { FamilyQuitterSummary } from '@/types/domain'

defineProps<{
  summary?: FamilyQuitterSummary
  loading?: boolean
  isCurrentUser?: boolean
  showEncourage?: boolean
}>()

defineEmits<{ trend: []; encourage: [] }>()
</script>

<template>
  <article class="progress-card">
    <div v-if="loading && !summary" class="progress-state"><van-loading size="20" /> 正在读取戒烟进展…</div>
    <p v-else-if="summary?.loadFailed" class="progress-state error">戒烟数据加载失败</p>
    <template v-else-if="summary">
      <header>
        <div class="person">
          <div class="avatar">{{ summary.member.nickname.slice(0, 1) }}</div>
          <div>
          <div class="name">{{ summary.member.nickname }}<span v-if="isCurrentUser">（我）</span></div>
          <span class="role">戒烟者</span>
          </div>
        </div>
        <span v-if="summary.todayCheckin" class="today-pill">今日 {{ summary.todayCheckin.cigarettes }} 支</span>
        <span v-else class="today-pill missing">今日未打卡</span>
      </header>
      <p v-if="!summary.smokingProfile" class="progress-state">尚未完成戒烟设置</p>
      <template v-else-if="summary.statistics">
        <div class="streak"><span>连续无烟</span><div><strong>{{ summary.statistics.currentStreak }}</strong><em>天</em></div></div>
        <div class="metrics">
          <div><span>累计少吸</span><b>{{ summary.statistics.savedCigarettes }} 支</b></div>
          <div><span>累计节省</span><b>¥{{ summary.statistics.savedMoney.toFixed(2) }}</b></div>
        </div>
        <div class="actions">
          <button class="secondary" @click="$emit('trend')">查看趋势</button>
          <button v-if="showEncourage" class="primary" @click="$emit('encourage')">去鼓励</button>
        </div>
      </template>
    </template>
  </article>
</template>

<style scoped>
.progress-card{position:relative;overflow:hidden;background:linear-gradient(145deg,#e8f4e9,#f9fcf9 70%);border-radius:22px;padding:20px;box-shadow:0 12px 34px rgba(36,91,58,.1)}.progress-card:after{content:"";position:absolute;width:150px;height:150px;right:-55px;top:-75px;border-radius:50%;background:rgba(255,255,255,.5)}header{position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.person{display:flex;align-items:center;gap:11px}.avatar{display:grid;width:42px;height:42px;place-items:center;border:3px solid rgba(255,255,255,.8);border-radius:50%;background:#d9ebe0;color:var(--green-700);font-size:17px;font-weight:800}.name{font-size:19px;font-weight:750}.name span{color:var(--text-muted);font-size:12px;font-weight:500}.role{display:block;margin-top:3px;color:var(--text-muted);font-size:12px}.today-pill{flex:none;padding:7px 10px;border-radius:999px;background:#d7ebdd;color:var(--green-700);font-size:12px}.today-pill.missing{background:#eef1ef;color:#7c8794}.streak{margin:24px 0 18px}.streak>span{color:#718078;font-size:13px}.streak div{margin-top:5px}.streak strong{font-size:48px;line-height:1;color:var(--green-900);letter-spacing:-.05em}.streak em{margin-left:7px;font-style:normal;font-size:16px}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px}.metrics div{display:flex;flex-direction:column;gap:6px;padding:13px;background:rgba(255,255,255,.78);border-radius:15px}.metrics span{color:#7c8794;font-size:12px}.metrics b{font-size:19px}.actions{display:flex;gap:10px;margin-top:18px}.actions button{flex:1;border:0;border-radius:14px;padding:12px;font-weight:700}.secondary{background:rgba(255,255,255,.78);color:var(--green-700)}.primary{background:var(--green-700);color:white}.progress-state{display:flex;justify-content:center;gap:8px;padding:28px 0;color:#7c8794}.progress-state.error{color:#c45454}
.streak strong{font-size:56px}
</style>
