<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import AppTabbar from '@/components/AppTabbar.vue'
import CigaretteHero from '@/components/CigaretteHero.vue'
import QuitterProgressCard from '@/components/QuitterProgressCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import StatCard from '@/components/StatCard.vue'
import MilestoneTrack from '@/components/MilestoneTrack.vue'
import { useAuthStore } from '@/stores/auth'
import { useEncouragementStore } from '@/stores/encouragement'
import { useFamilyStore } from '@/stores/family'
import { useSmokingStore } from '@/stores/smoking'
import type { FamilyQuitterSummary } from '@/types/domain'
import type { DailySmokingStatus } from '@/types/domain'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()
const smokingStore = useSmokingStore()
const encouragementStore = useEncouragementStore()
const loading = ref(true)
const loadFailed = ref(false)

const selfSummary = computed<FamilyQuitterSummary | undefined>(() => {
  const member = familyStore.currentMember
  if (!member || !smokingStore.smokingProfile || !smokingStore.statistics) return undefined
  return { member, smokingProfile: smokingStore.smokingProfile, todayCheckin: smokingStore.todayCheckin, statistics: smokingStore.statistics, trendData: smokingStore.trendData, checkins: smokingStore.checkins, loadFailed: false }
})
const featuredFamilySummary = computed(() => {
  const quitter = familyStore.members.find((member) => member.role === 'quitter')
  return quitter ? familyStore.quitterSummaries[quitter.userId] : undefined
})
const encouragementCount = computed(() => encouragementStore.items.filter((item) => item.toUserId === authStore.user?.id).length)
const todayStatus = computed<DailySmokingStatus>(() => {
  if (!smokingStore.todayCheckin) return 'missing'
  return smokingStore.todayCheckin.cigarettes === 0 ? 'zero' : 'smoked'
})
const todayLabel = computed(() => smokingStore.todayCheckin ? `${smokingStore.todayCheckin.cigarettes} 支` : '未记录')

async function loadPage() {
  loading.value = true
  loadFailed.value = false
  try {
    await familyStore.initializeFamily()
    const familyId = familyStore.currentFamily?.id
    if (familyStore.isQuitter) {
      await smokingStore.ensureStatisticsLoaded()
    } else {
      await familyStore.loadQuitterSummaries()
    }
    if (familyId) await encouragementStore.loadEncouragements(familyId)
  } catch (error: unknown) {
    console.error('加载首页失败', error)
    loadFailed.value = true
    showFailToast('加载失败，请检查网络后重试')
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <main class="page home">
    <div v-if="loading" class="state"><van-loading /> 正在加载…</div>
    <section v-else-if="loadFailed" class="card state"><span>暂时无法读取数据。</span><van-button plain round type="primary" @click="loadPage">重新加载</van-button></section>
    <template v-else>
      <template v-if="familyStore.isQuitter">
        <header class="brand-row"><div><b>无烟之家</b><span>{{ familyStore.currentFamily?.name }}</span></div><van-icon name="bell" size="22" /></header>
        <CigaretteHero :state="todayStatus==='zero'?'extinguished':todayStatus==='smoked'?'weak':'burning'" :nickname="familyStore.currentMember?.nickname" />
        <section v-if="smokingStore.statistics" class="stat-grid">
          <StatCard class="streak-stat" label="连续无烟" :value="`${smokingStore.statistics.currentStreak} 天`" icon="calendar-o" tone="accent" featured />
          <StatCard label="今日" :value="todayLabel" icon="clock-o" />
          <StatCard label="累计少吸" :value="`${smokingStore.statistics.savedCigarettes} 支`" icon="bar-chart-o" tone="borderless" />
          <StatCard label="节省" :value="`¥${smokingStore.statistics.savedMoney.toFixed(0)}`" icon="balance-o" tone="borderless" />
        </section>
        <MilestoneTrack v-if="smokingStore.statistics" :days="smokingStore.statistics.currentStreak" />
        <button class="checkin-cta" :disabled="smokingStore.statistics?.planDays === 0" @click="router.push('/checkin')">
          <van-icon :name="smokingStore.todayCheckin ? 'edit' : 'passed'" size="23" />
          <span>{{ smokingStore.todayCheckin ? '修改今日记录' : '今日打卡' }}</span>
          <van-icon name="arrow" />
        </button>
        <div class="quick-links"><button @click="router.push('/family')"><van-icon name="like-o" /><span><b>家人鼓励</b><small>{{ encouragementCount }} 条新陪伴</small></span><van-icon name="arrow" /></button><button @click="router.push('/trend')"><van-icon name="chart-trending-o" /><span><b>查看趋势</b><small>了解近期变化</small></span><van-icon name="arrow" /></button></div>
      </template>

      <template v-else>
        <header class="brand-row"><div><b>无烟之家</b><span>{{ familyStore.currentFamily?.name }}</span></div><van-icon name="bell" size="22" /></header>
        <section class="supporter-intro"><span>家庭陪伴</span><h1>你的支持，正在让改变发生</h1><p>每一次鼓励，都是戒烟路上的温柔助力。</p></section>
        <SectionHeader title="戒烟进展" caption="今日家庭状态" />
        <QuitterProgressCard
          v-if="featuredFamilySummary"
          :summary="featuredFamilySummary"
          show-encourage
          @trend="router.push('/trend')"
          @encourage="router.push('/family')"
        />
        <section v-else class="card empty">家庭中还没有戒烟者。</section>
      </template>
    </template>
    <AppTabbar />
  </main>
</template>

<style scoped>
.home{max-width:480px;margin:auto}.brand-row{display:flex;align-items:center;justify-content:space-between;margin:3px 2px 18px}.brand-row div{display:flex;flex-direction:column}.brand-row b{color:var(--green-900);font-size:22px;letter-spacing:-.04em}.brand-row span{margin-top:2px;color:var(--text-muted);font-size:12px}.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.checkin-cta{display:flex;width:100%;align-items:center;justify-content:center;gap:10px;border:0;border-radius:19px;padding:17px 18px;margin-top:14px;background:linear-gradient(135deg,#438e58,#2e7948);box-shadow:0 10px 24px rgba(43,121,72,.22);color:#fff}.checkin-cta span{flex:1;font-size:17px;font-weight:750}.checkin-cta:disabled{background:#aabbb3;box-shadow:none}.quick-links{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.quick-links button{display:flex;align-items:center;gap:9px;border:0;border-radius:18px;padding:15px;background:#fff;box-shadow:var(--shadow);color:var(--green-700);text-align:left}.quick-links button>span{display:flex;min-width:0;flex:1;flex-direction:column}.quick-links b{color:#26352e;font-size:14px}.quick-links small{margin-top:3px;color:var(--text-muted);font-size:11px}.supporter-intro{margin-bottom:6px;padding:26px 22px;border-radius:24px;background:linear-gradient(140deg,#e5f2e8,#f9fcfa);box-shadow:var(--shadow)}.supporter-intro span{color:var(--green-700);font-size:13px;font-weight:700}.supporter-intro h1{max-width:330px;margin:9px 0 7px;font-size:28px;line-height:1.25;letter-spacing:-.04em}.supporter-intro p{margin:0;color:var(--text-muted);font-size:14px}.state{display:flex;flex-direction:column;align-items:center;gap:12px;padding:70px 20px;color:var(--text-muted)}.empty{text-align:center;color:var(--text-muted)}
.home{position:relative}.streak-stat{grid-column:1/3}.streak-stat+*{background:linear-gradient(145deg,#fff,#f7faf8)}
</style>
