<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute(); const router = useRouter()
const tabs = [
  { path:'/home', label:'首页', icon:'home-o' },
  { path:'/trend', label:'趋势', icon:'chart-trending-o' },
  { path:'/family', label:'家庭', icon:'friends-o' },
  { path:'/profile', label:'我的', icon:'user-o' }
]
</script>
<template>
  <van-tabbar :model-value="route.path" fixed safe-area-inset-bottom @change="(p:string)=>router.push(p)">
    <van-tabbar-item v-for="tab in tabs" :key="tab.path" :name="tab.path" :icon="tab.icon">{{ tab.label }}</van-tabbar-item>
  </van-tabbar>
</template>
