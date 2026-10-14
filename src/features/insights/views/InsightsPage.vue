<script setup lang="ts">
import {computed,reactive,ref,onMounted,onBeforeUnmount,watch,nextTick} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {useFamilyStore} from '@/stores/family'
import {useSmokingStore} from '@/stores/smoking'
import {getLocalDateString} from '@/utils/date'
import {adaptRecords,adaptSettings} from '../adapters/insightsAdapter'
import {calculateInsights} from '../domain/metrics'
import {consoleModules} from '../adapters/consoleModules'
import OrbitalConsole from '../ui/OrbitalConsole.vue'
import DomainDetail from './DomainDetail.vue'
import {previewData,type PreviewValues} from '../domain/previewData'
const props=defineProps<{localPreviewValues?:PreviewValues}>()
const route=useRoute(),router=useRouter(),auth=useAuthStore(),family=useFamilyStore(),smoking=useSmokingStore()
const loading=ref(true),error=ref(''),focus=ref('journey');let generation=0,disposed=false,previousFocus:HTMLElement|null=null
// This is local art-direction tooling, not an authorization rule for server data.
const canPreview=computed(()=>import.meta.env.DEV&&auth.user?.username==='administrator'&&!props.localPreviewValues)
const previewEnabled=ref(false),previewEditor=ref(false)
const previewValues=reactive({days:28,baseline:20,daily:8,craving:7,price:30})
const summary=computed(()=>family.selectedQuitter?family.quitterSummaries[family.selectedQuitter.userId]:undefined)
const profile=computed(()=>family.isQuitter?smoking.smokingProfile:summary.value?.smokingProfile)
const records=computed(()=>family.isQuitter?smoking.checkins:summary.value?.checkins??[])
const snapshot=computed(()=>{const today=getLocalDateString();if(props.localPreviewValues||(canPreview.value&&previewEnabled.value)){const local=previewData(props.localPreviewValues??previewValues,today);return calculateInsights(local.records,local.settings,today)}return profile.value?calculateInsights(adaptRecords(records.value),adaptSettings(profile.value),today):null})
const modules=computed(()=>snapshot.value?consoleModules(snapshot.value):[])
const selected=computed(()=>modules.value.find(item=>item.id===route.query.domain))
async function load(){const token=++generation,user=auth.user?.id;loading.value=true;error.value='';try{await family.initializeFamily();if(family.isQuitter)await smoking.ensureStatisticsLoaded();else await family.loadQuitterSummaries();if(token!==generation||disposed||user!==auth.user?.id)return;if(!family.isQuitter&&summary.value?.loadFailed)throw new Error('家庭记录读取失败')}catch(cause){if(token===generation&&!disposed)error.value=cause instanceof Error?cause.message:'暂时无法读取'}finally{if(token===generation&&!disposed)loading.value=false}}
function select(id:string){previousFocus=document.activeElement as HTMLElement;void router.push({query:{...route.query,domain:id}})}
async function close(){const query={...route.query};delete query.domain;await router.replace({query});await nextTick();previousFocus?.focus()}
watch(()=>auth.user?.id,()=>{previewEnabled.value=previewEditor.value=false;generation++;void load()})
onMounted(()=>{if(props.localPreviewValues)loading.value=false;else void load()});onBeforeUnmount(()=>{disposed=true;generation++})
</script>
<template><main class="live-orbital"><header><router-link to="/hub" aria-label="返回晶体主页面">NICØ</router-link><div>NICØ<time>{{snapshot?.summary.sourceRange.start}} — {{snapshot?.summary.asOfDate}}</time></div><router-link to="/profile" aria-label="个人中心">◇</router-link></header><div v-if="canPreview" class="preview-tools"><button @click="previewEditor=!previewEditor">{{previewEnabled?'本地预览':'数据预览'}}</button><button v-if="previewEnabled" @click="previewEnabled=false">真实数据</button></div><section v-if="canPreview&&previewEditor" class="preview-editor" aria-label="本地数据预览"><p>仅本地显示，不保存打卡</p><label>天数<input v-model.number="previewValues.days" type="range" min="7" max="49"/><output>{{previewValues.days}}</output></label><label>原每日支数<input v-model.number="previewValues.baseline" type="range" min="1" max="60"/><output>{{previewValues.baseline}}</output></label><label>实际起始支数<input v-model.number="previewValues.daily" type="range" min="0" max="40"/><output>{{previewValues.daily}}</output></label><label>烟瘾<input v-model.number="previewValues.craving" type="range" min="0" max="10"/><output>{{previewValues.craving}}</output></label><label>每包价格<input v-model.number="previewValues.price" type="range" min="0" max="100"/><output>{{previewValues.price}}</output></label><button @click="previewEnabled=true;previewEditor=false">应用预览</button></section><nav v-if="!localPreviewValues&&family.isSupporter&&family.quitterMembers.length>1" class="quitter-choice" aria-label="选择戒烟者"><button v-for="member in family.quitterMembers" :key="member.userId" :aria-pressed="family.selectedQuitterId===member.userId" @click="family.selectQuitter(member.userId)">{{member.nickname}}</button></nav><section v-if="loading" class="live-state" role="status">正在读取…</section><section v-else-if="error" class="live-state" role="alert">{{error}}<button @click="load">重试</button></section><section v-else-if="!snapshot" class="live-state">暂无记录</section><template v-else><p v-if="!previewEnabled&&snapshot.summary.journey.recordedDays<3" class="record-count">{{snapshot.summary.journey.recordedDays}} 天记录</p><div :inert="selected?true:undefined"><OrbitalConsole :key="JSON.stringify(modules)" :modules="modules" :focus-id="focus" @focus="focus=$event" @select="select"/></div><DomainDetail v-if="selected" :module="selected" :snapshot="snapshot" @close="close" @select="select"/></template></main></template>
<style scoped>
.live-orbital{min-height:100svh;background:#fff;color:#465b64;font:13px Inter,'Microsoft YaHei',sans-serif}.live-orbital>header{height:74px;padding:0 4.2%;display:flex;align-items:center;justify-content:space-between}.live-orbital a{color:inherit;text-decoration:none;letter-spacing:.25em;font-size:14px}.live-orbital header>div{text-align:center;font-size:18px;letter-spacing:.2em}.live-orbital time{display:block;font-size:9px;letter-spacing:.04em;margin-top:5px;color:#839397}.live-state{min-height:400px;display:flex;align-items:center;justify-content:center;gap:16px;color:#829096}.live-state button,.quitter-choice button{min-height:44px;border:1px solid #b0bec244;background:#fff5;border-radius:20px;color:inherit;cursor:pointer;padding:8px 18px}.quitter-choice{display:flex;justify-content:center;gap:10px}.quitter-choice button[aria-pressed=true]{border-color:#b5a278}@media(max-width:600px){.live-orbital>header{padding:0 20px}.live-orbital a{font-size:11px}.live-orbital header>div{font-size:16px}}
</style>

<style scoped>
.preview-tools{position:relative;z-index:2;display:flex;justify-content:center;gap:12px}.preview-tools button,.preview-editor button{min-height:36px;padding:6px 16px;border:1px solid #aeb9bd66;border-radius:8px;background:#fff8;color:#776b52;font:inherit;cursor:pointer}.preview-editor{position:relative;z-index:3;max-width:360px;margin:12px auto;padding:20px;background:#fffaf2;border:1px solid #c5cdd0;border-radius:14px;box-shadow:0 12px 30px #42546714}.preview-editor p{margin:0 0 14px;color:#8a806e;font-size:11px}.preview-editor label{display:flex;gap:12px;align-items:center;min-height:44px;font-size:11px}.preview-editor input{min-width:0;flex:1;accent-color:#8e9faa}.preview-editor output{width:24px;text-align:right}.record-count{position:absolute;z-index:2;margin:8px 24px;font-size:10px;color:#758792;pointer-events:none}
</style>
