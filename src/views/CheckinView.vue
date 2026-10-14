<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,reactive,ref,watch,nextTick} from 'vue'
import {useRouter} from 'vue-router'
import {useSmokingStore} from '@/stores/smoking'
import {useAuthStore} from '@/stores/auth'
import {addLocalDays,getLocalDateString,parseLocalDate} from '@/utils/date'
import {moods,moodLabels,type DailyMood,validatePulseDate} from '@/utils/dailyPulse'
import type {CheckinModel} from '@/types/domain'
import '@/styles/dailyPulse.css'
import OpticalHaloScene from '@/components/OpticalHaloScene.vue'
import HaloArchive from '@/components/HaloArchive.vue'
import {haloVisual} from '@/visuals/haloVisual'
import type {PulseDataSource} from '@/visuals/pulseDemo'
const props=defineProps<{source?:PulseDataSource;draftScope?:string}>()
const smoking=props.source??useSmokingStore(),auth=useAuthStore(),router=useRouter()
const today=ref(getLocalDateString()),selectedDate=ref(today.value),loading=ref(true),submitting=ref(false),error=ref(''),savedFeedback=ref(false)
const record=ref<CheckinModel|null>(null),calendar=ref(false),archive=ref(false),month=ref(today.value.slice(0,7))
const form=reactive({cigarettes:null as number|null,score:null as number|null,mood:null as DailyMood|null,note:''})
const snapshot=ref(''),ready=ref(false),dirty=computed(()=>ready.value&&JSON.stringify(form)!==snapshot.value)
const reducedMotion=ref(false),lowMotion=ref(false),editor=ref<'amount'|'craving'|'mood'>('amount')
const coreRecord=computed<CheckinModel|null>(()=>typeof form.cigarettes!=='number'||!Number.isFinite(form.cigarettes)?null:{id:'preview',checkinDate:selectedDate.value,cigarettes:form.cigarettes,cravingLevel:record.value?.cravingLevel??1,cravingScore:form.score??undefined,mood:form.mood??undefined,note:form.note})
const coreColor=computed(()=>haloVisual(selectedDate.value,coreRecord.value).color)
const status=computed(()=>record.value?'修改记录':selectedDate.value===today.value?'今日打卡':'补签')
const saveLabel=computed(()=>record.value?'保存修改':selectedDate.value===today.value?'完成今日打卡':'完成补签')
const recent=computed(()=>Array.from({length:7},(_,i)=>addLocalDays(today.value,i-6)))
const stored=(date:string)=>smoking.checkins.find(item=>item.checkinDate===date)
const monthDates=computed(()=>{const first=month.value+'-01',start=addLocalDays(first,-((parseLocalDate(first).getDay()+6)%7));return Array.from({length:42},(_,i)=>addLocalDays(start,i))})
const firstAllowed=computed(()=>smoking.smokingProfile?.quitStartDate??today.value)
function unavailable(date:string){return date>today.value||date<firstAllowed.value}
function moveMonth(delta:number){const value=parseLocalDate(month.value+'-01');value.setMonth(value.getMonth()+delta);month.value=getLocalDateString(value).slice(0,7)}
const drafts=ref<Record<string,typeof form>>({})
const draftKey=computed(()=>props.draftScope??(props.source?'nico-local-pulse-demo-drafts':`quit-smoking-profile:pulse-draft:${auth.user?.id??'none'}`))
function persistDrafts(){try{sessionStorage.setItem(draftKey.value,JSON.stringify(drafts.value))}catch{}}
const pending=ref(false);let resolvePending:((value:boolean)=>void)|undefined
function decision(kind:'keep'|'discard'|'cancel'){
 if(kind==='keep'){drafts.value[selectedDate.value]={...form};persistDrafts()}
 if(kind==='discard'){delete drafts.value[selectedDate.value];persistDrafts()}
 pending.value=false;resolvePending?.(kind!=='cancel');resolvePending=undefined
}
async function mayLeave(){if(submitting.value)return false;if(!dirty.value)return true;if(pending.value)return false;pending.value=true;return new Promise<boolean>(resolve=>{resolvePending=resolve})}
defineExpose({mayLeave})
let request=0,clock:ReturnType<typeof setInterval>|undefined,feedback:ReturnType<typeof setTimeout>|undefined,removeGuard:(()=>void)|undefined,media:MediaQueryList|undefined,previousFocus:HTMLElement|null=null
function motionChanged(){reducedMotion.value=Boolean(media?.matches)}
function overlayKey(event:KeyboardEvent){
 if(!pending.value&&!calendar.value&&!archive.value)return
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(pending.value)decision('cancel');else if(calendar.value)calendar.value=false;else archive.value=false}
 if(event.key==='Tab'){
  const dialog=document.querySelector<HTMLElement>(pending.value?'.pulse-draft-overlay':calendar.value?'.pulse-overlay[aria-label="完整月历"]':'.archive-overlay')
  const buttons=dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')
  if(!buttons?.length)return
  const first=buttons[0]!,last=buttons[buttons.length-1]!
  if(event.shiftKey&&(document.activeElement===first||!dialog?.contains(document.activeElement))){event.preventDefault();last.focus()}else if(!event.shiftKey&&(document.activeElement===last||!dialog?.contains(document.activeElement))){event.preventDefault();first.focus()}
 }
}
watch(()=>pending.value||calendar.value||archive.value,async open=>{if(open){previousFocus=document.activeElement as HTMLElement;await nextTick();document.querySelector<HTMLElement>(pending.value?'.pulse-draft-overlay button':calendar.value?'.pulse-overlay[aria-label="完整月历"] button':'.archive-overlay button')?.focus()}else previousFocus?.focus()})
async function loadDate(date:string){
 const token=++request;loading.value=true;ready.value=false;error.value='';record.value=null
 Object.assign(form,{cigarettes:null,score:null,mood:null,note:''})
 try{const value=await smoking.loadDailyCheckin(date);if(token!==request)return;record.value=value;Object.assign(form,{cigarettes:value?.cigarettes??null,score:value?.cravingScore??null,mood:value?.mood??null,note:value?.note??''});snapshot.value=JSON.stringify(form);if(drafts.value[date])Object.assign(form,drafts.value[date]);ready.value=true}
 catch(cause){if(token===request)error.value=cause instanceof Error?cause.message:'暂时无法读取记录，请重试'}finally{if(token===request)loading.value=false}
}
async function retryLoad(){loading.value=true;error.value='';try{await smoking.ensureStatisticsLoaded();await loadDate(selectedDate.value)}catch(cause){error.value=cause instanceof Error?cause.message:'读取失败，请重试';loading.value=false}}
async function chooseDate(date:string){if(unavailable(date))return;if(date===selectedDate.value){calendar.value=false;archive.value=false;return}if(!await mayLeave())return;selectedDate.value=date;month.value=date.slice(0,7);calendar.value=false;archive.value=false;await loadDate(date)}
async function save(){
 if(submitting.value||!ready.value)return
 try{validatePulseDate(selectedDate.value,firstAllowed.value,today.value);if(form.cigarettes===null||!Number.isInteger(form.cigarettes)||form.cigarettes<0||form.cigarettes>200)throw new Error('请填写 0–200 的整数吸烟量');if(form.score===null||form.mood===null)throw new Error('请选择当天最强烟瘾与每日感受');submitting.value=true;error.value=''
 const result=await smoking.saveDailyCheckin({checkinDate:selectedDate.value,cigarettes:form.cigarettes,cravingScore:form.score,cravingLevel:1+Math.round(form.score*4/10),mood:form.mood,note:form.note})
 record.value=result;snapshot.value=JSON.stringify(form);delete drafts.value[selectedDate.value];persistDrafts();savedFeedback.value=true;feedback=setTimeout(()=>savedFeedback.value=false,650)
 }catch(cause){error.value=cause instanceof Error?cause.message:'保存失败，请重试'}finally{submitting.value=false}
}
function beforeUnload(event:BeforeUnloadEvent){if(dirty.value){event.preventDefault();event.returnValue=''}}
onMounted(async()=>{media=matchMedia('(prefers-reduced-motion: reduce)');motionChanged();media.addEventListener('change',motionChanged);const device=navigator as Navigator&{deviceMemory?:number};lowMotion.value=(device.hardwareConcurrency??8)<=4||(device.deviceMemory??8)<=4;clock=setInterval(()=>today.value=getLocalDateString(),30000);window.addEventListener('beforeunload',beforeUnload);window.addEventListener('keydown',overlayKey,true);removeGuard=router.beforeEach(async()=>mayLeave());try{const saved=sessionStorage.getItem(draftKey.value);if(saved)drafts.value=JSON.parse(saved);await smoking.ensureStatisticsLoaded();await loadDate(selectedDate.value)}catch(cause){loading.value=false;error.value=cause instanceof Error?cause.message:'暂时无法读取记录'}})
onBeforeUnmount(()=>{++request;clearInterval(clock);clearTimeout(feedback);removeGuard?.();media?.removeEventListener('change',motionChanged);window.removeEventListener('keydown',overlayKey,true);window.removeEventListener('beforeunload',beforeUnload);resolvePending?.(false)})
</script>
<template><main class="daily-pulse" :class="{'is-saved':savedFeedback}">
<header class="pulse-heading"><div><h1>每日打卡</h1></div><button @click="month=today.slice(0,7);calendar=true" aria-label="打开完整月历">{{selectedDate}} ▦</button></header>
<nav class="pulse-dates" aria-label="最近七个自然日"><button v-for="date in recent" :key="date" :data-date="date" :disabled="unavailable(date)||submitting" :aria-pressed="selectedDate===date" @click="chooseDate(date)"><span>{{date===today?'今天':['日','一','二','三','四','五','六'][parseLocalDate(date).getDay()]}}</span><b>{{date.slice(-2)}}</b><i :class="{recorded:stored(date)}"/><small class="pulse-sr-only">{{stored(date)?'已记录':date===today?'待记录':'未记录'}}</small></button></nav>
<form v-if="ready" @submit.prevent="save" class="pulse-form pulse-composition"><fieldset :disabled="submitting">
<section class="pulse-hero"><div class="pulse-art" aria-label="立体今日光环，非医学测量"><OpticalHaloScene mode="daily" :date="selectedDate" :record="coreRecord" :mood="form.mood??undefined" :score="form.score"/><div class="pulse-art-caption"><small v-if="dirty">未保存</small></div></div>
<div class="pulse-edit"><nav class="pulse-edit-tabs" aria-label="选择要编辑的数据"><button type="button" :aria-pressed="editor==='amount'" @click="editor='amount'"><span>吸烟量</span><b>{{form.cigarettes??'—'}}<small> 支</small></b></button><button type="button" :aria-pressed="editor==='craving'" @click="editor='craving'"><span>烟瘾</span><b>{{form.score??'—'}}<small> /10</small></b></button><button type="button" :aria-pressed="editor==='mood'" @click="editor='mood'"><span>感受</span><b class="mood-value">{{form.mood?moodLabels[form.mood]:'待选择'}}</b></button></nav>
<section class="pulse-focused-editor">
<template v-if="editor==='amount'"><label for="pulse-cigarettes">吸烟量</label><div class="pulse-stepper"><button type="button" aria-label="减少一支" @click="form.cigarettes=Math.max(0,(form.cigarettes??0)-1)">−</button><input id="pulse-cigarettes" v-model.number="form.cigarettes" type="number" min="0" max="200" step="1" placeholder="—" aria-label="吸烟量，支"/><button type="button" aria-label="增加一支" @click="form.cigarettes=Math.min(200,(form.cigarettes??0)+1)">+</button></div><button type="button" class="pulse-zero" @click="form.cigarettes=0">0 支 · 未吸烟</button></template>
<template v-else-if="editor==='craving'"><label for="pulse-score">最强烟瘾</label><div class="pulse-score-value">{{form.score??'—'}}<small> / 10</small></div><input id="pulse-score" type="range" min="0" max="10" step="1" :value="form.score??0" @input="form.score=Number(($event.target as HTMLInputElement).value)" aria-label="当天最强烟瘾，0 至 10"/><div class="pulse-range-labels"><span>0 平稳</span><span>10 最强</span></div><button v-if="form.score===null" type="button" class="pulse-zero" @click="form.score=0">选择 0 · 平稳</button></template>
<template v-else><label>感受</label><div class="pulse-moods" role="group" aria-label="每日感受"><button v-for="mood in moods" :key="mood" type="button" :aria-pressed="form.mood===mood" @click="form.mood=mood">{{moodLabels[mood]}}</button></div></template>
<small v-if="record&&record.cravingScore===undefined" class="pulse-legacy">旧量表记录为 {{record.cravingLevel}}/5；保存前请选择新强度与感受。</small>
</section>
<details class="pulse-note-editor"><summary>备注 +</summary><textarea id="pulse-note" v-model="form.note" maxlength="160" rows="2" placeholder="备注" aria-label="备注"/></details>
<p v-if="error" class="pulse-error" role="alert">{{error}}</p><p v-if="savedFeedback" class="pulse-success" role="status">已保存</p>
<footer class="pulse-actions"><button class="pulse-submit" type="submit">{{submitting?'正在保存…':saveLabel}} <span>→</span></button><button class="pulse-archive-button" type="button" @click="archive=true">光环档案 ↗</button></footer>
</div></section></fieldset></form>
<div v-else class="pulse-loading" role="status">{{loading?'正在读取该日记录…':error}} <button v-if="!loading" @click="retryLoad">重新加载</button></div>
<Teleport to="body"><div class="daily-pulse pulse-portals"><section v-if="calendar" class="pulse-overlay" role="dialog" aria-modal="true" aria-label="完整月历"><div class="pulse-month"><header><button @click="moveMonth(-1)" aria-label="上个月">←</button><h2>{{month}}</h2><button @click="moveMonth(1)" aria-label="下个月">→</button><button @click="calendar=false" aria-label="关闭月历">×</button></header><div class="pulse-weekdays"><span v-for="day in ['一','二','三','四','五','六','日']" :key="day">{{day}}</span></div><div class="pulse-month-grid"><button v-for="date in monthDates" :key="date" :data-date="date" :disabled="unavailable(date)||submitting" :class="{outside:!date.startsWith(month),today:date===today,recorded:stored(date)}" :aria-label="`${date}，${stored(date)?'已记录':'无记录'}`" :aria-pressed="date===selectedDate" @click="chooseDate(date)">{{Number(date.slice(-2))}}<i/></button></div><p>实心点为已记录；空槽不代表无烟。补签从 {{firstAllowed}} 开放。</p></div></section>
<HaloArchive v-if="archive" :today="today" :selected-date="selectedDate" :records="smoking.checkins" :start-date="firstAllowed" :reduced-motion="reducedMotion||lowMotion" @close="archive=false" @edit="chooseDate"/>
<section v-if="pending" class="pulse-overlay pulse-draft-overlay" role="alertdialog" aria-modal="true" aria-label="未保存的修改"><div class="pulse-month"><h2>这一天还有未保存的修改</h2><p>可以保留草稿，稍后回到该日期继续填写。</p><div class="pulse-draft-actions"><button @click="decision('keep')">保留草稿并继续</button><button @click="decision('discard')">放弃修改并继续</button><button @click="decision('cancel')">取消切换</button></div></div></section>
</div></Teleport></main></template>
