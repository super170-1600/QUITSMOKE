import {computed,reactive,ref,watch,onScopeDispose} from 'vue'
import {useAuthStore} from '@/stores/auth'
import {useFamilyStore} from '@/stores/family'
import {useSmokingStore} from '@/stores/smoking'
import {getMyProfile,updateMyNickname} from '@/api/profile'
import type {IdentityModel} from '../types'
import type {SmokingProfileFormValues} from '@/types/domain'
export function useIdentityAccount(){
 const auth=useAuthStore(),family=useFamilyStore(),smoking=useSmokingStore()
 const loading=ref(true),busy=ref(false),error=ref(''),success=ref(''),feedback=ref(0),nickname=ref(''),ready=ref(false)
 const settings=reactive<SmokingProfileFormValues>({quitStartDate:'',baselineDailyCigarettes:0,cigarettesPerPack:20,pricePerPack:0})
 let generation=0,disposed=false
 const identity=computed<IdentityModel>(()=>({nickname:auth.profile?.id===auth.user?.id?auth.profile?.nickname??'账户':'账户',role:family.currentMember?.userId===auth.user?.id?family.currentMember?.role??null:null,accountLabel:auth.isAuthenticated?'已登录':'未登录'}))
 function reset(){generation++;loading.value=false;busy.value=false;ready.value=false;nickname.value='';error.value=success.value='';feedback.value=0;Object.assign(settings,{quitStartDate:'',baselineDailyCigarettes:0,cigarettesPerPack:20,pricePerPack:0})}
 function current(token:number,userId:string){return !disposed&&token===generation&&auth.user?.id===userId}
 const reason=(cause:unknown)=>cause instanceof Error?cause.message:'暂时无法完成，请重试'
 async function load(){const userId=auth.user?.id;if(!userId){reset();return}const token=++generation;loading.value=true;ready.value=false;error.value=''
  try{await family.initializeFamily();const row=await getMyProfile(userId);if(!current(token,userId))return;if(!row||row.id!==userId)throw new Error('个人资料未就绪');auth.profile=row;nickname.value=row.nickname
   if(identity.value.role==='quitter'){await smoking.ensureSmokingProfileLoaded();if(!current(token,userId))return;if(smoking.smokingProfile)Object.assign(settings,smoking.smokingProfile)}
   ready.value=true
  }catch(cause){if(current(token,userId))error.value=reason(cause)}finally{if(current(token,userId))loading.value=false}
 }
 async function write(action:(userId:string,token:number)=>Promise<void>){if(busy.value)return;if(!ready.value||!auth.user?.id){error.value='请先读取本人资料';return}const userId=auth.user.id,token=generation;busy.value=true;error.value=success.value=''
  try{await action(userId,token);if(!current(token,userId))return;success.value='已保存';feedback.value++}
  catch(cause){if(current(token,userId))error.value=reason(cause)}finally{if(current(token,userId))busy.value=false}
 }
 async function saveNickname(){return write(async(userId,token)=>{const value=nickname.value.trim();if(!value)throw new Error('昵称不能为空');if(Array.from(value).length>40)throw new Error('昵称最多 40 个字符');const row=await updateMyNickname(value);if(!current(token,userId))return;if(row.id!==userId)throw new Error('保存回执与当前账户不一致');auth.profile=row;nickname.value=row.nickname;family.members.forEach(member=>{if(member.userId===userId)member.nickname=row.nickname});if(family.currentMember?.userId===userId)family.currentMember.nickname=row.nickname})}
 async function saveSmoking(){return write(async()=>{if(identity.value.role!=='quitter')throw new Error('仅戒烟者可修改戒烟设置');const values={quitStartDate:settings.quitStartDate,baselineDailyCigarettes:settings.baselineDailyCigarettes,cigarettesPerPack:settings.cigarettesPerPack,pricePerPack:settings.pricePerPack};if(!/^\d{4}-\d{2}-\d{2}$/.test(values.quitStartDate)||!Number.isInteger(values.baselineDailyCigarettes)||values.baselineDailyCigarettes<0||values.baselineDailyCigarettes>200||!Number.isInteger(values.cigarettesPerPack)||values.cigarettesPerPack<1||values.cigarettesPerPack>200||!Number.isFinite(values.pricePerPack)||values.pricePerPack<0)throw new Error('请检查日期和数值');const [y,m,d]=values.quitStartDate.split('-').map(Number),date=new Date(y!,m!-1,d!);if(date.getFullYear()!==y||date.getMonth()+1!==m||date.getDate()!==d)throw new Error('日期无效');await smoking.saveSmokingProfile(values)})}
 watch(()=>auth.user?.id,()=>{reset();if(auth.user?.id)void load()},{flush:'sync'})
 onScopeDispose(()=>{disposed=true;reset()})
 return {identity,loading,busy,error,success,feedback,nickname,settings,ready,load,saveNickname,saveSmoking}
}
