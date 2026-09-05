<script setup lang="ts">
import { computed,onMounted,ref } from 'vue'
import { showFailToast } from 'vant'
import { useRoute,useRouter } from 'vue-router'
import AppTabbar from '@/components/AppTabbar.vue'
import BaselineComparison from '@/components/BaselineComparison.vue'
import MetricTrendChart from '@/components/MetricTrendChart.vue'
import SavingsAreaChart from '@/components/SavingsAreaChart.vue'
import SmokingHeatmap from '@/components/SmokingHeatmap.vue'
import TimeRangeSelector from '@/components/TimeRangeSelector.vue'
import { useFamilyStore } from '@/stores/family'
import { useSmokingStore } from '@/stores/smoking'
import type { FamilyQuitterSummary } from '@/types/domain'
import { buildBaselineComparison,buildHeatmapData,buildSavingsTrend,buildSmokingTrend,type HeatmapPoint,type TimeRange } from '@/utils/visualization'

const familyStore=useFamilyStore();const smokingStore=useSmokingStore();const route=useRoute();const router=useRouter()
const loading=ref(true);const loadFailed=ref(false);const activeSection=ref(0)
const timeRange=ref<TimeRange>('30d');const metric=ref<'smoking'|'craving'>('smoking');const chartType=ref<'line'|'bar'>('line');const selectedDay=ref<HeatmapPoint|null>(null);const dayPopupOpen=ref(false)
const ownSummary=computed<FamilyQuitterSummary|undefined>(()=>{const member=familyStore.currentMember;if(!member||!smokingStore.smokingProfile||!smokingStore.statistics)return undefined;return{member,smokingProfile:smokingStore.smokingProfile,todayCheckin:smokingStore.todayCheckin,statistics:smokingStore.statistics,trendData:smokingStore.trendData,checkins:smokingStore.checkins,loadFailed:false}})
const familyQuitterSummaries=computed(()=>familyStore.members.filter(member=>member.role==='quitter').map(member=>familyStore.quitterSummaries[member.userId]).filter((summary):summary is FamilyQuitterSummary=>Boolean(summary)))
const activeSummary=computed(()=>familyStore.isQuitter?ownSummary.value:familyStore.selectedQuitter?familyStore.quitterSummaries[familyStore.selectedQuitter.userId]:familyQuitterSummaries.value[0])
const trendPoints=computed(()=>activeSummary.value?.smokingProfile?buildSmokingTrend(activeSummary.value.checkins,activeSummary.value.smokingProfile,timeRange.value):[])
const heatmapPoints=computed(()=>activeSummary.value?.smokingProfile?buildHeatmapData(activeSummary.value.checkins,activeSummary.value.smokingProfile,timeRange.value):[])
const savingsPoints=computed(()=>activeSummary.value?.smokingProfile?buildSavingsTrend(activeSummary.value.checkins,activeSummary.value.smokingProfile,timeRange.value):[])
const comparison=computed(()=>activeSummary.value?.smokingProfile?buildBaselineComparison(activeSummary.value.checkins,activeSummary.value.smokingProfile,timeRange.value):{expected:0,actual:0,reduction:null})
const coverage=computed(()=>heatmapPoints.value.length===0?0:heatmapPoints.value.filter(point=>point.status!=='missing').length/heatmapPoints.value.length)
const latestSavings=computed(()=>savingsPoints.value[savingsPoints.value.length-1]??{savedCigarettes:0,savedMoney:0})
function formatAverage(value:number|null){return value===null?'—':`${value.toFixed(1)} 支`}
function formatReduction(value:number|null){return value===null?'暂无数据':`${value>=0?'↓':'↑'} ${Math.abs(value*100).toFixed(0)}%`}
function openDay(point:HeatmapPoint){selectedDay.value=point;dayPopupOpen.value=true}
async function loadPage(){loading.value=true;loadFailed.value=false;try{await familyStore.initializeFamily();if(familyStore.isQuitter)await smokingStore.ensureStatisticsLoaded();else{await familyStore.loadQuitterSummaries();const requested=typeof route.query.member==='string'?route.query.member:'';familyStore.selectQuitter(requested||familyStore.selectedQuitterId)}}catch(error:unknown){console.error('加载趋势失败',error);loadFailed.value=true;showFailToast('加载失败，请检查网络后重试')}finally{loading.value=false}}
function selectTrendQuitter(userId:string|number){const id=String(userId);familyStore.selectQuitter(id);void router.replace({query:{...route.query,member:id}})}
onMounted(loadPage)
</script>

<template>
  <main class="page trend-page">
    <div v-if="loading" class="state"><van-loading/>正在加载趋势…</div>
    <section v-else-if="loadFailed" class="card state"><span>暂时无法读取趋势</span><van-button plain round type="primary" @click="loadPage">重新加载</van-button></section>
    <template v-else>
      <header class="page-heading"><div><span>{{familyStore.currentFamily?.name}}</span><h1>趋势</h1></div><div v-if="activeSummary" class="viewer"><span>{{activeSummary.member.nickname.slice(0,1)}}</span><div><small>正在查看</small><b>{{activeSummary.member.nickname}}</b></div></div></header>
      <van-tabs v-if="familyStore.isSupporter&&familyQuitterSummaries.length>1" :active="familyStore.selectedQuitterId" class="member-tabs" shrink @change="selectTrendQuitter"><van-tab v-for="summary in familyQuitterSummaries" :key="summary.member.userId" :name="summary.member.userId" :title="summary.member.nickname"/></van-tabs>
      <template v-if="activeSummary?.statistics&&activeSummary.smokingProfile">
        <van-tabs v-model:active="activeSection" class="section-tabs" animated swipeable><van-tab title="趋势"/><van-tab title="日历"/><van-tab title="成果"/></van-tabs>
        <TimeRangeSelector v-model="timeRange" class="range" />
        <section v-if="activeSection===0" class="tab-content">
          <div class="toolbar"><div class="segmented"><button :class="{active:metric==='smoking'}" @click="metric='smoking'">吸烟支数</button><button :class="{active:metric==='craving'}" @click="metric='craving'">烟瘾程度</button></div><div class="chart-toggle"><button :class="{active:chartType==='line'}" aria-label="折线图" @click="chartType='line'"><van-icon name="chart-trending-o"/></button><button :class="{active:chartType==='bar'}" aria-label="柱状图" @click="chartType='bar'"><van-icon name="bar-chart-o"/></button></div></div>
          <section class="card chart-card"><div class="card-heading"><h2>{{metric==='smoking'?'吸烟趋势':'烟瘾趋势'}}</h2><span>{{timeRange==='all'?'全部记录':timeRange}}</span></div><MetricTrendChart :points="trendPoints" :metric="metric" :chart-type="chartType" /></section>
          <section class="summary-grid"><article><span>近 7 日均值</span><b>{{formatAverage(activeSummary.statistics.recordedAverage7Days)}}</b><small>{{formatReduction(activeSummary.statistics.reductionRate7Days)}}</small></article><article><span>近 30 日均值</span><b>{{formatAverage(activeSummary.statistics.recordedAverage30Days)}}</b><small>{{formatReduction(activeSummary.statistics.reductionRate30Days)}}</small></article></section>
        </section>
        <section v-else-if="activeSection===1" class="tab-content">
          <section class="card heatmap-card"><div class="card-heading"><h2>戒烟日历</h2><span>{{(coverage*100).toFixed(0)}}% 覆盖</span></div><SmokingHeatmap :points="heatmapPoints" @select="openDay" /></section>
          <section class="calendar-stats"><article><span>当前连续</span><b>{{activeSummary.statistics.currentStreak}} 天</b></article><article><span>最长连续</span><b>{{activeSummary.statistics.longestStreak}} 天</b></article><article><span>记录覆盖</span><b>{{(coverage*100).toFixed(0)}}%</b></article></section>
        </section>
        <section v-else class="tab-content">
          <section class="card savings-card"><div class="card-heading"><div><span>累计节省</span><h2>¥{{latestSavings.savedMoney.toFixed(2)}}</h2></div><b>{{latestSavings.savedCigarettes}} 支</b></div><SavingsAreaChart :points="savingsPoints" /></section>
          <section class="card comparison-card"><div class="card-heading"><h2>理论 vs 实际</h2><span>{{timeRange==='all'?'全部':timeRange}}</span></div><BaselineComparison v-bind="comparison" /></section>
        </section>
      </template>
      <section v-else class="card empty">{{activeSummary?.loadFailed?'戒烟数据加载失败':'尚未完成戒烟设置'}}</section>
    </template>
    <van-popup v-model:show="dayPopupOpen" round position="bottom"><section v-if="selectedDay" class="day-sheet"><span>每日记录</span><div><h2>{{selectedDay.date}}</h2><b>{{selectedDay.status==='missing'?'未记录':selectedDay.cigarettes===0?'无烟':`${selectedDay.cigarettes} 支`}}</b></div><p><van-icon name="fire-o"/> 烟瘾 {{selectedDay.craving??'—'}} / 5</p><blockquote v-if="selectedDay.note">{{selectedDay.note}}</blockquote></section></van-popup>
    <AppTabbar/>
  </main>
</template>

<style scoped>
.trend-page{max-width:480px;margin:auto}.page-heading{display:flex;align-items:center;justify-content:space-between;margin:3px 2px 14px}.page-heading>div:first-child span{color:var(--text-muted);font-size:12px}.page-heading h1{margin:2px 0 0;font-size:27px}.viewer{display:flex;align-items:center;gap:8px}.viewer>span{display:grid;width:38px;height:38px;place-items:center;border-radius:50%;background:var(--green-100);color:var(--green-700);font-weight:800}.viewer div{display:flex;flex-direction:column}.viewer small{color:var(--text-muted);font-size:10px}.viewer b{font-size:13px}.member-tabs{margin-bottom:10px}.section-tabs{margin:0 -16px}.range{margin:13px 0}.tab-content{padding-bottom:4px}.toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.segmented,.chart-toggle{display:flex;gap:4px;padding:3px;border-radius:12px;background:#eaf0ec}.segmented button,.chart-toggle button{border:0;border-radius:9px;padding:7px 10px;background:transparent;color:#748078;font-size:12px}.segmented button.active,.chart-toggle button.active{background:#fff;color:var(--green-700);box-shadow:0 2px 7px rgba(25,55,43,.08)}.chart-card,.heatmap-card,.savings-card,.comparison-card{padding:18px 12px 12px}.card-heading{display:flex;align-items:center;justify-content:space-between;padding:0 7px 8px}.card-heading h2{margin:0;font-size:18px}.card-heading span{color:var(--text-muted);font-size:12px}.summary-grid,.calendar-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.summary-grid article,.calendar-stats article{display:flex;min-height:104px;flex-direction:column;justify-content:center;padding:15px;border-radius:18px;background:#fff;box-shadow:var(--shadow)}.summary-grid span,.calendar-stats span{color:var(--text-muted);font-size:12px}.summary-grid b,.calendar-stats b{margin:8px 0 3px;font-size:22px}.summary-grid small{color:var(--green-700)}.heatmap-card{padding:18px}.day-detail{margin-top:16px;padding:14px;border-radius:14px;background:#f5f8f6}.day-detail>div{display:flex;justify-content:space-between}.day-detail span{color:var(--green-700);font-size:12px}.day-detail p{margin:8px 0 3px;font-size:13px}.day-detail small{color:var(--text-muted)}.calendar-stats{grid-template-columns:repeat(3,1fr)}.calendar-stats article{min-height:92px;padding:12px}.calendar-stats b{font-size:18px}.savings-card .card-heading>div span{color:var(--green-700)}.savings-card .card-heading h2{margin-top:4px;font-size:28px}.savings-card .card-heading>b{font-size:13px;color:var(--green-700)}.comparison-card{margin-top:12px;padding:18px}.state{display:flex;min-height:60vh;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text-muted)}.empty{text-align:center;color:var(--text-muted)}
.day-sheet{max-width:480px;min-height:220px;margin:auto;padding:24px 20px calc(30px + env(safe-area-inset-bottom))}.day-sheet>span{color:var(--green-700);font-size:12px;font-weight:700}.day-sheet>div{display:flex;align-items:center;justify-content:space-between}.day-sheet h2{font-size:24px}.day-sheet b{color:var(--green-700);font-size:18px}.day-sheet p{color:var(--text-muted)}.day-sheet blockquote{margin:16px 0 0;padding:14px;border-radius:14px;background:#f3f7f4;color:#526159;font-size:13px}.chart-card{background:linear-gradient(155deg,#fff,#f7fbf8)}
</style>
