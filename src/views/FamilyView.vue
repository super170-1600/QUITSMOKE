<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import AppTabbar from '@/components/AppTabbar.vue'
import FamilyChat from '@/components/FamilyChat.vue'
import FamilyMemberCard from '@/components/FamilyMemberCard.vue'
import QuitterProgressCard from '@/components/QuitterProgressCard.vue'
import type { ReactionType } from '@/api/encouragement'
import { useAuthStore } from '@/stores/auth'
import { useEncouragementStore } from '@/stores/encouragement'
import { useFamilyStore } from '@/stores/family'
import { useMessageStore } from '@/stores/message'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const familyStore = useFamilyStore()
const encouragementStore = useEncouragementStore()
const messageStore = useMessageStore()
const loading = ref(true)
const loadFailed = ref(false)
const activityLoadFailed = ref(false)
const activityWarning = ref('')
const messageUnavailable = ref(false)
const leaving = ref(false)
const activeTab = ref<'activity' | 'members'>('activity')

const quitters = computed(() => familyStore.quitterMembers)
const activeQuitter = computed(() => familyStore.selectedQuitter)
const reactionTarget = computed(() => activeQuitter.value?.userId === authStore.user?.id
  ? undefined
  : activeQuitter.value)
const isFamilyCreator = computed(() => familyStore.currentFamily?.createdBy === authStore.user?.id)
const sendDisabled = computed(() => encouragementStore.sending)
function isReactionDisabled(type: ReactionType) {
  const target = reactionTarget.value
  return !target || encouragementStore.isReactionCoolingDown(target.userId, type)
}

async function loadActivity(familyId: string) {
  activityLoadFailed.value = false
  activityWarning.value = ''
  messageUnavailable.value = false
  const [encouragementResult, messageResult] = await Promise.allSettled([
    encouragementStore.loadEncouragements(familyId),
    messageStore.loadMessages(familyId),
  ])
  const encouragementFailed = encouragementResult.status === 'rejected'
  const messageFailed = messageResult.status === 'rejected'
  messageUnavailable.value = messageFailed
  if (encouragementFailed) console.error('加载快捷鼓励失败', encouragementResult.reason)
  if (messageFailed) console.error('加载家庭消息失败', messageResult.reason)
  activityLoadFailed.value = encouragementFailed && messageFailed
  if (!activityLoadFailed.value && (encouragementFailed || messageFailed)) {
    activityWarning.value = messageFailed
      ? '聊天暂时不可用，快捷鼓励仍可查看'
      : '快捷鼓励暂时不可用，文字消息仍可使用'
  }
  if (!messageFailed) {
    messageStore.startRealtime(
      familyId,
      () => encouragementStore.loadEncouragements(familyId),
      () => familyStore.loadQuitterSummaries(),
    )
  }
}

async function loadFamilyPage() {
  loading.value = true
  loadFailed.value = false
  try {
    await familyStore.refreshFamily()
    const familyId = familyStore.currentFamily?.id
    if (!familyId) return
    await familyStore.loadQuitterSummaries()
    const requestedMemberId = typeof route.query.member === 'string' ? route.query.member : ''
    familyStore.selectQuitter(requestedMemberId || familyStore.selectedQuitterId)
    await loadActivity(familyId)
  } catch (error: unknown) {
    console.error('加载家庭页失败', error)
    loadFailed.value = true
    showFailToast('加载家庭信息失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function sendText(content: string) {
  const familyId = familyStore.currentFamily?.id
  if (!familyId) return
  try {
    await messageStore.sendText(familyId, content, familyStore.currentMember?.nickname ?? '我')
  } catch (error: unknown) {
    console.error('发送家庭消息失败', error)
    showFailToast('消息发送失败，请稍后重试')
  }
}

async function sendReaction(type: ReactionType) {
  const familyId = familyStore.currentFamily?.id
  const target = reactionTarget.value
  if (!familyId || !target || sendDisabled.value) return
  try {
    await encouragementStore.sendReaction(familyId, target.userId, type, familyStore.currentMember?.nickname ?? '我')
    showSuccessToast('鼓励已送达')
  } catch (error: unknown) {
    console.error('发送表情鼓励失败', error)
    showFailToast('发送失败，请稍后重试')
  }
}

async function copyInviteCode() {
  try {
    if (!familyStore.inviteCode || !navigator.clipboard) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(familyStore.inviteCode)
    showSuccessToast('邀请码已复制')
  } catch (error: unknown) {
    console.error('复制邀请码失败', error)
    showFailToast('复制失败，请手动记录邀请码')
  }
}

async function leaveFamily() {
  if (leaving.value || !familyStore.currentFamily) return
  const lastMember = familyStore.members.length <= 1
  const message = lastMember
    ? '你是最后一位成员。退出后这个家庭及家庭动态会被删除，但你的个人戒烟设置和打卡记录会保留。'
    : isFamilyCreator.value
      ? '退出后，家庭管理权会自动移交给最早加入的家人。你的个人戒烟记录会保留。'
      : '退出后将无法查看这个家庭的进度和动态，你的个人戒烟记录会保留。'
  try {
    await showConfirmDialog({ title: `退出“${familyStore.currentFamily.name}”？`, message, confirmButtonText: '确认退出', confirmButtonColor: '#b84b45' })
  } catch {
    return
  }

  leaving.value = true
  try {
    await familyStore.leaveFamily()
    messageStore.reset()
    encouragementStore.reset()
    showSuccessToast('已退出家庭')
    await router.replace('/family/setup')
  } catch (error: unknown) {
    console.error('退出家庭失败', error)
    showFailToast('退出失败，请稍后重试')
  } finally {
    leaving.value = false
  }
}

function viewTrend() {
  if (!activeQuitter.value) return
  router.push({ path: '/trend', query: { member: activeQuitter.value.userId } })
}

function selectQuitter(userId: string) {
  familyStore.selectQuitter(userId)
  void router.replace({ query: { ...route.query, member: userId } })
}

onMounted(loadFamilyPage)
onBeforeUnmount(() => messageStore.stopRealtime())
</script>

<template>
  <main class="page family-page">
    <div v-if="loading" class="state"><van-loading /> 正在进入家庭空间…</div>
    <section v-else-if="loadFailed" class="card state">
      <span>暂时无法读取家庭信息。</span>
      <van-button plain round type="primary" @click="loadFamilyPage">重新加载</van-button>
    </section>

    <template v-else-if="familyStore.currentFamily">
      <header class="page-heading">
        <div><span>家庭空间</span><h1>{{ familyStore.currentFamily.name }}</h1><p>一起记录，也一起回应。</p></div>
        <div class="family-mark"><span>♥</span><i>{{ familyStore.members.length }}</i></div>
      </header>

      <nav class="space-tabs" aria-label="家庭空间内容">
        <button :class="{ active: activeTab === 'activity' }" @click="activeTab = 'activity'">
          <van-icon name="chat-o" />家庭动态
        </button>
        <button :class="{ active: activeTab === 'members' }" @click="activeTab = 'members'">
          <van-icon name="friends-o" />成员
        </button>
      </nav>

      <template v-if="activeTab === 'activity'">
        <section class="progress-section">
          <div class="section-heading">
            <div><span>戒烟进度</span><h2>{{ activeQuitter?.nickname ?? '家庭戒烟者' }}</h2></div>
            <button v-if="activeQuitter" @click="viewTrend">查看趋势 <van-icon name="arrow" /></button>
          </div>
          <div v-if="quitters.length > 1" class="quitter-switcher">
            <button
              v-for="member in quitters"
              :key="member.id"
              :class="{ active: member.userId === activeQuitter?.userId }"
              @click="selectQuitter(member.userId)"
            >{{ member.nickname }}</button>
          </div>
          <QuitterProgressCard
            v-if="activeQuitter"
            :summary="familyStore.quitterSummaries[activeQuitter.userId]"
            :loading="familyStore.summariesLoading"
            :is-current-user="activeQuitter.userId === authStore.user?.id"
            @trend="viewTrend"
          />
          <section v-else class="card empty">家庭中还没有戒烟者，聊天仍然可以继续。</section>
        </section>

        <FamilyChat
          :messages="messageStore.items"
          :encouragements="encouragementStore.items"
          :members="familyStore.members"
          :current-user-id="authStore.user?.id"
          :reaction-target="reactionTarget"
          :loading="messageStore.loading || encouragementStore.loading"
          :load-failed="activityLoadFailed"
          :warning="activityWarning"
          :sending="messageStore.sending"
          :reaction-disabled="sendDisabled"
          :is-reaction-disabled="isReactionDisabled"
          :message-disabled="messageUnavailable"
          :realtime-status="messageStore.realtimeStatus"
          @send="sendText"
          @reaction="sendReaction"
          @retry="familyStore.currentFamily && loadActivity(familyStore.currentFamily.id)"
        />
      </template>

      <template v-else>
        <section class="member-space">
          <div class="section-heading"><div><span>家庭成员</span><h2>{{ familyStore.members.length }} 人同行</h2></div></div>
          <div class="member-circles">
            <FamilyMemberCard
              v-for="member in familyStore.members"
              :key="member.id"
              :member="member"
              :is-current-user="member.userId === authStore.user?.id"
              compact
            />
          </div>
        </section>

        <section class="invite-card">
          <div class="invite-icon"><van-icon name="qr" size="22" /></div>
          <div><span>邀请家人加入</span><b>{{ familyStore.inviteCode }}</b><small>邀请码仅分享给家人</small></div>
          <button @click="copyInviteCode">复制</button>
        </section>

        <section class="family-safety">
          <div><b>家庭绑定</b><span>每个账号同时只能加入一个家庭</span></div>
          <button :disabled="leaving" @click="leaveFamily">{{ leaving ? '正在退出…' : '退出家庭' }}</button>
        </section>
      </template>
    </template>

    <AppTabbar />
  </main>
</template>

<style scoped>
.family-page{max-width:480px;margin:auto}.page-heading{display:flex;align-items:center;justify-content:space-between;margin:3px 2px 18px}.page-heading>div:first-child{display:flex;flex-direction:column}.page-heading span{color:var(--green-700);font-size:12px;font-weight:750}.page-heading h1{margin:3px 0;font-size:29px;letter-spacing:-.045em}.page-heading p{margin:0;color:var(--text-muted);font-size:13px}.family-mark{position:relative;display:grid;width:49px;height:49px;place-items:center;border-radius:17px;background:linear-gradient(145deg,#438e5d,#256d4b);box-shadow:0 10px 25px rgba(42,105,73,.2);color:#fff;font-size:20px}.family-mark i{position:absolute;right:-4px;top:-4px;display:grid;min-width:19px;height:19px;place-items:center;border:2px solid var(--page);border-radius:99px;background:#fff;color:var(--green-700);font-size:9px;font-style:normal}.space-tabs{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:16px;padding:4px;border-radius:16px;background:#e9eeeb}.space-tabs button{display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:13px;padding:10px;background:transparent;color:#77837d;font-size:13px;font-weight:650}.space-tabs button.active{background:#fff;color:var(--green-700);box-shadow:0 4px 14px rgba(31,73,50,.08)}.progress-section{margin-bottom:14px}.section-heading{display:flex;align-items:flex-end;justify-content:space-between;margin:0 2px 11px}.section-heading span{color:var(--green-700);font-size:11px;font-weight:750}.section-heading h2{margin:3px 0 0;font-size:19px}.section-heading>button{display:flex;align-items:center;gap:2px;border:0;background:transparent;color:var(--green-700);font-size:12px}.quitter-switcher{display:flex;gap:7px;margin-bottom:10px;overflow-x:auto}.quitter-switcher button{border:1px solid #dce7df;border-radius:99px;padding:6px 12px;background:#fff;color:var(--text-muted);font-size:11px}.quitter-switcher button.active{border-color:var(--green-500);background:var(--green-100);color:var(--green-700);font-weight:700}.member-space{padding:20px;border-radius:24px;background:linear-gradient(145deg,rgba(230,243,234,.92),rgba(255,255,255,.88));box-shadow:var(--shadow)}.member-circles{display:flex;gap:10px;overflow-x:auto;padding:8px 0 2px;scrollbar-width:none}.invite-card{display:flex;align-items:center;gap:13px;margin-top:14px;padding:17px;border-radius:20px;background:rgba(255,255,255,.68);box-shadow:inset 0 0 0 1px rgba(40,100,70,.05)}.invite-icon{display:grid;flex:0 0 42px;width:42px;height:42px;place-items:center;border-radius:14px;background:var(--green-100);color:var(--green-700)}.invite-card>div:nth-child(2){display:flex;min-width:0;flex:1;flex-direction:column}.invite-card span{color:var(--text-muted);font-size:10px}.invite-card b{margin:2px 0;letter-spacing:1.5px;color:#485d52}.invite-card small{color:#9ba49f;font-size:9px}.invite-card button{border:0;border-radius:12px;padding:8px 11px;background:#fff;color:var(--green-700);box-shadow:0 5px 14px rgba(33,71,50,.06);font-size:11px}.family-safety{display:flex;align-items:center;gap:14px;margin-top:14px;padding:16px 4px 4px}.family-safety>div{display:flex;min-width:0;flex:1;flex-direction:column}.family-safety b{font-size:12px}.family-safety span{margin-top:3px;color:var(--text-muted);font-size:10px}.family-safety button{border:0;background:transparent;color:#b34f4a;font-size:11px;font-weight:700}.family-safety button:disabled{opacity:.5}.state{display:flex;min-height:65vh;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text-muted)}.empty{text-align:center;color:var(--text-muted)}
</style>
