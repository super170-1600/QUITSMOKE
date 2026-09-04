<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import AppTabbar from '@/components/AppTabbar.vue'
import FamilyMemberCard from '@/components/FamilyMemberCard.vue'
import QuitterProgressCard from '@/components/QuitterProgressCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { useEncouragementStore } from '@/stores/encouragement'
import type { ReactionType } from '@/api/encouragement'
import type { FamilyMemberModel } from '@/types/domain'
import { formatEncouragementTime } from '@/utils/date'
import { getReactionEmoji, normalizeEncouragementMessage } from '@/utils/encouragement'

const router=useRouter();const authStore=useAuthStore();const familyStore=useFamilyStore();const encouragementStore=useEncouragementStore()
const loading=ref(true);const loadFailed=ref(false);const encouragementsLoadFailed=ref(false)
const messagePopupOpen=ref(false);const messageTarget=ref<FamilyMemberModel|null>(null);const message=ref('')
const sendDisabled=computed(()=>encouragementStore.sending||encouragementStore.coolingDown)
const quitters=computed(()=>familyStore.members.filter(member=>member.role==='quitter'))
const reactions:ReactionType[]=['heart','like','clap','fire','celebrate']

async function loadFamilyPage(){loading.value=true;loadFailed.value=false;encouragementsLoadFailed.value=false;try{await familyStore.refreshFamily();const familyId=familyStore.currentFamily?.id;if(!familyId)return;await Promise.all([familyStore.loadQuitterSummaries(),encouragementStore.loadEncouragements(familyId).catch((error:unknown)=>{console.error('加载鼓励失败',error);encouragementsLoadFailed.value=true})])}catch(error:unknown){console.error('加载家庭页失败',error);loadFailed.value=true;showFailToast('加载家庭信息失败，请稍后重试')}finally{loading.value=false}}
async function copyInviteCode(){try{if(!familyStore.inviteCode||!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(familyStore.inviteCode);showSuccessToast('邀请码已复制')}catch(error:unknown){console.error('复制邀请码失败',error);showFailToast('复制失败，请手动记录邀请码')}}
async function sendReaction(member:FamilyMemberModel,type:ReactionType){const familyId=familyStore.currentFamily?.id;if(!familyId||sendDisabled.value)return;try{await encouragementStore.sendReaction(familyId,member.userId,type);showSuccessToast('鼓励已送达')}catch(error:unknown){console.error('发送表情鼓励失败',error);showFailToast('发送失败，请稍后重试')}}
function openMessage(member:FamilyMemberModel){messageTarget.value=member;message.value='';messagePopupOpen.value=true}
async function submitMessage(){const familyId=familyStore.currentFamily?.id;const target=messageTarget.value;const normalized=normalizeEncouragementMessage(message.value);if(!normalized){showFailToast('请输入 1–200 字的鼓励');return}if(!familyId||!target||sendDisabled.value)return;try{await encouragementStore.sendMessage(familyId,target.userId,normalized);messagePopupOpen.value=false;showSuccessToast('鼓励已送达')}catch(error:unknown){console.error('发送文字鼓励失败',error);showFailToast('发送失败，请稍后重试')}}
async function deleteEncouragement(id:string){const familyId=familyStore.currentFamily?.id;if(!familyId)return;try{await encouragementStore.deleteMine(familyId,id);showSuccessToast('已删除')}catch(error:unknown){console.error('删除鼓励失败',error);showFailToast('删除失败，请稍后重试')}}
function viewTrend(member:FamilyMemberModel){router.push({path:'/trend',query:{member:member.userId}})}
onMounted(loadFamilyPage)
</script>

<template>
  <main class="page family-page">
    <div v-if="loading" class="state"><van-loading/> 正在加载家庭…</div>
    <section v-else-if="loadFailed" class="card state"><span>暂时无法读取家庭信息。</span><van-button plain round type="primary" @click="loadFamilyPage">重新加载</van-button></section>
    <template v-else-if="familyStore.currentFamily">
      <header class="page-heading"><div><span>家人</span><h1>{{familyStore.currentFamily.name}}</h1><p>一起守护，每一步都有人同行。</p></div><div class="family-badge"><van-icon name="like-o" size="23" /></div></header>

      <section class="section-block">
        <div class="section-heading"><h2>戒烟进展</h2><span>{{quitters.length}} 位戒烟者</span></div>
        <template v-if="quitters.length">
          <div v-for="member in quitters" :key="member.id" class="quitter-block">
            <QuitterProgressCard :summary="familyStore.quitterSummaries[member.userId]" :loading="familyStore.summariesLoading" :is-current-user="member.userId===authStore.user?.id" @trend="viewTrend(member)"/>
            <div v-if="member.userId!==authStore.user?.id" class="encourage-panel">
              <div><b>送个鼓励</b><span>一句话，也很有力量</span></div>
              <div class="reaction-row"><button v-for="type in reactions" :key="type" :aria-label="`发送${getReactionEmoji(type)}鼓励`" :disabled="sendDisabled" @click="sendReaction(member,type)">{{getReactionEmoji(type)}}</button><button class="message-action" :disabled="sendDisabled" @click="openMessage(member)"><van-icon name="edit" /> 写句话</button></div>
            </div>
          </div>
        </template>
        <section v-else class="card empty">家庭中还没有戒烟者。</section>
      </section>

      <section class="card encouragement-list">
        <div class="section-heading"><h2>最近鼓励</h2><span>彼此陪伴</span></div>
        <div v-if="encouragementStore.loading" class="inline-state"><van-loading size="18"/> 正在加载…</div>
        <div v-else-if="encouragementsLoadFailed" class="error-note">鼓励加载失败，请稍后重试</div>
        <p v-else-if="encouragementStore.items.length===0" class="muted empty-copy">还没有鼓励，陪伴从第一句话开始。</p>
        <article v-for="item in encouragementStore.items" v-else :key="item.id" class="encouragement-item"><div class="encouragement-content"><div class="mini-avatar">{{item.fromNickname.slice(0,1)}}</div><div><b>{{item.fromNickname}}</b><p>{{item.type==='message'?`“${item.message}”`:getReactionEmoji(item.type)}}</p></div></div><div class="item-meta"><time>{{formatEncouragementTime(item.createdAt)}}</time><button v-if="item.fromUserId===authStore.user?.id" @click="deleteEncouragement(item.id)">删除</button></div></article>
      </section>

      <section class="members"><div class="section-heading"><h2>家庭成员</h2><span>{{familyStore.members.length}} 人</span></div><div class="member-circles"><FamilyMemberCard v-for="member in familyStore.members" :key="member.id" :member="member" :is-current-user="member.userId===authStore.user?.id" compact/></div></section>

      <section class="family-info"><div><span>家庭邀请码</span><b>{{familyStore.inviteCode}}</b></div><button @click="copyInviteCode">复制</button></section>
    </template>

    <van-popup v-model:show="messagePopupOpen" round position="bottom"><section class="message-popup"><span>家庭陪伴</span><h2>给{{messageTarget?.nickname}}说句话</h2><van-field v-model="message" type="textarea" rows="4" autosize maxlength="200" show-word-limit placeholder="写一句简单的鼓励"/><van-button type="primary" round block :loading="encouragementStore.sending" :disabled="sendDisabled" @click="submitMessage">发送鼓励</van-button></section></van-popup>
    <AppTabbar/>
  </main>
</template>

<style scoped>
.family-page{max-width:480px;margin:auto}.page-heading{display:flex;align-items:center;justify-content:space-between;margin:3px 2px 24px}.page-heading span{color:var(--green-700);font-size:13px;font-weight:700}.page-heading h1{margin:3px 0;font-size:28px;letter-spacing:-.04em}.page-heading p{margin:0;color:var(--text-muted);font-size:13px}.family-badge{display:grid;width:46px;height:46px;place-items:center;border-radius:16px;background:#fff;box-shadow:var(--shadow);color:var(--green-700)}.section-block{margin-bottom:14px}.section-heading{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px}.section-heading h2{margin:0;font-size:19px}.section-heading span{color:var(--text-muted);font-size:13px}.quitter-block+.quitter-block{margin-top:14px}.encourage-panel{margin-top:10px;padding:17px;background:#fff;border-radius:20px;box-shadow:var(--shadow)}.encourage-panel>div:first-child{display:flex;align-items:baseline;justify-content:space-between}.encourage-panel span{color:var(--text-muted);font-size:12px}.reaction-row{display:flex;align-items:center;gap:9px;margin-top:14px;overflow-x:auto;padding:1px}.reaction-row button{display:grid;flex:0 0 43px;width:43px;height:43px;place-items:center;border:0;border-radius:50%;background:#f3f6f4;box-shadow:inset 0 0 0 1px rgba(42,96,66,.04);font-size:20px}.reaction-row button:disabled{opacity:.45}.reaction-row .message-action{display:flex;flex:0 0 auto;width:auto;margin-left:auto;padding:0 13px;border-radius:15px;color:var(--green-700);font-size:12px;gap:5px}.encouragement-list,.members{margin-bottom:14px}.empty-copy{padding:14px 0 4px}.inline-state{display:flex;gap:8px;padding:18px 0;color:var(--text-muted)}.error-note{padding:14px 0;color:#c45454}.encouragement-item{display:flex;justify-content:space-between;gap:12px;padding:14px 0}.encouragement-item+.encouragement-item{border-top:1px solid #f0f2f1}.encouragement-content{display:flex;gap:10px}.mini-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--green-100);color:var(--green-700);font-weight:700}.encouragement-item p{margin:5px 0 0;line-height:1.5}.item-meta{display:flex;flex-direction:column;align-items:flex-end;gap:7px;color:var(--text-muted);font-size:11px}.item-meta button{border:0;background:none;color:#9aa3b1;padding:0}.family-info{display:flex;align-items:center;justify-content:space-between;padding:12px 5px 22px;color:var(--text-muted);font-size:12px}.family-info div{display:flex;gap:10px;align-items:center}.family-info b{letter-spacing:1.5px;color:#68746e}.family-info button{border:0;background:transparent;color:var(--green-700)}.message-popup{max-width:480px;margin:auto;padding:24px 18px calc(24px + env(safe-area-inset-bottom))}.message-popup>span{color:var(--green-700);font-size:13px}.message-popup h2{margin:5px 0 16px;font-size:22px}.message-popup .van-field{background:#f7f8fa;border-radius:14px;margin-bottom:18px}.state{display:flex;flex-direction:column;align-items:center;gap:12px;padding:70px 20px;color:var(--text-muted)}.empty{text-align:center;color:var(--text-muted)}
.member-circles{display:flex;gap:8px;overflow-x:auto;padding:14px 9px;border-radius:20px;background:linear-gradient(135deg,rgba(231,243,234,.8),rgba(255,255,255,.55));scrollbar-width:none}.reaction-row button:not(:disabled):active{transform:scale(.9)}
</style>
