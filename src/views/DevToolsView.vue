<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { clearMyDevCheckins, ensureMyDevProfileCovers, replaceMyDevCheckins, upsertMyDevCheckin, type DevCheckinInput } from '@/api/devTools'
import { getCheckinByDate } from '@/api/checkin'
import { useSmokingStore } from '@/stores/smoking'
import { addLocalDays, getLocalDateString } from '@/utils/date'

const router = useRouter()
const smokingStore = useSmokingStore()
const busy = ref(false)
const loadingDate = ref(false)
const form = reactive({ date: getLocalDateString(), cigarettes: 0, cravingLevel: 2, note: '' })

interface Scenario {
  key: 'zero7' | 'reduce14' | 'missing7' | 'reduce30'
  title: string
  description: string
  days: number
}

const scenarios: Scenario[] = [
  { key: 'zero7', title: '连续 7 天无烟', description: '最近 7 天每天记录 0 支', days: 7 },
  { key: 'reduce14', title: '最近 14 天逐步减量', description: '从 14 支平滑下降到 1 支', days: 14 },
  { key: 'missing7', title: '包含 missing 的 7 天', description: '保留 2 天无记录，验证趋势断点', days: 7 },
  { key: 'reduce30', title: '最近 30 天逐步下降', description: '从 20 支逐步下降到 0 支', days: 30 },
]

function buildScenario(scenario: Scenario) {
  const today = getLocalDateString()
  const startDate = addLocalDays(today, -(scenario.days - 1))
  const rows: DevCheckinInput[] = []
  for (let index = 0; index < scenario.days; index += 1) {
    if (scenario.key === 'missing7' && (index === 2 || index === 5)) continue
    let cigarettes = 0
    if (scenario.key === 'reduce14') cigarettes = 14 - index
    if (scenario.key === 'reduce30') cigarettes = Math.max(0, Math.round(20 * (1 - index / 29)))
    if (scenario.key === 'missing7') cigarettes = index < 3 ? 2 : 0
    rows.push({ checkin_date: addLocalDays(startDate, index), cigarettes, craving_level: Math.max(1, Math.min(5, Math.ceil(cigarettes / 4))), note: `[DEV] ${scenario.title}` })
  }
  return { startDate, endDate: today, rows }
}

async function refreshData() {
  await smokingStore.loadSmokingProfile()
  await smokingStore.loadStatistics()
}

async function loadSelectedDate() {
  loadingDate.value = true
  try {
    const existing = await getCheckinByDate(form.date)
    form.cigarettes = existing?.cigarettes ?? 0
    form.cravingLevel = existing?.craving_level ?? 2
    form.note = existing?.note ?? ''
  } catch (error: unknown) {
    console.error('读取测试日期打卡失败', error)
    showFailToast('读取该日期记录失败')
  } finally {
    loadingDate.value = false
  }
}

async function saveManual() {
  if (busy.value) return
  busy.value = true
  try {
    await upsertMyDevCheckin({ checkin_date: form.date, cigarettes: form.cigarettes, craving_level: form.cravingLevel, note: form.note.trim() || null })
    await refreshData()
    showSuccessToast('测试打卡已保存')
  } catch (error: unknown) {
    console.error('保存测试打卡失败', error)
    showFailToast('保存失败，请检查输入或网络')
  } finally {
    busy.value = false
  }
}

async function applyScenario(scenario: Scenario) {
  if (busy.value) return
  busy.value = true
  try {
    const { startDate, endDate, rows } = buildScenario(scenario)
    const profileAdjusted = await ensureMyDevProfileCovers(startDate)
    await replaceMyDevCheckins(startDate, endDate, rows)
    await refreshData()
    showSuccessToast(profileAdjusted ? `${scenario.title}已生成，开始日期已同步` : `${scenario.title}已生成`)
  } catch (error: unknown) {
    console.error('生成测试场景失败', error)
    showFailToast('生成失败，请检查网络后重试')
  } finally {
    busy.value = false
  }
}

async function clearAll() {
  if (busy.value) return
  try {
    await showConfirmDialog({ title: '清空测试打卡？', message: '这会删除当前登录用户的全部打卡记录，且无法撤销。', confirmButtonText: '确认清空', confirmButtonColor: '#c84f4f' })
  } catch {
    return
  }
  busy.value = true
  try {
    await clearMyDevCheckins()
    await refreshData()
    showSuccessToast('当前用户打卡已清空')
  } catch (error: unknown) {
    console.error('清空测试打卡失败', error)
    showFailToast('清空失败，请稍后重试')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="page dev-page">
    <van-nav-bar title="测试工具" left-arrow @click-left="router.back()" />
    <div class="warning"><van-icon name="warning-o" />仅用于开发和测试。预设场景会在需要时前移当前账户的戒烟开始日期，确保完整趋势可见。</div>

    <section class="card editor">
      <header><div><span>手动数据</span><h2>编辑任意日期打卡</h2></div><van-loading v-if="loadingDate" size="18" /></header>
      <label>日期</label><van-field v-model="form.date" type="date" @change="loadSelectedDate" />
      <label>吸烟数量</label><div class="control"><van-stepper v-model="form.cigarettes" :min="0" :max="200" integer /><span>{{ form.cigarettes }} 支</span></div>
      <label>烟瘾程度</label><div class="control"><van-rate v-model="form.cravingLevel" :count="5" /><span>{{ form.cravingLevel }} / 5</span></div>
      <label>备注</label><van-field v-model="form.note" type="textarea" rows="2" maxlength="300" show-word-limit placeholder="可选测试备注" />
      <van-button type="primary" round block :loading="busy" @click="saveManual">保存该日期</van-button>
    </section>

    <section class="scenario-section">
      <h2>预设测试场景</h2>
      <button v-for="scenario in scenarios" :key="scenario.key" class="scenario-card" :disabled="busy" @click="applyScenario(scenario)">
        <span class="scenario-icon"><van-icon name="chart-trending-o" /></span><span><b>{{ scenario.title }}</b><small>{{ scenario.description }}</small></span><van-icon name="arrow" />
      </button>
    </section>

    <section class="danger-zone"><div><b>清空当前用户测试打卡</b><span>将清除当前账户的全部打卡记录</span></div><van-button plain round type="danger" size="small" :disabled="busy" @click="clearAll">清空</van-button></section>
  </main>
</template>

<style scoped>
.dev-page{max-width:480px;margin:auto}.van-nav-bar{margin:-18px -16px 14px;background:transparent}.warning{display:flex;align-items:flex-start;gap:8px;margin-bottom:14px;padding:11px 13px;border-radius:14px;background:#fff4df;color:#916526;font-size:12px;line-height:1.5}.editor header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.editor header span{color:var(--green-700);font-size:12px;font-weight:700}.editor h2{margin:3px 0 0;font-size:20px}.editor label{display:block;margin:15px 0 7px;font-size:13px;font-weight:700}.editor .van-field{border-radius:13px;background:#f5f7f6}.editor>.van-button{margin-top:20px}.control{display:flex;align-items:center;justify-content:space-between;min-height:44px}.control>span{color:var(--text-muted);font-size:13px}.scenario-section>h2{margin:25px 2px 12px;font-size:19px}.scenario-card{display:flex;width:100%;align-items:center;gap:12px;margin-bottom:10px;border:0;border-radius:18px;padding:15px;background:#fff;box-shadow:var(--shadow);color:#26352e;text-align:left}.scenario-card:disabled{opacity:.5}.scenario-card>span:nth-child(2){display:flex;flex:1;flex-direction:column;gap:4px}.scenario-card small{color:var(--text-muted)}.scenario-icon{display:grid;width:40px;height:40px;place-items:center;border-radius:14px;background:var(--green-100);color:var(--green-700);font-size:19px}.danger-zone{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:24px;padding:16px 3px}.danger-zone div{display:flex;flex-direction:column;gap:4px}.danger-zone b{font-size:14px}.danger-zone span{color:var(--text-muted);font-size:11px}
</style>
