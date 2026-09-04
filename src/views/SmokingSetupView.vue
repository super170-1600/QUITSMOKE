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
const isEditing = computed(() => smokingStore.smokingProfile !== null)

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
  <main class="page setup-page">
    <van-nav-bar :title="isEditing ? '编辑戒烟设置' : '设置戒烟计划'" :left-arrow="isEditing" @click-left="router.back()" />
    <div v-if="loading" class="state"><van-loading /> 正在加载…</div>
    <template v-else>
      <p class="muted intro">这些信息用于记录每天的变化，之后可以随时修改。</p>
      <section class="card form-card">
        <van-field v-model="form.quitStartDate" type="date" label="开始日期" required />
        <div class="form-row"><span>戒烟前每天吸烟</span><van-stepper v-model="form.baselineDailyCigarettes" :min="0" :max="200" integer /></div>
        <div class="form-row"><span>每包烟支数</span><van-stepper v-model="form.cigarettesPerPack" :min="1" :max="200" integer /></div>
        <van-field v-model.number="form.pricePerPack" type="number" label="每包价格" required input-align="right" placeholder="0.00" />
      </section>
      <van-button type="primary" block round size="large" :loading="submitting" :disabled="submitting" @click="submit">
        {{ isEditing ? '保存修改' : '开始记录' }}
      </van-button>
    </template>
  </main>
</template>

<style scoped>.setup-page{max-width:520px;margin:auto}.van-nav-bar{margin:-20px -16px 8px}.intro{margin:20px 2px}.form-card{margin-bottom:22px;padding:4px 2px}.form-row{display:flex;align-items:center;justify-content:space-between;min-height:56px;padding:10px 16px;border-bottom:1px solid #f2f3f5;font-size:14px}.state{display:flex;justify-content:center;gap:10px;padding:80px 0;color:#8b95a5}</style>
