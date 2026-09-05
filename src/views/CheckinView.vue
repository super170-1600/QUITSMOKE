<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { useSmokingStore } from '@/stores/smoking'
import { getLocalDateString } from '@/utils/date'
import type { CheckinFormValues } from '@/types/domain'

const router = useRouter()
const smokingStore = useSmokingStore()
const loading = ref(true)
const submitting = ref(false)
const form = reactive<CheckinFormValues>({
  checkinDate: getLocalDateString(),
  cigarettes: 0,
  cravingLevel: 2,
  note: '',
})

const isEditing = computed(() => smokingStore.todayCheckin !== null)
const baseline = computed(() => smokingStore.smokingProfile?.baselineDailyCigarettes ?? 0)
const cravingLabels = ['很轻', '较轻', '一般', '较强', '很强'] as const
const cravingLabel = computed(() => cravingLabels[form.cravingLevel - 1] ?? '一般')
const quickAmounts = computed(() => Array.from(new Set([
  0,
  Math.max(Math.round(baseline.value * 0.25), 1),
  Math.max(Math.round(baseline.value * 0.5), 2),
  baseline.value,
].filter((value) => value >= 0 && value <= 200))).sort((left, right) => left - right))
const reduction = computed(() => baseline.value > 0
  ? Math.max(Math.round((1 - form.cigarettes / baseline.value) * 100), 0)
  : null)
const statusTitle = computed(() => form.cigarettes === 0 ? '今天是无烟日' : `今天记录 ${form.cigarettes} 支`)
const statusCaption = computed(() => {
  if (form.cigarettes === 0) return '这是值得和家人分享的一步'
  if (reduction.value !== null && reduction.value > 0) return `比原每日基线少 ${reduction.value}%`
  return '真实记录，比追求完美更重要'
})

onMounted(async () => {
  try {
    await smokingStore.ensureStatisticsLoaded()
    const checkin = smokingStore.todayCheckin
    if (checkin) {
      form.cigarettes = checkin.cigarettes
      form.cravingLevel = checkin.cravingLevel
      form.note = checkin.note
    }
  } catch (error: unknown) {
    console.error('加载今日打卡失败', error)
    showFailToast('加载失败，请检查网络后重试')
  } finally {
    loading.value = false
  }
})

function isValid() {
  return Number.isInteger(form.cigarettes)
    && form.cigarettes >= 0
    && form.cigarettes <= 200
    && Number.isInteger(form.cravingLevel)
    && form.cravingLevel >= 1
    && form.cravingLevel <= 5
    && form.note.length <= 300
}

async function submit() {
  if (submitting.value) return
  if (!isValid()) {
    showFailToast('请检查吸烟数量、烟瘾程度和备注长度')
    return
  }
  submitting.value = true
  try {
    const wasEditing = isEditing.value
    await smokingStore.saveTodayCheckin({ ...form })
    showSuccessToast(wasEditing
      ? '今日记录已更新'
      : form.cigarettes === 0
        ? '太棒了，家人会看到今天的进步'
        : '记录完成，真实的每一步都重要')
    await router.replace('/home')
  } catch (error: unknown) {
    console.error('保存今日打卡失败', error)
    showFailToast('保存失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="page checkin-page">
    <van-nav-bar :title="isEditing ? '修改今日记录' : '今日打卡'" left-arrow @click-left="router.back()" />
    <div v-if="loading" class="state"><van-loading /> 正在读取今日记录…</div>
    <template v-else>
      <section class="checkin-hero" :class="{ zero: form.cigarettes === 0 }">
        <div class="status-icon"><van-icon :name="form.cigarettes === 0 ? 'passed' : 'records-o'" /></div>
        <div><span>今日状态</span><h1>{{ statusTitle }}</h1><p>{{ statusCaption }}</p></div>
        <strong>{{ form.cigarettes }}<small>支</small></strong>
      </section>

      <section class="input-section amount-section">
        <header><div><span>01</span><h2>今天吸了多少？</h2></div><small>0–200 支</small></header>
        <div class="stepper-wrap"><van-stepper v-model="form.cigarettes" :min="0" :max="200" integer /></div>
        <div class="quick-amounts">
          <button
            v-for="amount in quickAmounts"
            :key="amount"
            :class="{ active: form.cigarettes === amount }"
            @click="form.cigarettes = amount"
          >{{ amount === 0 ? '0 支 · 无烟' : `${amount} 支` }}</button>
        </div>
      </section>

      <section class="input-section craving-section">
        <header><div><span>02</span><h2>今天的烟瘾如何？</h2></div><b>{{ cravingLabel }}</b></header>
        <div class="craving-options">
          <button
            v-for="level in 5"
            :key="level"
            :class="{ active: form.cravingLevel === level }"
            :aria-label="`烟瘾 ${level} 级，${cravingLabels[level - 1]}`"
            @click="form.cravingLevel = level"
          ><i>{{ level }}</i><small>{{ cravingLabels[level - 1] }}</small></button>
        </div>
      </section>

      <section class="input-section note-section">
        <header><div><span>03</span><h2>留下一点感受</h2></div><small>可选</small></header>
        <van-field
          v-model="form.note"
          rows="2"
          autosize
          type="textarea"
          maxlength="300"
          show-word-limit
          placeholder="例如：饭后有点想抽，但散步后轻松了"
        />
      </section>

      <div class="family-note"><van-icon name="friends-o" /><span>保存后，家人可以在家庭动态中看到今天的进展</span></div>
      <van-button class="submit-button" type="primary" block round size="large" :loading="submitting" :disabled="submitting" @click="submit">
        <van-icon :name="form.cigarettes === 0 ? 'passed' : 'records-o'" />
        {{ isEditing ? '保存今日修改' : '完成今日打卡' }}
      </van-button>
    </template>
  </main>
</template>

<style scoped>
.checkin-page{max-width:520px;margin:auto}.van-nav-bar{margin:-18px -16px 14px;background:transparent}.checkin-hero{position:relative;display:flex;align-items:center;gap:13px;overflow:hidden;margin-bottom:14px;padding:20px;border-radius:24px;background:linear-gradient(140deg,#f2eee6,#fff);box-shadow:var(--shadow);transition:background .35s ease}.checkin-hero:after{content:"";position:absolute;width:130px;height:130px;right:-62px;top:-70px;border-radius:50%;background:rgba(195,151,82,.08)}.checkin-hero.zero{background:linear-gradient(140deg,#dff1e4,#f9fcfa)}.status-icon{display:grid;flex:0 0 45px;width:45px;height:45px;place-items:center;border-radius:16px;background:#fff;color:#a67b3e;font-size:22px;box-shadow:0 7px 18px rgba(54,65,58,.07)}.zero .status-icon{color:var(--green-700)}.checkin-hero>div:nth-child(2){min-width:0;flex:1}.checkin-hero span{color:var(--text-muted);font-size:10px}.checkin-hero h1{margin:3px 0;font-size:20px}.checkin-hero p{margin:0;color:var(--text-muted);font-size:11px}.checkin-hero>strong{position:relative;z-index:1;color:var(--green-900);font-size:34px;letter-spacing:-.05em}.checkin-hero>strong small{margin-left:3px;font-size:12px;font-weight:500}.input-section{margin-bottom:12px;padding:18px;border-radius:21px;background:rgba(255,255,255,.88);box-shadow:var(--shadow)}.input-section header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.input-section header>div{display:flex;align-items:center;gap:9px}.input-section header span{display:grid;width:26px;height:26px;place-items:center;border-radius:9px;background:var(--green-100);color:var(--green-700);font-size:9px;font-weight:800}.input-section h2{margin:0;font-size:17px}.input-section header>small{color:var(--text-muted);font-size:10px}.stepper-wrap{display:flex;justify-content:center;padding:22px 0 18px}.stepper-wrap :deep(.van-stepper__input){width:88px;height:48px;background:transparent;color:var(--green-900);font-size:34px;font-weight:800}.stepper-wrap :deep(.van-stepper__minus),.stepper-wrap :deep(.van-stepper__plus){width:42px;height:42px;border-radius:14px;background:#edf4ef;color:var(--green-700)}.quick-amounts{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none}.quick-amounts button{flex:1;min-width:max-content;border:1px solid #e2e9e4;border-radius:99px;padding:8px 11px;background:#fff;color:#748078;font-size:11px}.quick-amounts button.active{border-color:var(--green-500);background:var(--green-100);color:var(--green-700);font-weight:750}.craving-section header>b{color:var(--green-700);font-size:13px}.craving-options{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:18px}.craving-options button{display:flex;align-items:center;flex-direction:column;gap:6px;border:0;padding:0;background:transparent;color:#96a09b}.craving-options i{display:grid;width:36px;height:36px;place-items:center;border-radius:50%;background:#f1f4f2;font-style:normal;font-weight:700;transition:transform .16s ease,background .2s ease}.craving-options small{font-size:9px;white-space:nowrap}.craving-options button.active{color:var(--green-700)}.craving-options button.active i{background:var(--green-700);box-shadow:0 7px 16px rgba(40,106,77,.2);color:#fff;transform:scale(1.08)}.note-section :deep(.van-field){margin-top:14px;padding:12px;border-radius:15px;background:#f6f8f6}.family-note{display:flex;align-items:center;justify-content:center;gap:7px;margin:15px 6px;color:#708078;font-size:11px}.family-note .van-icon{color:var(--green-700);font-size:16px}.submit-button{height:54px;box-shadow:0 11px 25px rgba(40,106,77,.2);font-weight:750}.submit-button .van-icon{margin-right:6px}.state{display:flex;justify-content:center;gap:10px;padding:80px 0;color:var(--text-muted)}@media(max-width:360px){.craving-options small{font-size:8px}.checkin-hero p{display:none}}
</style>
