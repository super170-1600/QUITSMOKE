<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import AppTabbar from '@/components/AppTabbar.vue'
import CigaretteHero from '@/components/CigaretteHero.vue'
import QuitterProgressCard from '@/components/QuitterProgressCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import StatCard from '@/components/StatCard.vue'
import MilestoneTrack from '@/components/MilestoneTrack.vue'
import SupporterActivityCard from '@/components/SupporterActivityCard.vue'
import FamilyMomentCard from '@/components/FamilyMomentCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useEncouragementStore } from '@/stores/encouragement'
import { useFamilyStore } from '@/stores/family'
import { useSmokingStore } from '@/stores/smoking'
import { useMessageStore } from '@/stores/message'
import type { FamilyQuitterSummary } from '@/types/domain'
import type { DailySmokingStatus } from '@/types/domain'
import { selectLatestFamilySupport } from '@/utils/familyMoment'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()
const smokingStore = useSmokingStore()
const encouragementStore = useEncouragementStore()
const messageStore = useMessageStore()
const loading = ref(true)
const loadFailed = ref(false)
const familyActivityWarning = ref('')
const supporterActivityWarning = ref('')
const supporterActivityUnavailable = ref(false)

const selfSummary = computed<FamilyQuitterSummary | undefined>(() => {
  const member = familyStore.currentMember
  if (!member || !smokingStore.smokingProfile || !smokingStore.statistics) return undefined
  return { member, smokingProfile: smokingStore.smokingProfile, todayCheckin: smokingStore.todayCheckin, statistics: smokingStore.statistics, trendData: smokingStore.trendData, checkins: smokingStore.checkins, loadFailed: false }
})
const featuredFamilySummary = computed(() => {
  const quitter = familyStore.selectedQuitter
  return quitter ? familyStore.quitterSummaries[quitter.userId] : undefined
})
const familyActivityCount = computed(() => (
  messageStore.items.length
  + encouragementStore.items.filter((item) => item.toUserId === authStore.user?.id).length
))
const familyActivityCaption = computed(() => (
  familyActivityWarning.value || `${familyActivityCount.value} 条近期互动`
))
const profileInitial = computed(() => familyStore.currentMember?.nickname?.trim().slice(0, 1) || '我')
const latestFamilySupport = computed(() => authStore.user
  ? selectLatestFamilySupport(messageStore.items, encouragementStore.items, authStore.user.id)
  : null)
const todayStatus = computed<DailySmokingStatus>(() => {
  if (!smokingStore.todayCheckin) return 'missing'
  return smokingStore.todayCheckin.cigarettes === 0 ? 'zero' : 'smoked'
})
const todayLabel = computed(() => smokingStore.todayCheckin ? `${smokingStore.todayCheckin.cigarettes} 支` : '未记录')

async function loadPage() {
  loading.value = true
  loadFailed.value = false
  familyActivityWarning.value = ''
  supporterActivityWarning.value = ''
  supporterActivityUnavailable.value = false
  try {
    await familyStore.initializeFamily()
    const familyId = familyStore.currentFamily?.id
    if (familyStore.isQuitter) {
      await smokingStore.ensureStatisticsLoaded()
    } else {
      await familyStore.loadQuitterSummaries()
    }
    if (familyId) {
      const timelineResults = await Promise.allSettled([
        encouragementStore.loadEncouragements(familyId),
        messageStore.loadMessages(familyId),
      ])
      const encouragementsAvailable = timelineResults[0].status === 'fulfilled'
      const messagesAvailable = timelineResults[1].status === 'fulfilled'
      if (timelineResults[0].status === 'rejected') console.error('加载近期快捷鼓励失败', timelineResults[0].reason)
      if (timelineResults[1].status === 'rejected') console.error('加载近期家庭消息失败', timelineResults[1].reason)
      if (!encouragementsAvailable || !messagesAvailable) {
        familyActivityWarning.value = encouragementsAvailable || messagesAvailable
          ? '部分动态暂未加载'
          : '进入家庭空间'
      }
      if (familyStore.isSupporter) {
        const activityResults = await Promise.allSettled([
          encouragementStore.loadMyActivity(familyId),
          messageStore.loadMyActivity(familyId),
        ])
        const failedCount = activityResults.filter((result) => result.status === 'rejected').length
        activityResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(index === 0 ? '加载快捷鼓励记录失败' : '加载聊天陪伴记录失败', result.reason)
          }
        })
        supporterActivityUnavailable.value = failedCount === activityResults.length
        supporterActivityWarning.value = failedCount === activityResults.length
          ? '陪伴记录暂时无法加载'
          : failedCount > 0 ? '部分陪伴记录暂未加载' : ''
      }
      if (messagesAvailable) {
        messageStore.startRealtime(
          familyId,
          () => encouragementStore.loadEncouragements(familyId),
          () => familyStore.isSupporter
            ? familyStore.loadQuitterSummaries()
            : smokingStore.loadStatistics(),
        )
      }
    }
  } catch (error: unknown) {
    console.error('加载首页失败', error)
    loadFailed.value = true
    showFailToast('加载失败，请检查网络后重试')
  } finally {
    loading.value = false
  }
}

function openSelectedSupporterPage(path: '/trend' | '/family') {
  const memberId = featuredFamilySummary.value?.member.userId
  void router.push(memberId ? { path, query: { member: memberId } } : path)
}

onMounted(loadPage)
onBeforeUnmount(() => messageStore.stopRealtime())
</script>

<template>
  <main class="page home">
    <div v-if="loading" class="state"><van-loading /> 正在加载…</div>
    <section v-else-if="loadFailed" class="card state"><span>暂时无法读取数据。</span><van-button plain round type="primary" @click="loadPage">重新加载</van-button></section>
    <template v-else>
      <template v-if="familyStore.isQuitter">
        <header class="brand-row"><div><b>无烟之家</b><span>{{ familyStore.currentFamily?.name }}</span></div><button class="profile-shortcut" aria-label="打开我的页面" @click="router.push('/profile')">{{ profileInitial }}</button></header>
        <CigaretteHero :state="todayStatus==='zero'?'extinguished':todayStatus==='smoked'?'weak':'burning'" :nickname="familyStore.currentMember?.nickname" :streak="smokingStore.statistics?.currentStreak" />
        <button class="checkin-cta" :disabled="smokingStore.statistics?.planDays === 0" @click="router.push('/checkin')">
          <van-icon :name="smokingStore.todayCheckin ? 'edit' : 'passed'" size="23" />
          <span>{{ smokingStore.todayCheckin ? '修改今日记录' : '今日打卡' }}</span>
          <van-icon name="arrow" />
        </button>
        <section v-if="smokingStore.statistics" class="stat-grid">
          <StatCard class="today-stat" label="今日状态" :value="todayLabel" icon="clock-o" tone="accent" />
          <StatCard label="累计少吸" :numeric-value="smokingStore.statistics.savedCigarettes" suffix=" 支" icon="bar-chart-o" tone="borderless" />
          <StatCard label="节省" :numeric-value="smokingStore.statistics.savedMoney" prefix="¥" icon="balance-o" tone="borderless" />
        </section>
        <MilestoneTrack v-if="smokingStore.statistics" :days="smokingStore.statistics.currentStreak" />
        <FamilyMomentCard v-if="latestFamilySupport" :moment="latestFamilySupport" @open="router.push('/family')" />
        <div class="quick-links"><button @click="router.push('/family')"><van-icon name="chat-o" /><span><b>家庭动态</b><small>{{ familyActivityCaption }}</small></span><van-icon name="arrow" /></button><button @click="router.push('/trend')"><van-icon name="chart-trending-o" /><span><b>查看趋势</b><small>了解近期变化</small></span><van-icon name="arrow" /></button></div>
      </template>

      <template v-else>
        <header class="brand-row"><div><b>无烟之家</b><span>{{ familyStore.currentFamily?.name }}</span></div><button class="profile-shortcut" aria-label="打开我的页面" @click="router.push('/profile')">{{ profileInitial }}</button></header>
        <section class="supporter-intro"><span>家庭陪伴</span><h1>你的支持，正在让改变发生</h1><p>每一次鼓励，都是戒烟路上的温柔助力。</p></section>
        <SectionHeader title="戒烟进展" caption="今日家庭状态" />
        <div v-if="familyStore.quitterMembers.length > 1" class="supporter-switcher" aria-label="选择戒烟者">
          <button v-for="member in familyStore.quitterMembers" :key="member.id" :class="{ active: member.userId === featuredFamilySummary?.member.userId }" @click="familyStore.selectQuitter(member.userId)">{{ member.nickname }}</button>
        </div>
        <QuitterProgressCard
          v-if="featuredFamilySummary"
          :summary="featuredFamilySummary"
          show-encourage
          @trend="openSelectedSupporterPage('/trend')"
          @encourage="openSelectedSupporterPage('/family')"
        />
        <section v-else class="card empty">家庭中还没有戒烟者。</section>
        <SectionHeader title="我的陪伴记录" caption="支持也值得记录" />
        <SupporterActivityCard :items="encouragementStore.myItems" :total="encouragementStore.myTotal" :messages="messageStore.myItems" :message-total="messageStore.myTotal" :members="familyStore.members" :warning="supporterActivityWarning" :unavailable="supporterActivityUnavailable" compact @encourage="openSelectedSupporterPage('/family')" />
      </template>
    </template>
    <AppTabbar />
  </main>
</template>

<style scoped>
.home{max-width:480px;margin:auto}.brand-row{display:flex;align-items:center;justify-content:space-between;margin:3px 2px 18px}.brand-row div{display:flex;flex-direction:column}.brand-row b{color:var(--green-900);font-size:22px;letter-spacing:-.04em}.brand-row span{margin-top:2px;color:var(--text-muted);font-size:12px}.profile-shortcut{display:grid;width:40px;height:40px;place-items:center;border:1px solid rgba(46,121,72,.12);border-radius:14px;background:linear-gradient(145deg,#e0f0e4,#f7fbf8);box-shadow:0 6px 18px rgba(31,85,52,.08);color:var(--green-700);font-size:14px;font-weight:800}.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.checkin-cta{display:flex;width:100%;align-items:center;justify-content:center;gap:10px;border:0;border-radius:19px;padding:17px 18px;margin-top:14px;background:linear-gradient(135deg,#438e58,#2e7948);box-shadow:0 10px 24px rgba(43,121,72,.22);color:#fff}.checkin-cta span{flex:1;font-size:17px;font-weight:750}.checkin-cta:disabled{background:#aabbb3;box-shadow:none}.quick-links{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.quick-links button{display:flex;align-items:center;gap:9px;border:0;border-radius:18px;padding:15px;background:#fff;box-shadow:var(--shadow);color:var(--green-700);text-align:left}.quick-links button>span{display:flex;min-width:0;flex:1;flex-direction:column}.quick-links b{color:#26352e;font-size:14px}.quick-links small{margin-top:3px;color:var(--text-muted);font-size:11px}.supporter-intro{margin-bottom:6px;padding:26px 22px;border-radius:24px;background:linear-gradient(140deg,#e5f2e8,#f9fcfa);box-shadow:var(--shadow)}.supporter-intro span{color:var(--green-700);font-size:13px;font-weight:700}.supporter-intro h1{max-width:330px;margin:9px 0 7px;font-size:28px;line-height:1.25;letter-spacing:-.04em}.supporter-intro p{margin:0;color:var(--text-muted);font-size:14px}.state{display:flex;flex-direction:column;align-items:center;gap:12px;padding:70px 20px;color:var(--text-muted)}.empty{text-align:center;color:var(--text-muted)}
.home{position:relative}.today-stat{grid-column:1/3}.checkin-cta:not(:disabled):active,.quick-links button:active{transform:scale(.98)}
.supporter-switcher{display:flex;gap:7px;margin:-2px 0 10px;overflow-x:auto;scrollbar-width:none}.supporter-switcher button{border:1px solid #dce7df;border-radius:99px;padding:7px 13px;background:rgba(255,255,255,.8);color:var(--text-muted);font-size:11px}.supporter-switcher button.active{border-color:var(--green-500);background:var(--green-100);color:var(--green-700);font-weight:750}
</style>
