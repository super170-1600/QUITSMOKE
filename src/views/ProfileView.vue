<script setup lang="ts">
import { onMounted,ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import AppTabbar from '@/components/AppTabbar.vue'
import SupporterActivityCard from '@/components/SupporterActivityCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useEncouragementStore } from '@/stores/encouragement'
import { useFamilyStore } from '@/stores/family'
import { useSmokingStore } from '@/stores/smoking'
import { useMessageStore } from '@/stores/message'
import { useDisplayMode,type DisplayMode } from '@/composables/useDisplayMode'

const authStore=useAuthStore();const familyStore=useFamilyStore();const smokingStore=useSmokingStore();const encouragementStore=useEncouragementStore();const messageStore=useMessageStore();const router=useRouter()
const loggingOut=ref(false);const loading=ref(true);const supporterActivityWarning=ref('');const supporterActivityUnavailable=ref(false);const devToolsEnabled=import.meta.env.VITE_ENABLE_DEV_TOOLS==='true';const {displayMode,setDisplayMode}=useDisplayMode()
function changeDisplayMode(mode:DisplayMode){setDisplayMode(mode);if(mode==='desktop')void router.replace('/dashboard')}
async function loadSupporterActivity(familyId:string){
  const results=await Promise.allSettled([encouragementStore.loadMyActivity(familyId),messageStore.loadMyActivity(familyId)])
  const failedCount=results.filter(result=>result.status==='rejected').length
  results.forEach((result,index)=>{if(result.status==='rejected')console.error(index===0?'加载快捷鼓励记录失败':'加载聊天陪伴记录失败',result.reason)})
  supporterActivityUnavailable.value=failedCount===results.length
  supporterActivityWarning.value=failedCount===results.length?'陪伴记录暂时无法加载':failedCount>0?'部分陪伴记录暂未加载':''
}
onMounted(async()=>{try{await familyStore.initializeFamily();if(familyStore.isQuitter)await smokingStore.ensureSmokingProfileLoaded();if(familyStore.isSupporter&&familyStore.currentFamily)await loadSupporterActivity(familyStore.currentFamily.id)}catch(error:unknown){console.error('加载个人资料失败',error);showFailToast('加载个人资料失败')}finally{loading.value=false}})
async function logout(){if(loggingOut.value)return;loggingOut.value=true;try{await authStore.logout();await router.replace('/login')}catch(error:unknown){console.error('退出登录失败',error);showFailToast('退出失败，请稍后再试')}finally{loggingOut.value=false}}
</script>

<template>
  <main class="page shell">
    <header class="profile-heading"><div class="avatar">{{familyStore.currentMember?.nickname?.slice(0,1)??'我'}}</div><div><span>我的</span><h1>{{familyStore.currentMember?.nickname??authStore.profile?.nickname??'家庭成员'}}</h1><p>{{authStore.user?.email??authStore.user?.username??'已登录账号'}}</p></div></header>
    <div v-if="loading" class="state"><van-loading size="20"/>正在加载…</div>
    <template v-else>
      <SupporterActivityCard v-if="familyStore.isSupporter" :items="encouragementStore.myItems" :total="encouragementStore.myTotal" :messages="messageStore.myItems" :message-total="messageStore.myTotal" :members="familyStore.members" :warning="supporterActivityWarning" :unavailable="supporterActivityUnavailable" @encourage="router.push('/family')" />
      <section class="card family-info"><h2>家庭信息</h2><van-cell-group inset><van-cell title="家庭" :value="familyStore.currentFamily?.name??'未加入'"/><van-cell title="身份" :value="familyStore.isQuitter?'戒烟者':'支持者'"/></van-cell-group></section>
      <section class="card display-settings"><div><h2>显示模式</h2><span>根据屏幕自动切换</span></div><div class="display-options"><button v-for="mode in (['auto','mobile','desktop'] as DisplayMode[])" :key="mode" :class="{active:displayMode===mode}" @click="changeDisplayMode(mode)">{{mode==='auto'?'自动':mode==='mobile'?'手机':'桌面'}}</button></div></section>
      <section v-if="familyStore.isQuitter" class="card settings"><h2>戒烟设置</h2><van-cell-group v-if="smokingStore.smokingProfile" inset><van-cell title="开始日期" :value="smokingStore.smokingProfile.quitStartDate"/><van-cell title="原每日吸烟量" :value="`${smokingStore.smokingProfile.baselineDailyCigarettes} 支`"/><van-cell title="每包支数" :value="`${smokingStore.smokingProfile.cigarettesPerPack} 支`"/><van-cell title="每包价格" :value="`¥${smokingStore.smokingProfile.pricePerPack.toFixed(2)}`"/></van-cell-group><van-button block plain round type="primary" @click="router.push({path:'/setup',query:{edit:'1'}})">编辑戒烟设置</van-button></section>
      <section v-if="devToolsEnabled" class="card dev-entry">
        <van-cell title="账号诊断" label="检查 CloudBase 登录身份链路" icon="warning-o" is-link @click="router.push('/auth-debug')"/>
        <van-cell v-if="familyStore.isQuitter" title="测试工具" label="生成历史打卡数据" icon="setting-o" is-link @click="router.push('/dev')"/>
      </section>
    </template>
    <van-button class="logout" plain type="danger" round block :loading="loggingOut" @click="logout">退出登录</van-button><AppTabbar/>
  </main>
</template>

<style scoped>
.shell{max-width:520px;margin:auto}.profile-heading{display:flex;align-items:center;gap:14px;margin:3px 2px 22px}.avatar{display:grid;width:58px;height:58px;place-items:center;border-radius:20px;background:linear-gradient(145deg,#d9eddf,#f4faf6);color:var(--green-700);font-size:22px;font-weight:800;box-shadow:var(--shadow)}.profile-heading span{color:var(--green-700);font-size:11px;font-weight:700}.profile-heading h1{margin:2px 0;font-size:25px}.profile-heading p{margin:0;color:var(--text-muted);font-size:12px}.family-info,.settings,.display-settings{margin-top:14px}.family-info h2,.settings h2,.display-settings h2{font-size:18px;margin:0 0 12px}.van-cell-group{margin:0 0 16px}.display-settings>div:first-child{display:flex;align-items:baseline;justify-content:space-between}.display-settings>div:first-child span{color:var(--text-muted);font-size:11px}.display-options{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:4px;border-radius:13px;background:#f0f3f1}.display-options button{border:0;border-radius:10px;padding:9px;background:transparent;color:#748078}.display-options button.active{background:#fff;color:var(--green-700);box-shadow:0 3px 10px rgba(25,55,43,.08);font-weight:700}.dev-entry{margin-top:14px;padding:7px}.dev-entry .van-cell{border-radius:14px}.logout{margin-top:18px}.state{display:flex;gap:8px;justify-content:center;padding:70px;color:var(--text-muted)}
</style>
