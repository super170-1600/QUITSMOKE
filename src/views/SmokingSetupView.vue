<script setup lang="ts">
import WorkflowSpace from '@/components/WorkflowSpace.vue'
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
    showSuccessToast(wasEditing ? '戒烟设置已更新' : '戒烟设置已保存')
    await router.replace('/hub')
  } catch (error: unknown) {
    console.error('保存戒烟设置失败', error)
    showFailToast('保存失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>
<template><WorkflowSpace code="QUIT PLAN / SETUP" back="/profile"><p v-if="loading" role="status">正在读取…</p><form v-else @submit.prevent="submit"><fieldset :disabled="submitting"><label>开始日期<input v-model="form.quitStartDate" type="date" required aria-label="戒烟开始日期"/></label><label>原每日吸烟量<input v-model.number="form.baselineDailyCigarettes" type="number" min="0" max="200" required aria-label="原每日吸烟量"/></label><label>每包支数<input v-model.number="form.cigarettesPerPack" type="number" min="1" max="200" required aria-label="每包支数"/></label><label>每包价格<input v-model.number="form.pricePerPack" type="number" min="0" step="0.01" required aria-label="每包价格"/></label><button class="workflow-submit" type="submit">{{submitting?'保存中…':'保存设置'}}</button></fieldset></form></WorkflowSpace></template>