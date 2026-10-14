<script setup lang="ts">
import { computed } from 'vue'
import AnimatedValue from '@/components/AnimatedValue.vue'
import type { EncouragementModel, FamilyMemberModel, FamilyMessageModel } from '@/types/domain'
import { formatEncouragementTime } from '@/utils/date'
import { getReactionEmoji } from '@/utils/encouragement'
import { buildSupporterActivityWeek, summarizeSupporterActivity } from '@/utils/supporterActivity'

const props=withDefaults(defineProps<{items:EncouragementModel[];total:number;members:FamilyMemberModel[];messages?:FamilyMessageModel[];messageTotal?:number;compact?:boolean;warning?:string;unavailable?:boolean}>(),{messages:()=>[],messageTotal:0,warning:'',unavailable:false})
defineEmits<{encourage:[]}>()
const allItems=computed(()=>([...props.items,...props.messages]).sort((left,right)=>right.createdAt.localeCompare(left.createdAt)))
const summary=computed(()=>summarizeSupporterActivity(allItems.value))
const week=computed(()=>buildSupporterActivityWeek(allItems.value))
const activeWeekDays=computed(()=>week.value.filter(day=>day.count>0).length)
const recent=computed(()=>allItems.value.slice(0,props.compact?2:5))
const activityTotal=computed(()=>props.total+props.messageTotal)
function recipientName(userId:string){return props.members.find(member=>member.userId===userId)?.nickname??'家人'}
function isFamilyMessage(item:EncouragementModel|FamilyMessageModel):item is FamilyMessageModel{return 'senderId' in item}
</script>

<template>
  <section class="activity" :class="{compact}">
    <header><div><h2>陪伴记录</h2></div><button @click="$emit('encourage')">去鼓励 <van-icon name="arrow"/></button></header>
    <p v-if="warning" class="activity-warning"><van-icon name="info-o"/>{{warning}}</p>
    <template v-if="!unavailable">
      <div class="activity-stats"><div><AnimatedValue :value="summary.today"/><small>今日</small></div><div><AnimatedValue :value="summary.recent7Days"/><small>近 7 天</small></div><div><AnimatedValue :value="activityTotal"/><small>累计互动</small></div><div><AnimatedValue :value="summary.activeDays"/><small>近期陪伴天</small></div></div>
      <div class="week-rhythm"><div class="rhythm-heading"><span>近 7 日陪伴节奏</span><b>{{activeWeekDays}} 天有互动</b></div><div class="rhythm-bars"><div v-for="day in week" :key="day.date" :class="{active:day.count>0,today:day.isToday}" :title="`${day.date} · ${day.count} 次互动`"><i :style="{height:`${Math.min(26,8+day.count*4)}px`}"/><small>{{day.isToday?'今':day.weekday}}</small></div></div></div>
      <div v-if="recent.length" class="activity-log"><article v-for="item in recent" :key="`${isFamilyMessage(item)?'message':'encouragement'}:${item.id}`"><span class="reaction">{{isFamilyMessage(item)?'✦':item.type==='message'?'✦':getReactionEmoji(item.type)}}</span><div><b>{{isFamilyMessage(item)?'发到家庭空间':`给 ${recipientName(item.toUserId)}`}}</b><p>{{isFamilyMessage(item)?item.content:item.type==='message'?item.message:'送出了一份鼓励'}}</p></div><time>{{formatEncouragementTime(item.createdAt)}}</time></article></div>
      <p v-else class="empty">暂无记录</p>
    </template>
  </section>
</template>

<style scoped>
.activity{padding:20px;border:1px solid #d8dfe466;border-radius:12px;background:linear-gradient(135deg,#f7f5f0,#f1f4f5);box-shadow:0 13px 34px rgba(42,54,63,.06)}header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}header span{color:#627680;font-size:11px;font-weight:750}header h2{margin:5px 0 0;font-size:16px}header button{display:flex;align-items:center;gap:4px;border:0;background:transparent;color:#627680;font-size:12px;font-weight:700}.activity-warning{display:flex;align-items:center;gap:6px;margin:14px 0 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.58);color:#78858b;font-size:11px}.activity-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:20px}.activity-stats div{display:flex;align-items:center;flex-direction:column}.activity-stats :deep(.animated-value){color:#344750;font-size:28px;font-weight:500}.activity-stats small{margin-top:4px;color:var(--text-muted);font-size:10px}.week-rhythm{margin-top:17px;padding:12px 13px 9px;border-radius:15px;background:rgba(255,255,255,.58)}.rhythm-heading{display:flex;align-items:center;justify-content:space-between}.rhythm-heading span{color:#77838a;font-size:10px}.rhythm-heading b{color:#627680;font-size:10px}.rhythm-bars{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;height:48px;margin-top:7px}.rhythm-bars>div{display:flex;align-items:center;justify-content:flex-end;flex-direction:column;gap:4px}.rhythm-bars i{width:7px;min-height:8px;border-radius:99px;background:#e3e8eb;transition:height .28s ease,background .2s ease}.rhythm-bars .active i{background:linear-gradient(180deg,#bac9ce,#697d87)}.rhythm-bars .today i{box-shadow:0 0 0 3px rgba(119,145,156,.1)}.rhythm-bars small{color:#8a9399;font-size:8px}.rhythm-bars .today small{color:#627680;font-weight:500}.activity-log{margin-top:18px;padding-top:7px;border-top:1px solid rgba(123,137,147,.16)}article{display:flex;align-items:center;gap:9px;padding:9px 0}.reaction{display:grid;flex:0 0 34px;width:34px;height:34px;place-items:center;border-radius:12px;background:rgba(255,255,255,.72)}article div{min-width:0;flex:1}article b{font-size:12px}article p{overflow:hidden;margin:2px 0 0;color:#76828a;font-size:11px;text-overflow:ellipsis;white-space:nowrap}time{color:var(--text-muted);font-size:10px}.empty{margin:18px 0 0;color:var(--text-muted);font-size:12px}.compact .activity-log article:nth-child(n+3){display:none}@media(max-width:360px){.activity-stats{grid-template-columns:1fr 1fr;row-gap:14px}}
</style>
