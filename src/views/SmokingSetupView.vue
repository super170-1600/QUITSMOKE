<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { useSmokingStore } from '@/stores/smoking'
import { getLocalDateString } from '@/utils/date'
import type { SmokingProfileFormValues } from '@/types/domain'

const router = useRouter()
const smokingStore = useSmokingStore()
const submitting = ref(false)
const loading = ref(true)
const form = reactive<SmokingProfileFormValues>({
  quitStartDate: getLocalDateString(),
  baselineDailyCigarettes: 20,
  cigarettesPerPack: 20,
  pricePerPack: 0,
})
const baselineOptions = [5, 10, 15, 20, 30]
const isEditing = computed(() => smokingStore.smokingProfile !== null)
const dailyCost = computed(() => form.cigarettesPerPack > 0
  ? form.baselineDailyCigarettes / form.cigarettesPerPack * form.pricePerPack
  : 0)
const monthlyCost = computed(() => dailyCost.value * 30)

function fillForm() {
  const profile = smokingStore.smokingProfile
  if (!profile) return
  form.quitStartDate = profile.quitStartDate
  form.baselineDailyCigarettes = profile.baselineDailyCigarettes
  form.cigarettesPerPack = profile.cigarettesPerPack
  form.pricePerPack = profile.pricePerPack
}

onMounted(async () => {
  try {
    await smokingStore.ensureSmokingProfileLoaded()
    fillForm()
  } catch (error: unknown) {
    console.error('加载戒烟设置失败', error)
    showFailToast('加载失败，请检查网络后重试')
  } finally {
    loading.value = false
  }
})

function isValid() {
  if (!form.quitStartDate) return false
  if (!Number.isInteger(form.baselineDailyCigarettes) || form.baselineDailyCigarettes < 0) return false
  if (!Number.isInteger(form.cigarettesPerPack) || form.cigarettesPerPack <= 0) return false
  return Number.isFinite(form.pricePerPack) && form.pricePerPack >= 0
}

async function submit() {
  if (submitting.value) return
  if (!isValid()) {
    showFailToast('请检查戒烟设置中的数值')
    return
  }
  submitting.value = true
  try {
    const wasEditing = isEditing.value
    await smokingStore.saveSmokingProfile({ ...form })
    showSuccessToast(wasEditing ? '戒烟设置已更新' : '计划设置好了，从今天开始记录')
    await router.replace('/home')
  } catch (error: unknown) {
    console.error('保存戒烟设置失败', error)
    showFailToast('保存失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="page plan-page">
    <van-nav-bar :title="isEditing ? '编辑戒烟设置' : '设置戒烟计划'" :left-arrow="isEditing" @click-left="router.back()" />
    <div v-if="loading" class="state"><van-loading /> 正在加载…</div>
    <template v-else>
      <header class="plan-heading">
        <span>{{ isEditing ? '调整你的计划' : '只需要完成一次' }}</span>
        <h1>{{ isEditing ? '让记录继续贴合真实情况' : '先记住改变前的样子' }}</h1>
        <p>基线用于计算少吸支数和节省金额，不是每天必须完成的目标。</p>
      </header>

      <section class="plan-section date-section">
        <div class="section-icon"><van-icon name="calendar-o" /></div>
        <div class="section-body"><label>从哪一天开始记录？</label><small>可以选择今天或已经开始戒烟的日期</small></div>
        <van-field v-model="form.quitStartDate" type="date" aria-label="戒烟开始日期" />
      </section>

      <section class="plan-section baseline-section">
        <div class="section-title"><div class="section-icon"><van-icon name="bar-chart-o" /></div><div><label>戒烟前通常每天吸多少？</label><small>按大多数普通日子的情况填写</small></div></div>
        <div class="baseline-value"><strong>{{ form.baselineDailyCigarettes }}</strong><span>支 / 天</span></div>
        <div class="baseline-options">
          <button v-for="amount in baselineOptions" :key="amount" :class="{ active: form.baselineDailyCigarettes === amount }" @click="form.baselineDailyCigarettes = amount">{{ amount }}</button>
        </div>
        <div class="custom-stepper"><span>精确调整</span><van-stepper v-model="form.baselineDailyCigarettes" :min="0" :max="200" integer /></div>
      </section>

      <section class="plan-section cost-section">
        <div class="section-title"><div class="section-icon"><van-icon name="balance-o" /></div><div><label>用于计算节省金额</label><small>只影响金额统计，不影响每日打卡</small></div></div>
        <div class="cost-fields">
          <div><span>每包支数</span><van-stepper v-model="form.cigarettesPerPack" :min="1" :max="200" integer /></div>
          <van-field v-model.number="form.pricePerPack" type="number" label="每包价格" input-align="right" placeholder="0.00"><template #left-icon>¥</template></van-field>
        </div>
      </section>

      <section class="estimate-card">
        <div><span>按原来用量估算</span><b>每天约 ¥{{ dailyCost.toFixed(2) }}</b></div>
        <div><span>30 天理论支出</span><strong>¥{{ monthlyCost.toFixed(2) }}</strong></div>
      </section>

      <van-button class="submit-button" type="primary" block round size="large" :loading="submitting" :disabled="submitting" @click="submit">
        {{ isEditing ? '保存修改' : '开始记录我的变化' }}
      </van-button>
    </template>
  </main>
</template>

<style scoped>
.plan-page{max-width:520px;margin:auto}.van-nav-bar{margin:-18px -16px 10px;background:transparent}.plan-heading{margin:12px 3px 22px}.plan-heading>span{color:var(--green-700);font-size:11px;font-weight:750}.plan-heading h1{max-width:390px;margin:5px 0 8px;font-size:29px;line-height:1.22;letter-spacing:-.04em}.plan-heading p{max-width:430px;margin:0;color:var(--text-muted);font-size:12px;line-height:1.55}.plan-section{margin-bottom:12px;padding:18px;border-radius:21px;background:rgba(255,255,255,.9);box-shadow:var(--shadow)}.date-section{display:grid;grid-template-columns:42px 1fr;align-items:center;gap:11px}.section-icon{display:grid;flex:0 0 40px;width:40px;height:40px;place-items:center;border-radius:13px;background:var(--green-100);color:var(--green-700);font-size:19px}.section-body,.section-title>div:last-child{display:flex;flex-direction:column}.plan-section label{font-size:14px;font-weight:750}.plan-section small{margin-top:3px;color:var(--text-muted);font-size:10px}.date-section :deep(.van-field){grid-column:1/3;margin-top:3px;padding:12px 13px;border-radius:14px;background:#f5f8f6}.section-title{display:flex;align-items:center;gap:11px}.baseline-value{display:flex;align-items:baseline;justify-content:center;padding:20px 0 16px}.baseline-value strong{color:var(--green-900);font-size:46px;line-height:1;letter-spacing:-.05em}.baseline-value span{margin-left:7px;color:var(--text-muted);font-size:13px}.baseline-options{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.baseline-options button{border:1px solid #e2e9e4;border-radius:12px;padding:9px 0;background:#fff;color:#7a8680;font-size:11px}.baseline-options button.active{border-color:var(--green-500);background:var(--green-100);color:var(--green-700);font-weight:750}.custom-stepper{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:13px;border-top:1px solid #eef2ef}.custom-stepper>span{color:var(--text-muted);font-size:11px}.custom-stepper :deep(.van-stepper__input){background:#f4f7f5}.cost-fields{margin-top:15px}.cost-fields>div:first-child{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-radius:14px;background:#f6f8f6;font-size:12px}.cost-fields :deep(.van-field){margin-top:8px;padding:12px 14px;border-radius:14px;background:#f6f8f6}.estimate-card{display:grid;grid-template-columns:1fr 1fr;gap:1px;overflow:hidden;margin:14px 0;padding:1px;border-radius:20px;background:rgba(41,105,73,.08);box-shadow:var(--shadow)}.estimate-card>div{display:flex;min-height:86px;flex-direction:column;justify-content:center;padding:15px;background:linear-gradient(145deg,#e5f2e8,#f8fbf9)}.estimate-card span{color:#708078;font-size:10px}.estimate-card b,.estimate-card strong{margin-top:7px;color:var(--green-900);font-size:18px}.submit-button{height:54px;box-shadow:0 11px 25px rgba(40,106,77,.2);font-weight:750}.state{display:flex;justify-content:center;gap:10px;padding:80px 0;color:var(--text-muted)}@media(max-width:350px){.baseline-options{grid-template-columns:repeat(3,1fr)}.estimate-card{grid-template-columns:1fr}}
</style>
