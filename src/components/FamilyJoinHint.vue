<script setup lang="ts">
import {ref,watch} from 'vue'
import {useAuthStore} from '@/stores/auth'
const auth=useAuthStore(),dismissed=ref(false)
watch(()=>auth.user?.id,()=>{dismissed.value=false})
</script>
<template><aside v-if="!dismissed" class="family-join-hint" aria-label="家庭提醒"><button class="hint-close" aria-label="关闭家庭提醒" @click="dismissed=true">×</button><span class="hint-symbol" aria-hidden="true">◇</span><div><p>尚未加入家庭</p><router-link :to="{path:'/profile',query:{section:'family'}}">创建 / 加入 <span aria-hidden="true">↗</span></router-link></div></aside></template>
<style scoped>
.family-join-hint{position:fixed;z-index:25;right:32px;bottom:30px;display:flex;align-items:center;gap:18px;width:260px;padding:22px 30px 18px 22px;border:1px solid #ffffffb0;border-radius:14px;background:linear-gradient(135deg,#fffdf6e6,#edf2f3d9);backdrop-filter:blur(16px);box-shadow:0 12px 40px #394d631f;color:#53616a;font:12px Inter,'Microsoft YaHei',sans-serif}.hint-symbol{font-size:32px;color:#b39a6d;font-weight:200}.family-join-hint p{margin:0 0 5px}.family-join-hint a{display:flex;align-items:center;gap:15px;min-height:36px;color:#88744e;text-decoration:none}.hint-close{position:absolute;top:3px;right:4px;width:32px;height:32px;border:0;background:none;color:#8a969c;font-size:19px;cursor:pointer}.hint-close:focus-visible,.family-join-hint a:focus-visible{outline:2px solid #b39a6d;outline-offset:2px}@media(max-width:600px){.family-join-hint{right:18px;bottom:18px;width:240px;padding:16px 28px 12px 18px}}
</style>
