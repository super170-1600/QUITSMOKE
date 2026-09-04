<script setup lang="ts">
import { computed,onMounted,ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import BaselineComparison from '@/components/BaselineComparison.vue'
import CigaretteHero from '@/components/CigaretteHero.vue'
import FamilyMemberCard from '@/components/FamilyMemberCard.vue'
import MetricTrendChart from '@/components/MetricTrendChart.vue'
import SavingsAreaChart from '@/components/SavingsAreaChart.vue'
import SmokingHeatmap from '@/components/SmokingHeatmap.vue'
import StatCard from '@/components/StatCard.vue'
import TimeRangeSelector from '@/components/TimeRangeSelector.vue'
import MilestoneTrack from '@/components/MilestoneTrack.vue'
import DesktopLayout from '@/layouts/DesktopLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useEncouragementStore } from '@/stores/encouragement'
import { useFamilyStore } from '@/stores/family'
import { useSmokingStore } from '@/stores/smoking'
import type { DailySmokingStatus,FamilyQuitterSummary } from '@/types/domain'
import { formatEncouragementTime } from '@/utils/date'
import { getReactionEmoji } from '@/utils/encouragement'
import { buildBaselineComparison,buildHeatmapData,buildSavingsTrend,buildSmokingTrend,type HeatmapPoint,type TimeRange } from '@/utils/visualization'

const router=useRouter();const authStore=useAuthStore();const familyStore=useFamilyStore();const smokingStore=useSmokingStore();const encouragementStore=useEncouragementStore()
const loading=ref(true);const loadFailed=ref(false);const timeRange=ref<TimeRange>('30d');const selectedDay=ref<HeatmapPoint|null>(null)
const selfSummary=computed<FamilyQuitterSummary|undefined>(()=>{const member=familyStore.currentMember;if(!member||!smokingStore.smokingProfile||!smokingStore.statistics)return undefined;return{member,smokingProfile:smokingStore.smokingProfile,todayCheckin:smokingStore.todayCheckin,statistics:smokingStore.statistics,trendData:smokingStore.trendData,checkins:smokingStore.checkins,loadFailed:false}})
const featuredFamilySummary=computed(()=>{const quitter=familyStore.members.find(member=>member.role==='quitter');return quitter?familyStore.quitterSummaries[quitter.userId]:undefined})
const activeSummary=computed(()=>familyStore.isQuitter?selfSummary.value:featuredFamilySummary.value);const stats=computed(()=>activeSummary.value?.statistics)
const todayStatus=computed<DailySmokingStatus>(()=>{const checkin=activeSummary.value?.todayCheckin;return !checkin?'missing':checkin.cigarettes===0?'zero':'smoked'})
const todayLabel=computed(()=>activeSummary.value?.todayCheckin?`${activeSummary.value.todayCheckin.cigarettes} 支`:'未记录');const recentEncouragements=computed(()=>encouragementStore.items.slice(0,4))
const trendPoints=computed(()=>activeSummary.value?.smokingProfile?buildSmokingTrend(activeSummary.value.checkins,activeSummary.value.smokingProfile,timeRange.value):[])
const heatmapPoints=computed(()=>activeSummary.value?.smokingProfile?buildHeatmapData(activeSummary.value.checkins,activeSummary.value.smokingProfile,timeRange.value):[])
const savingsPoints=computed(()=>activeSummary.value?.smokingProfile?buildSavingsTrend(activeSummary.value.checkins,activeSummary.value.smokingProfile,timeRange.value):[])
const comparison=computed(()=>activeSummary.value?.smokingProfile?buildBaselineComparison(activeSummary.value.checkins,activeSummary.value.smokingProfile,timeRange.value):{expected:0,actual:0,reduction:null})
async function loadDashboard(){loading.value=true;loadFailed.value=false;try{await familyStore.initializeFamily();if(familyStore.isQuitter)await smokingStore.ensureStatisticsLoaded();else await familyStore.loadQuitterSummaries();if(familyStore.currentFamily)await encouragementStore.loadEncouragements(familyStore.currentFamily.id)}catch(error:unknown){console.error('加载桌面 Dashboard 失败',error);loadFailed.value=true;showFailToast('Dashboard 加载失败，请稍后重试')}finally{loading.value=false}}
onMounted(loadDashboard)
</script>

<template>
  <DesktopLayout>
    <template #toolbar><TimeRangeSelector v-model="timeRange" /></template>
    <div v-if="loading" class="dashboard-state"><van-loading size="24"/>正在准备家庭 Dashboard…</div>
    <div v-else-if="loadFailed" class="dashboard-state"><span>暂时无法读取数据</span><van-button type="primary" round @click="loadDashboard">重新加载</van-button></div>
    <div v-else-if="activeSummary&&stats&&activeSummary.smokingProfile" class="dashboard-grid">
      <section class="hero-panel"><CigaretteHero :state="todayStatus==='zero'?'extinguished':todayStatus==='smoked'?'weak':'burning'" :nickname="activeSummary.member.nickname"/><MilestoneTrack :days="stats.currentStreak"/><button v-if="familyStore.isQuitter" class="desktop-checkin" @click="router.push('/checkin')"><van-icon :name="activeSummary.todayCheckin?'edit':'passed'"/><span>{{activeSummary.todayCheckin?'修改今日记录':'完成今日打卡'}}</span><van-icon name="arrow"/></button></section>
      <section class="metrics-panel"><div class="panel-heading"><div><span>今日概览</span><h1>{{activeSummary.member.nickname}}的戒烟进展</h1></div><span class="role-chip">{{familyStore.isQuitter?'我的数据':'家庭戒烟者'}}</span></div><div class="desktop-stats"><StatCard label="连续无烟" :value="`${stats.currentStreak} 天`" icon="calendar-o" tone="accent" featured/><StatCard label="今日状态" :value="todayLabel" icon="clock-o"/><StatCard label="累计少吸" :value="`${stats.savedCigarettes} 支`" icon="bar-chart-o" tone="borderless"/><StatCard label="累计节省" :value="`¥${stats.savedMoney.toFixed(0)}`" icon="balance-o" tone="borderless"/></div></section>
      <section class="card trend-panel"><div class="section-heading"><div><span>数据趋势</span><h2>吸烟支数</h2></div><small>基线 {{activeSummary.smokingProfile.baselineDailyCigarettes}} 支</small></div><MetricTrendChart :points="trendPoints" metric="smoking" chart-type="line"/></section>
      <section class="card heatmap-panel"><div class="section-heading"><div><span>戒烟日历</span><h2>每日状态</h2></div><small>{{timeRange==='all'?'全部':timeRange}}</small></div><SmokingHeatmap :points="heatmapPoints" @select="selectedDay=$event"/><div v-if="selectedDay" class="desktop-day"><b>{{selectedDay.date}}</b><span>{{selectedDay.status==='missing'?'未记录':`${selectedDay.cigarettes} 支 · 烟瘾 ${selectedDay.craving}/5`}}</span></div></section>
      <section class="card savings-panel"><div class="section-heading"><div><span>健康成果</span><h2>累计节省 ¥{{(savingsPoints[savingsPoints.length-1]?.savedMoney??0).toFixed(2)}}</h2></div></div><SavingsAreaChart :points="savingsPoints"/></section>
      <section class="card comparison-panel"><div class="section-heading"><div><span>用量对比</span><h2>理论 vs 实际</h2></div></div><BaselineComparison v-bind="comparison"/></section>
      <section class="card family-panel"><div class="section-heading"><div><span>共同陪伴</span><h2>家庭成员</h2></div><small>{{familyStore.members.length}} 人</small></div><FamilyMemberCard v-for="member in familyStore.members" :key="member.id" :member="member" :is-current-user="member.userId===authStore.user?.id"/></section>
      <section class="card encouragement-panel"><div class="section-heading"><div><span>温柔支持</span><h2>最近鼓励</h2></div><small>{{encouragementStore.items.length}} 条</small></div><p v-if="recentEncouragements.length===0" class="empty">还没有鼓励</p><article v-for="item in recentEncouragements" v-else :key="item.id"><div class="encouragement-avatar">{{item.fromNickname.slice(0,1)}}</div><div><b>{{item.fromNickname}}</b><p>{{item.type==='message'?item.message:getReactionEmoji(item.type)}}</p></div><time>{{formatEncouragementTime(item.createdAt)}}</time></article></section>
    </div>
    <section v-else class="card dashboard-state">家庭中还没有可展示的戒烟数据。</section>
  </DesktopLayout>
</template>

<style scoped>
.dashboard-grid{display:grid;grid-template-columns:300px minmax(460px,1.3fr) minmax(300px,.8fr);gap:16px}.hero-panel{grid-row:1/3}.hero-panel :deep(.cigarette-hero){min-height:390px}.desktop-checkin{display:flex;width:100%;height:50px;align-items:center;gap:10px;margin-top:12px;padding:0 17px;border:0;border-radius:16px;background:var(--green-700);color:#fff}.desktop-checkin span{flex:1;font-weight:700}.metrics-panel{grid-column:2/4}.panel-heading,.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.panel-heading{margin:2px 2px 12px}.panel-heading span,.section-heading span{color:var(--green-700);font-size:11px;font-weight:700}.panel-heading h1{margin:3px 0 0;font-size:24px}.role-chip{padding:7px 10px;border-radius:99px;background:var(--green-100)}.desktop-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.desktop-stats :deep(.stat-card){min-height:112px}.trend-panel{grid-column:2;padding:18px}.heatmap-panel{grid-column:3;padding:18px}.section-heading h2{margin:3px 0 0;font-size:17px}.section-heading small{color:var(--text-muted);font-size:11px}.trend-panel :deep(.metric-chart){height:255px}.desktop-day{display:flex;justify-content:space-between;margin-top:12px;padding:10px;border-radius:12px;background:#f4f7f5;font-size:11px}.desktop-day span{color:var(--text-muted)}.savings-panel{grid-column:1/3;padding:18px}.savings-panel :deep(.savings-chart){height:220px}.comparison-panel{grid-column:3;padding:18px}.comparison-panel :deep(.comparison){margin-top:42px}.family-panel{grid-column:1/2;padding:18px}.encouragement-panel{grid-column:2/4;padding:18px}.encouragement-panel article{display:inline-flex;width:50%;align-items:flex-start;gap:9px;padding:10px}.encouragement-avatar{display:grid;flex:0 0 32px;width:32px;height:32px;place-items:center;border-radius:50%;background:var(--green-100);color:var(--green-700);font-weight:700}.encouragement-panel article>div:nth-child(2){min-width:0;flex:1}.encouragement-panel b{font-size:12px}.encouragement-panel p{overflow:hidden;margin:3px 0 0;color:#56635d;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.encouragement-panel time{color:var(--text-muted);font-size:10px}.empty{color:var(--text-muted)}.dashboard-state{display:flex;min-height:60vh;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:var(--text-muted)}@media(max-width:1200px){.dashboard-grid{grid-template-columns:280px 1fr}.metrics-panel{grid-column:2}.desktop-stats{grid-template-columns:1fr 1fr}.trend-panel,.heatmap-panel{grid-column:2}.savings-panel,.comparison-panel,.family-panel,.encouragement-panel{grid-column:1/3}.hero-panel{grid-row:1/3}}
.dashboard-grid{position:relative}.dashboard-grid:before{content:"";position:fixed;z-index:0;width:430px;height:430px;right:-110px;top:90px;border-radius:50%;background:radial-gradient(circle,rgba(116,185,134,.11),transparent 68%);pointer-events:none}.dashboard-grid>*{position:relative;z-index:1}.desktop-stats :deep(.featured){grid-column:span 2}.hero-panel :deep(.milestone-track){background:rgba(255,255,255,.6);box-shadow:none}.trend-panel{background:linear-gradient(150deg,#fff,#f7fbf8)}
</style>
