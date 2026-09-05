<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ReactionType } from '@/api/encouragement'
import type {
  EncouragementModel,
  FamilyMemberModel,
  FamilyMessageModel,
} from '@/types/domain'
import { formatEncouragementTime } from '@/utils/date'
import { getReactionEmoji } from '@/utils/encouragement'
import { buildFamilyTimeline } from '@/utils/familyTimeline'
import type { FamilyRealtimeStatus } from '@/api/message'

const props = withDefaults(defineProps<{
  messages: FamilyMessageModel[]
  encouragements: EncouragementModel[]
  members: FamilyMemberModel[]
  currentUserId?: string
  reactionTarget?: FamilyMemberModel
  loading?: boolean
  loadFailed?: boolean
  warning?: string
  sending?: boolean
  reactionDisabled?: boolean
  isReactionDisabled?: (type: ReactionType) => boolean
  messageDisabled?: boolean
  compact?: boolean
  realtimeStatus?: FamilyRealtimeStatus
}>(), {
  currentUserId: '',
  reactionTarget: undefined,
  loading: false,
  loadFailed: false,
  warning: '',
  sending: false,
  reactionDisabled: false,
  messageDisabled: false,
  compact: false,
  realtimeStatus: 'idle',
})

const emit = defineEmits<{
  send: [content: string]
  reaction: [type: ReactionType]
  retry: []
}>()

const draft = ref('')
const pendingContent = ref('')
const stream = ref<HTMLElement | null>(null)
const stickToBottom = ref(true)
const reactions: ReactionType[] = ['heart', 'like', 'clap', 'fire', 'celebrate']
const timeline = computed(() => buildFamilyTimeline(props.messages, props.encouragements))
const memberNames = computed(() => new Map(props.members.map((member) => [member.userId, member.nickname])))
const canSend = computed(() => draft.value.trim().length > 0 && draft.value.trim().length <= 500 && !props.sending && !props.messageDisabled)

function targetName(userId: string | null) {
  return userId ? memberNames.value.get(userId) ?? '家人' : ''
}

function submit() {
  const content = draft.value.trim()
  if (!content || !canSend.value) return
  pendingContent.value = content
  stickToBottom.value = true
  emit('send', content)
}

function handleEnter(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  submit()
}

function handleScroll() {
  const element = stream.value
  if (!element) return
  stickToBottom.value = element.scrollHeight - element.scrollTop - element.clientHeight < 72
}

watch(
  () => props.messages,
  (messages) => {
    if (!pendingContent.value) return
    const delivered = messages.some((item) => (
      item.senderId === props.currentUserId && item.content === pendingContent.value
    ))
    if (!delivered) return
    if (draft.value.trim() === pendingContent.value) draft.value = ''
    pendingContent.value = ''
  },
  { deep: true },
)

watch(
  () => timeline.value.length,
  async () => {
    await nextTick()
    if (stream.value && stickToBottom.value) stream.value.scrollTop = stream.value.scrollHeight
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <section class="family-chat" :class="{ compact }">
    <div class="chat-heading">
      <div><span>家庭动态</span><h2>我们一起在这里</h2></div>
      <i class="live-dot" :class="realtimeStatus"><span />{{ realtimeStatus === 'connected' ? '实时' : realtimeStatus === 'connecting' ? '连接中' : realtimeStatus === 'error' ? '需刷新' : '未连接' }}</i>
    </div>
    <p v-if="warning" class="chat-warning"><van-icon name="info-o" />{{ warning }}</p>

    <div ref="stream" class="chat-stream" aria-live="polite" @scroll.passive="handleScroll">
      <div v-if="loading" class="chat-state"><van-loading size="18" /> 正在连接家庭空间…</div>
      <div v-else-if="loadFailed" class="chat-state error">
        <span>动态加载失败</span><button @click="emit('retry')">重试</button>
      </div>
      <div v-else-if="timeline.length === 0" class="chat-empty">
        <div>🌿</div><b>从第一句话开始陪伴</b><span>打卡和里程碑也会出现在这里</span>
      </div>
      <template v-else>
        <article
          v-for="item in timeline"
          :key="item.id"
          class="chat-entry"
          :class="{
            system: item.kind === 'system',
            mine: item.kind !== 'system' && item.senderId === currentUserId,
            reaction: item.kind === 'reaction',
          }"
        >
          <template v-if="item.kind === 'system'">
            <span class="system-message">{{ item.content }}</span>
            <time>{{ formatEncouragementTime(item.createdAt) }}</time>
          </template>
          <template v-else>
            <div class="chat-avatar">{{ item.senderNickname.slice(0, 1) }}</div>
            <div class="bubble-wrap">
              <div class="sender-line"><b>{{ item.senderNickname }}</b><time>{{ formatEncouragementTime(item.createdAt) }}</time></div>
              <div class="chat-bubble">
                <span v-if="item.kind === 'reaction'" class="reaction-copy">
                  {{ item.content }}
                  <small>送给 {{ targetName(item.toUserId) }}</small>
                </span>
                <span v-else>{{ item.content }}</span>
              </div>
            </div>
          </template>
        </article>
      </template>
    </div>

    <div v-if="reactionTarget" class="quick-reactions">
      <span>给 {{ reactionTarget.nickname }}</span>
      <button
        v-for="type in reactions"
        :key="type"
        :aria-label="`给${reactionTarget.nickname}发送${getReactionEmoji(type)}`"
        :disabled="reactionDisabled || isReactionDisabled?.(type)"
        @click="emit('reaction', type)"
      >{{ getReactionEmoji(type) }}</button>
    </div>

    <form class="chat-composer" @submit.prevent="submit">
      <van-field
        v-model="draft"
        rows="1"
        autosize
        maxlength="500"
        :disabled="messageDisabled"
        :placeholder="messageDisabled ? '聊天暂时不可用' : '说点什么，陪家人一起坚持…'"
        aria-label="家庭消息"
        @keydown.enter.exact="handleEnter"
      />
      <button type="submit" :disabled="!canSend" aria-label="发送消息">
        <van-loading v-if="sending" size="18" color="#fff" />
        <van-icon v-else name="guide-o" size="19" />
      </button>
    </form>
  </section>
</template>

<style scoped>
.family-chat{overflow:hidden;border-radius:24px;background:rgba(255,255,255,.82);box-shadow:0 14px 40px rgba(26,70,47,.08);backdrop-filter:blur(14px)}.chat-heading{display:flex;align-items:center;justify-content:space-between;padding:19px 18px 10px}.chat-heading span{color:var(--green-700);font-size:11px;font-weight:750}.chat-heading h2{margin:3px 0 0;font-size:19px}.chat-warning{display:flex;align-items:center;gap:6px;margin:0 14px 8px;padding:8px 10px;border-radius:11px;background:#fff6df;color:#8a6a26;font-size:10px}.live-dot{display:flex;align-items:center;gap:5px;color:var(--text-muted);font-size:10px;font-style:normal}.live-dot span{width:7px;height:7px;border-radius:50%;background:#55a86d;box-shadow:0 0 0 4px rgba(85,168,109,.12);animation:live-pulse 2.4s ease-in-out infinite}.live-dot.idle span,.live-dot.error span{background:#aeb8b2;box-shadow:none;animation:none}.live-dot.error{color:#a46d43}.live-dot.error span{background:#c58a5b}.chat-stream{max-height:48vh;min-height:260px;overflow-y:auto;padding:8px 15px 18px;scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:#dbe8df transparent}.chat-state,.chat-empty{display:flex;min-height:240px;align-items:center;justify-content:center;gap:8px;color:var(--text-muted);font-size:13px}.chat-state.error{flex-direction:column}.chat-state button{border:0;background:transparent;color:var(--green-700);font-weight:700}.chat-empty{flex-direction:column}.chat-empty div{font-size:30px}.chat-empty b{color:#385146;font-size:15px}.chat-empty span{font-size:12px}.chat-entry{display:flex;align-items:flex-start;gap:9px;margin-top:15px}.chat-entry.mine{flex-direction:row-reverse}.chat-avatar{display:grid;flex:0 0 34px;width:34px;height:34px;place-items:center;border-radius:50%;background:linear-gradient(145deg,#e0f0e4,#f7fbf8);color:var(--green-700);font-size:13px;font-weight:750}.mine .chat-avatar{background:linear-gradient(145deg,#4d9d67,#28704c);color:#fff}.bubble-wrap{max-width:78%}.sender-line{display:flex;align-items:center;gap:8px;margin:0 3px 5px}.mine .sender-line{justify-content:flex-end}.sender-line b{font-size:11px}.sender-line time,.system time{color:#a0aaa5;font-size:9px}.chat-bubble{padding:10px 13px;border-radius:6px 17px 17px 17px;background:#f1f5f2;color:#34463e;font-size:14px;line-height:1.5;box-shadow:0 5px 14px rgba(35,72,52,.04);word-break:break-word}.mine .chat-bubble{border-radius:17px 6px 17px 17px;background:linear-gradient(140deg,#3f8c59,#2f7550);color:#fff}.reaction .chat-bubble{padding:8px 12px;background:#f8f4ea;font-size:19px}.reaction-copy{display:flex;align-items:center;gap:7px}.reaction-copy small{color:#7e7b70;font-size:10px}.system{align-items:center;flex-direction:column;gap:4px;margin:18px 0 4px;text-align:center}.system-message{max-width:88%;padding:8px 12px;border-radius:99px;background:linear-gradient(135deg,#edf6ef,#f8fbf9);color:#52705f;font-size:11px;line-height:1.4}.quick-reactions{display:flex;align-items:center;gap:5px;padding:9px 14px;border-top:1px solid rgba(43,96,65,.06);overflow-x:auto}.quick-reactions>span{margin-right:auto;color:var(--text-muted);font-size:10px;white-space:nowrap}.quick-reactions button{display:grid;flex:0 0 32px;width:32px;height:32px;place-items:center;border:0;border-radius:50%;background:#f2f6f3;font-size:16px}.quick-reactions button:disabled{opacity:.4}.chat-composer{display:flex;align-items:flex-end;gap:9px;padding:10px 12px calc(12px + env(safe-area-inset-bottom));border-top:1px solid rgba(43,96,65,.06);background:rgba(249,251,249,.94)}.chat-composer :deep(.van-field){flex:1;padding:10px 13px;border-radius:17px;background:#fff;box-shadow:inset 0 0 0 1px rgba(45,91,65,.08)}.chat-composer>button{display:grid;flex:0 0 42px;width:42px;height:42px;place-items:center;border:0;border-radius:14px;background:var(--green-700);color:#fff;box-shadow:0 8px 18px rgba(40,106,77,.2)}.chat-composer>button:disabled{background:#b8c5be;box-shadow:none}.compact .chat-stream{max-height:360px}.compact .chat-heading{padding-top:15px}@keyframes live-pulse{50%{opacity:.55;transform:scale(.86)}}@media(prefers-reduced-motion:reduce){.live-dot span{animation:none}}
</style>
