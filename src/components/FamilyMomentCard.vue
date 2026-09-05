<script setup lang="ts">
import type { FamilySupportMoment } from '@/utils/familyMoment'
import { formatEncouragementTime } from '@/utils/date'

defineProps<{ moment: FamilySupportMoment }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <button class="family-moment" @click="$emit('open')">
    <div class="moment-mark"><van-icon name="chat-o" /></div>
    <div class="moment-body">
      <span>家人刚刚说</span>
      <blockquote>“{{ moment.content }}”</blockquote>
      <div><i>{{ moment.fromNickname.slice(0, 1) }}</i><b>{{ moment.fromNickname }}</b><time>{{ formatEncouragementTime(moment.createdAt) }}</time></div>
    </div>
    <van-icon class="moment-arrow" name="arrow" />
  </button>
</template>

<style scoped>
.family-moment{position:relative;display:flex;width:100%;align-items:flex-start;gap:12px;overflow:hidden;margin-top:14px;padding:17px;border:0;border-radius:21px;background:linear-gradient(135deg,#f2eadc,#fbf7ee 52%,#e8f3eb);box-shadow:0 11px 30px rgba(64,72,53,.07);color:#26382f;text-align:left}.family-moment:after{content:"“";position:absolute;right:28px;top:-23px;color:rgba(64,120,77,.07);font-family:Georgia,serif;font-size:100px}.moment-mark{display:grid;flex:0 0 38px;width:38px;height:38px;place-items:center;border-radius:13px;background:rgba(255,255,255,.78);color:var(--green-700);font-size:18px}.moment-body{min-width:0;flex:1}.moment-body>span{color:#8b7c65;font-size:10px;font-weight:700}.moment-body blockquote{overflow:hidden;margin:5px 0 10px;color:#2a3e34;font-size:14px;font-weight:650;line-height:1.45;text-overflow:ellipsis;white-space:nowrap}.moment-body>div{display:flex;align-items:center;gap:6px}.moment-body i{display:grid;width:20px;height:20px;place-items:center;border-radius:50%;background:#fff;color:var(--green-700);font-size:9px;font-style:normal;font-weight:750}.moment-body b{font-size:10px}.moment-body time{color:#9a9f99;font-size:9px}.moment-arrow{align-self:center;color:#7b9184}.family-moment:active{transform:scale(.985)}
</style>
