<script setup lang="ts">
import {computed} from 'vue'
import CheckinView from '@/views/CheckinView.vue'
import AchievementsView from '@/views/AchievementsView.vue'
import InsightsPage from '@/features/insights/views/InsightsPage.vue'
import ConstellationDemo from '@/features/constellation/preview/ConstellationDemo.vue'
import IdentityDemo from '@/features/identity/preview/IdentityDemo.vue'
import {createPulseDemo} from '@/visuals/pulseDemo'
import {addLocalDays,getLocalDateString} from '@/utils/date'
import {calculateSmokingStatistics} from '@/utils/statistics'
import type {DailyMood} from '@/utils/dailyPulse'
import type {HubFaceId} from '@/config/hubModules'
import {useAuthStore} from '@/stores/auth'
const props=defineProps<{face:HubFaceId;values:{days:number;daily:number;craving:number;nickname:string;role:'quitter'|'supporter';members:0|1|2;mood:DailyMood}}>()
// In-memory repository; this component never writes to real account Stores.
const source=createPulseDemo({getItem:()=>null,setItem:()=>{},removeItem:()=>{}})
const draftScope=`quit-smoking-profile:local-preset:${useAuthStore().user?.id??'none'}`
const today=getLocalDateString()
source.smokingProfile.quitStartDate=addLocalDays(today,1-props.values.days)
source.checkins=Array.from({length:props.values.days},(_,i)=>({id:`local-preset-${i}`,checkinDate:addLocalDays(today,i+1-props.values.days),cigarettes:props.values.daily,cravingLevel:1+Math.round(props.values.craving*.4),cravingScore:props.values.craving,mood:props.values.mood,note:''}))
const stats=computed(()=>calculateSmokingStatistics(source.smokingProfile,source.checkins,today))
const supportPreset={traces:source.checkins.slice(-18).map(row=>({id:row.id,kind:'checkin' as const,date:row.checkinDate})),members:props.values.members,coreState:{cigarettes:props.values.daily,score:props.values.craving,mood:props.values.mood}}
</script>
<template>
 <CheckinView v-if="face==='checkin'" :source="source" :draft-scope="draftScope"/>
 <InsightsPage v-else-if="face==='progress'" :local-preview-values="{days:values.days,baseline:20,daily:values.daily,craving:values.craving,price:30}"/>
 <AchievementsView v-else-if="face==='achievements'" :preview-stats="stats"/>
 <ConstellationDemo v-else-if="face==='support'" :preset="supportPreset"/>
 <IdentityDemo v-else-if="face==='profile'" :preset="{nickname:values.nickname,role:values.role}"/>
</template>
