<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import {useAuthStore} from '@/stores/auth'
import {useFamilyStore} from '@/stores/family'
defineProps<{busy:boolean;leaving:boolean}>()
defineEmits<{leave:[]}>()
const auth=useAuthStore(),family=useFamilyStore(),copied=ref(false),copyError=ref(''),refreshing=ref(false),error=ref('')
let copyRequest=0
watch(()=>[family.currentFamily?.id,auth.user?.id],()=>{copyRequest++;copied.value=false;copyError.value=error.value=''})
onBeforeUnmount(()=>{copyRequest++})
async function copy(){
 const code=family.inviteCode,id=family.currentFamily?.id,user=auth.user?.id,token=++copyRequest
 if(!code)return
 copied.value=false;copyError.value=''
 try{if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(code);if(token===copyRequest&&family.currentFamily?.id===id&&auth.user?.id===user)copied.value=true}
 catch{if(token===copyRequest&&family.currentFamily?.id===id&&auth.user?.id===user)copyError.value='请选中邀请码，手动复制'}
}
async function refresh(){
 if(refreshing.value)return
 const user=auth.user?.id;refreshing.value=true;error.value=''
 try{await family.refreshFamily()}catch(cause){if(auth.user?.id===user)error.value=cause instanceof Error?cause.message:'刷新失败，请重试'}finally{refreshing.value=false}
}
</script>
<template><section class="family-management" aria-label="家庭管理">
 <header><div><h2>{{family.currentFamily?.name}}</h2><span>{{family.members.length}} 位成员</span></div><button type="button" :disabled="busy||refreshing||leaving" @click="refresh">{{refreshing?'刷新中…':'刷新成员'}}</button></header>
 <section class="family-invitation" aria-label="邀请家人"><div class="invitation-title"><span>邀请码</span><button type="button" :disabled="!family.inviteCode||busy||leaving||refreshing" @click="copy">{{copied?'已复制':'复制邀请码'}}</button></div><input :value="family.inviteCode" readonly aria-label="家庭邀请码" spellcheck="false" @focus="($event.target as HTMLInputElement).select()"/><p>家人在个人中心的「家庭关系」中输入此码加入。</p><p v-if="copyError" role="status">{{copyError}}</p><p v-if="copied" class="sr-only" role="status">邀请码已复制</p></section>
 <ul class="family-members" aria-label="家庭成员"><li v-for="member in family.members" :key="member.id"><span class="member-symbol" aria-hidden="true">{{member.role==='quitter'?'◇':'◎'}}</span><div class="member-name"><b>{{member.nickname}}</b><small v-if="member.userId===auth.user?.id">本人<span v-if="member.userId===family.currentFamily?.createdBy"> · 创建者</span></small><small v-else-if="member.userId===family.currentFamily?.createdBy">创建者</small></div><span class="member-role">{{member.role==='quitter'?'戒烟者':'支持者'}}</span></li></ul>
 <p v-if="error" class="family-manage-error" role="alert">{{error}}</p>
 <footer><router-link to="/family?module=support">前往共生星图 ↗</router-link><button class="leave-family" type="button" :disabled="leaving||busy||refreshing||!!error" @click="$emit('leave')">{{leaving?'退出中…':'退出家庭'}}</button></footer>
</section></template>
<style scoped>
.family-management{color:#293943}.family-management header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:8px 0 24px}.family-management h2{font-size:22px;line-height:1.4;font-weight:500;margin:0 0 5px;overflow-wrap:anywhere}.family-management header span{font-size:12px;color:#60717a}
.family-management button{font:inherit;font-size:13px;min-height:44px;border:0;background:none;color:#536772;padding:8px 10px;cursor:pointer;white-space:nowrap}.family-management button:disabled{opacity:.45;cursor:wait}.family-management button:focus-visible,.family-management a:focus-visible{outline:2px solid #a98b55;outline-offset:3px}
.family-invitation{padding:14px 20px 18px;border:1px solid #9bafb32d;border-radius:10px;background:linear-gradient(120deg,#ffffff85,#edede526)}.invitation-title{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#53616a}.family-invitation button{color:#846c43}.family-invitation input{display:block;width:100%;font:500 clamp(22px,4vw,30px)/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.13em;border:0;background:transparent;color:#354b57;padding:4px 0 8px;min-width:0}.family-invitation p{font-size:12px;color:#63717a;line-height:1.7;margin:5px 0 0}.family-invitation p[role=status]{color:#89683c}
.family-members{list-style:none;padding:0;margin:20px 0 4px}.family-members li{display:flex;align-items:center;gap:14px;padding:16px 2px;border-bottom:1px solid #9aabb22b}.member-symbol{width:38px;height:38px;display:grid;place-items:center;border:1px solid #aab7bc4d;border-radius:50%;background:#ffffff50;color:#738795;font-size:22px;flex:none}.member-name{min-width:0;flex:1}.member-name b{display:block;font-size:14px;font-weight:500;overflow-wrap:anywhere}.member-name small{display:block;font-size:11px;color:#697a84;margin-top:3px}.member-role{font-size:12px;color:#5c6b73;white-space:nowrap}.family-management footer{display:flex;justify-content:space-between;align-items:center;gap:18px;margin:18px 0 0}.family-management footer a{color:#526975;text-decoration:none;font-size:13px;min-height:44px;display:flex;align-items:center}.family-management .leave-family{color:#8c5747}.family-manage-error{font-size:13px;color:#973f32}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(max-width:400px){.family-invitation{padding:12px 14px}.family-management h2{font-size:20px}.family-management header{gap:10px}.family-management footer{gap:8px}.family-management footer a{font-size:12px}}
</style>
