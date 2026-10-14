<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useFamilyStore } from '@/stores/family'
import { useSmokingStore } from '@/stores/smoking'
import type {SmokingStatistics} from '@/types/domain'
const props=defineProps<{previewStats?:SmokingStatistics}>()

const family=useFamilyStore(),smoking=useSmokingStore()
const loading=ref(true),failed=ref(false)
const summary=computed(()=>family.selectedQuitter?family.quitterSummaries[family.selectedQuitter.userId]:undefined)
const stats=computed(()=>props.previewStats??(family.isQuitter?smoking.statistics:summary.value?.statistics))
const name=computed(()=>family.isQuitter?family.currentMember?.nickname:summary.value?.member.nickname)
const days=[1,3,7,14,30]
const next=computed(()=>days.find(day=>day>(stats.value?.currentStreak??0)))
async function load(){loading.value=true;failed.value=false;try{await family.initializeFamily();if(family.isQuitter)await smoking.ensureStatisticsLoaded();else{await family.loadQuitterSummaries();family.selectQuitter(family.selectedQuitterId)}}catch{failed.value=true}finally{loading.value=false}}
onMounted(()=>{if(props.previewStats)loading.value=false;else void load()})
</script>
<template><main class="achievement-page page"><header class="collection-header"><router-link to="/hub">NICØ</router-link><span>NICØ / COLLECTION</span><router-link to="/profile">◇</router-link></header>
 <div v-if="loading" class="optical-state" role="status"><van-loading/>正在读取里程碑</div>
 <div v-else-if="!previewStats&&(failed||summary?.loadFailed)" class="optical-state" role="status"><p>暂时无法读取记录</p><button @click="load">重新加载</button></div>
 <template v-else-if="stats"><div v-if="!previewStats&&family.isSupporter&&family.quitterMembers.length>1" class="achievement-switch"><button v-for="member in family.quitterMembers" :key="member.userId" :aria-pressed="family.selectedQuitterId===member.userId" @click="family.selectQuitter(member.userId)">{{member.nickname}}</button></div><section class="achievement-hero"><span>当前连续无烟</span><strong>{{stats.currentStreak}}<small>天</small></strong><p>{{next?`下一个里程碑 · ${next} 天`:'已达成全部现有里程碑'}}</p></section><div class="achievement-badges"><article v-for="day in days" :key="day" :class="{'is-earned':stats.currentStreak>=day}"><i class="glass-seal" aria-hidden="true">✧</i><h2>{{day}} 天</h2><span>{{stats.currentStreak>=day?'已达成':'待达成'}}</span></article></div><div class="achievement-facts"><article><span>最长连续无烟</span><b>{{stats.longestStreak}} 天</b></article><article><span>累计记录</span><b>{{stats.recordedDays}} 天</b></article></div></template>
 <div v-else class="optical-state">暂无戒烟记录</div>
</main></template>

<style scoped>
.achievement-page{max-width:none;min-height:100svh;padding:0 4vw 40px;background:radial-gradient(ellipse at 50% 30%,#fffefa,#e9eef0);color:#52626a;font-family:Inter,'Microsoft YaHei',sans-serif}.collection-header{height:84px;display:flex;align-items:center;justify-content:space-between;font-size:12px;letter-spacing:.16em}.collection-header a{color:inherit;text-decoration:none}.collection-header>span{font-size:10px;color:#8e9ca3}.achievement-hero{text-align:center;margin:40px auto 32px}.achievement-hero>span,.achievement-hero p{font-size:11px;color:#8a969a}.achievement-hero strong{display:block;font-weight:300;font-size:64px;margin:15px}.achievement-hero small{font-size:13px;margin-left:9px}.achievement-badges{display:flex;justify-content:center;flex-wrap:wrap;gap:24px;margin:40px auto;max-width:1000px}.achievement-badges article{text-align:center;min-width:130px;padding:18px}.glass-seal{display:grid;place-items:center;width:96px;height:96px;margin:auto;border-radius:50%;border:2px solid #d5dfe4;background:radial-gradient(circle at 30% 25%,#fff8,#e2e9ee22);box-shadow:inset 2px 2px 3px #fff,inset -2px -3px 3px #93a3ab44,0 12px 30px #71818b16;color:#9eaeb6;font-style:normal;font-size:42px}.is-earned .glass-seal{border-color:#dcc99b;color:#aa8951;box-shadow:inset 2px 2px 3px #fff,inset -2px -3px 3px #aa874f44,0 12px 30px #b1965a20}.achievement-badges h2{font-size:14px;font-weight:400;margin:20px 0 8px}.achievement-badges article>span{font-size:10px;color:#939e9e}.achievement-facts{display:flex;justify-content:center;gap:50px;font-size:11px;color:#849195}.achievement-facts article{display:flex;gap:15px}.achievement-facts b{font-weight:400;color:#63747c}.achievement-switch{display:flex;gap:10px;justify-content:center}.achievement-switch button{min-height:44px;padding:8px 18px;background:#fff7;border:1px solid #9caeb144;border-radius:20px;color:#75868e;cursor:pointer}.optical-state{min-height:300px;display:grid;place-content:center;gap:15px;text-align:center}@media(max-width:600px){.achievement-badges{gap:6px}.achievement-badges article{min-width:110px;padding:12px}.collection-header{font-size:11px}.achievement-facts{gap:20px}}
</style>
