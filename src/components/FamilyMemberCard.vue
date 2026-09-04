<script setup lang="ts">
import type { FamilyMemberModel } from '@/types/domain'

defineProps<{ member: FamilyMemberModel; isCurrentUser: boolean; compact?: boolean }>()
</script>

<template>
  <article class="member-row" :class="{compact}">
    <div class="avatar">{{ member.nickname.slice(0, 1).toUpperCase() }}</div>
    <div class="identity">
      <strong>{{ member.nickname }}<span v-if="isCurrentUser">（我）</span></strong>
      <span>{{ member.role === 'quitter' ? '戒烟者' : '支持者' }}</span>
    </div>
    <van-tag :type="member.role === 'quitter' ? 'success' : 'primary'" plain round>{{ member.role === 'quitter' ? '戒烟者' : '支持者' }}</van-tag>
  </article>
</template>

<style scoped>.member-row{display:flex;align-items:center;gap:12px;padding:13px 0}.member-row:not(.compact)+.member-row:not(.compact){border-top:1px solid #f0f2f1}.avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#dceee2,#f4faf6);color:#27684f;font-weight:800;box-shadow:0 5px 14px rgba(42,94,65,.1)}.identity{display:flex;flex:1;flex-direction:column;gap:3px}.identity strong{font-size:15px}.identity span{color:#849088;font-size:13px}.compact{min-width:82px;flex-direction:column;gap:8px;padding:5px;text-align:center}.compact .avatar{width:54px;height:54px;font-size:18px}.compact .identity{align-items:center}.compact .identity strong{font-size:12px}.compact .identity span{font-size:10px}.compact :deep(.van-tag){display:none}</style>
