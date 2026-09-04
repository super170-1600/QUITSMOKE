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
    showSuccessToast(wasEditing ? '今日记录已更新' : '今日打卡完成')
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
  <main class="page form-page">
    <van-nav-bar :title="isEditing ? '修改今日记录' : '今日打卡'" left-arrow @click-left="router.back()" />
    <div v-if="loading" class="state"><van-loading /> 正在读取今日记录…</div>
    <template v-else>
      <section class="card form-card">
        <label>今天吸烟数量</label>
        <van-stepper v-model="form.cigarettes" :min="0" :max="200" integer />
        <label>今天烟瘾有多强？</label>
        <van-rate v-model="form.cravingLevel" :count="5" />
        <span class="muted">{{ form.cravingLevel }} / 5</span>
        <label>备注（可选）</label>
        <van-field v-model="form.note" rows="3" autosize type="textarea" maxlength="300" show-word-limit placeholder="例如：饭后特别想抽烟" />
      </section>
      <van-button type="primary" block round size="large" :loading="submitting" :disabled="submitting" @click="submit">
        {{ isEditing ? '保存修改' : '完成今日打卡' }}
      </van-button>
    </template>
  </main>
</template>

<style scoped>.form-page{max-width:520px;margin:auto}.form-card{display:flex;flex-direction:column;gap:18px;margin:16px 0 22px}.form-card label{font-weight:600}.van-nav-bar{margin:-20px -16px 8px}.state{display:flex;justify-content:center;gap:10px;padding:80px 0;color:#8b95a5}</style>
