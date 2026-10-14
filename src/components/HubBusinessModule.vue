<script setup lang="ts">
import { computed, defineAsyncComponent,reactive,ref,watch } from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {moods,moodLabels,type DailyMood} from '@/utils/dailyPulse'
import type { HubFaceId } from '@/config/hubModules'
import { hubModules } from '@/config/hubModules'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { hubModuleDestination } from '@/visuals/hubModuleRoutes'
import { useDisplayMode } from '@/composables/useDisplayMode'
import '@/styles/hubModules.css'
const props=defineProps<{face:HubFaceId;preview?:boolean}>()
const route=useRoute(),router=useRouter(),presetEditor=ref(false),presetBusy=ref(false)
const presetValues=reactive({days:28,daily:0,craving:3,nickname:'预览用户',role:'quitter' as 'quitter'|'supporter',members:2 as 0|1|2,mood:'calm' as DailyMood})
const applied=ref({...presetValues})
const PresetPreview=import.meta.env.DEV?defineAsyncComponent(()=>import('@/components/ModulePresetPreview.vue')):undefined
const auth=useAuthStore(),family=useFamilyStore(),{isDesktop}=useDisplayMode()
const canPreset=computed(()=>import.meta.env.DEV&&auth.user?.username==='administrator'&&!props.preview&&props.face!=='reserved')
const localPreset=computed(()=>canPreset.value&&route.query.localPreset==='1')
watch(()=>auth.user?.id,()=>{presetEditor.value=false;applied.value={...presetValues}})
async function applyPreset(){if(presetBusy.value)return;presetBusy.value=true;try{const failure=await router.push({query:{...route.query,localPreset:'1',presetRevision:String(Date.now())}});if(!failure){applied.value={...presetValues};presetEditor.value=false}}finally{presetBusy.value=false}}
async function restoreReal(){if(presetBusy.value)return;presetBusy.value=true;try{const query={...route.query};delete query.localPreset;delete query.presetRevision;await router.push({query})}finally{presetBusy.value=false}}
const label=computed(()=>hubModules.find(m=>m.id===props.face)?.label)
const components={
 checkin:defineAsyncComponent(()=>import('@/views/CheckinView.vue')),
 progress:defineAsyncComponent(()=>import('@/features/insights/views/InsightsPage.vue')),
 achievements:defineAsyncComponent(()=>import('@/views/AchievementsView.vue')),
 support:defineAsyncComponent(()=>import('@/features/constellation/views/FamilySpace.vue')),
 profile:defineAsyncComponent(()=>import('@/views/ProfileView.vue')),
}
const previewComponents=import.meta.env.DEV?{
 checkin:defineAsyncComponent(()=>import('@/views/PulseDemoView.vue')),
 progress:defineAsyncComponent(()=>import('@/features/insights/preview/OrbitalConsoleDemo.vue')),
 support:defineAsyncComponent(()=>import('@/features/constellation/preview/ConstellationDemo.vue')),
 profile:defineAsyncComponent(()=>import('@/features/identity/preview/IdentityDemo.vue')),
}:{}
const sampleComponent=computed(()=>props.preview?previewComponents[props.face as keyof typeof previewComponents]:undefined)
const allowed=computed(()=>auth.isAuthenticated&&(family.hasFamily||props.face==='profile')&&props.face!=='reserved'&&!(props.face==='checkin'&&family.isSupporter))
const target=computed(()=>hubModuleDestination(props.face,isDesktop.value))
const capabilities:Record<string,string[]>={checkin:['今日记录','烟瘾与感受'],progress:['变化趋势','戒烟日历','节省记录'],achievements:['连续无烟','里程碑'],support:['家庭进展','消息与鼓励','成员邀请'],profile:['个人资料','戒烟设置','显示偏好']}
</script>
<template><section class="optical-module" :class="`module-${face}`" :aria-label="label">
 <nav v-if="canPreset" class="module-presets" aria-label="模块预设"><button @click="presetEditor=!presetEditor" :disabled="presetBusy">{{localPreset?'本地预设':'预设数据'}}</button><button v-if="localPreset" @click="restoreReal" :disabled="presetBusy">返回真实模块</button><small v-if="localPreset">仅预览 · 不写入账户</small></nav>
 <form v-if="canPreset&&presetEditor" class="module-preset-editor" aria-label="模块预设数据" @submit.prevent="applyPreset"><fieldset :disabled="presetBusy"><p>仅本地预览</p><template v-if="['checkin','progress','achievements','support'].includes(face)"><label>记录天数<input v-model.number="presetValues.days" type="range" min="7" max="49"/><output>{{presetValues.days}}</output></label><label>每日支数<input v-model.number="presetValues.daily" type="range" min="0" max="40"/><output>{{presetValues.daily}}</output></label><label>烟瘾评分<input v-model.number="presetValues.craving" type="range" min="0" max="10"/><output>{{presetValues.craving}}</output></label><label>每日感受<select v-model="presetValues.mood"><option v-for="mood in moods" :key="mood" :value="mood">{{moodLabels[mood]}}</option></select></label></template><label v-if="face==='support'">支持者<select v-model.number="presetValues.members"><option :value="0">0</option><option :value="1">1</option><option :value="2">2</option></select></label><template v-if="face==='profile'"><label>昵称<input v-model="presetValues.nickname" maxlength="40" required/></label><label>身份<select v-model="presetValues.role"><option value="quitter">戒烟者</option><option value="supporter">支持者</option></select></label></template><button type="submit">应用模块预设</button></fieldset></form>
 <template v-if="localPreset&&PresetPreview"><component :is="PresetPreview" :key="JSON.stringify(applied)" :face="face" :values="applied"/></template><template v-else-if="sampleComponent"><component :is="sampleComponent"/></template><template v-else-if="allowed"><Suspense><component :is="components[face as keyof typeof components]" :key="face"/><template #fallback><div class="optical-state" role="status"><van-loading/>正在读取内容</div></template></Suspense></template>
 <section v-else class="optical-access"><div class="module-sigil" aria-hidden="true">{{face==='checkin'?'✓':face==='progress'?'↗':face==='achievements'?'✧':face==='support'?'◇':'◎'}}</div><h1>{{label}}</h1><div class="capability-list"><span v-for="item in capabilities[face]" :key="item">{{item}}</span></div><p>{{auth.isAuthenticated?'打卡由家庭中的戒烟者记录':'登录后查看和使用真实记录'}}</p><router-link v-if="!auth.isAuthenticated&&target" :to="{path:'/login',query:{redirect:`${target.path}?module=${face}`}}">登录并进入 <span aria-hidden="true">→</span></router-link><router-link v-else to="/family">查看家庭进展 →</router-link></section>
</section></template>
<style scoped>
.module-presets{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:12px;padding:10px 16px;background:#fff9;position:relative;z-index:3}.module-presets button,.module-preset-editor button{min-height:40px;padding:7px 16px;border:1px solid #adb8bf80;background:#fff9;border-radius:7px;color:#33414b;font:inherit;cursor:pointer}.module-presets small{font-size:10px;color:#52606b}.module-preset-editor{max-width:390px;margin:12px auto;padding:20px;background:#fffdf8;border:1px solid #b2bdc580;border-radius:14px;position:relative;z-index:3}.module-preset-editor fieldset{border:0;margin:0;padding:0;min-width:0}.module-preset-editor p{font-size:11px;margin-top:0;color:#554d40}.module-preset-editor label{display:flex;align-items:center;gap:14px;min-height:45px;color:#33414b;font-size:12px}.module-preset-editor input,.module-preset-editor select{min-width:0;flex:1;color:#273740;accent-color:#617b89;background:#fff;border:1px solid #aebac344;padding:7px}.module-preset-editor input[type=range]{padding:0;border:0}.module-preset-editor output{min-width:22px;text-align:right}.module-preset-editor button{margin-top:14px}button:disabled{opacity:.5;cursor:wait}
</style>
