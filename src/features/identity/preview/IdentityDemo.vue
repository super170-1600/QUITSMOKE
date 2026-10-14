<script setup lang="ts">
import {computed,ref} from 'vue'
import {useRoute} from 'vue-router'
import IdentitySpace from '../ui/IdentitySpace.vue'
import IdentityField from '../ui/IdentityField.vue'
import type {IdentityModel} from '../types'
const props=defineProps<{preset?:{nickname:string;role:'quitter'|'supporter'}}>()
const route=useRoute(),still=ref(false),nickname=ref(props.preset?.nickname??'林予'),nicknameError=ref('')
const stationary=computed(()=>still.value||route.query.static==='1')
const identity=computed<IdentityModel>(()=>({nickname:nickname.value||'林予',role:props.preset?.role??(route.query.role==='supporter'?'supporter':'quitter'),accountLabel:'本地样本'}))
</script>
<template><IdentitySpace :identity="identity" :static="stationary" return-to="/__hub-preview">
 <template #personal><IdentityField v-model="nickname" label="昵称" :error="nicknameError"/><dl><div><dt>身份</dt><dd>{{identity.role==='quitter'?'戒烟者':'支持者'}}</dd></div></dl><button class="sample-apply" @click="nicknameError=nickname.trim()?'':'昵称不能为空'">预览更改</button></template>
 <template #smoking><dl><div><dt>开始日期</dt><dd>2026.10.01</dd></div><div><dt>原每日吸烟量</dt><dd>20 支</dd></div><div><dt>每包支数</dt><dd>20 支</dd></div><div><dt>每包价格</dt><dd>¥ 30.00</dd></div></dl></template>
 <template #family><dl><div><dt>林予</dt><dd>戒烟者</dd></div><div><dt>知夏</dt><dd>支持者</dd></div><div><dt>亦安</dt><dd>支持者</dd></div></dl></template>
 <template #privacy><ul class="privacy-rules"><li>现有家庭成员可读取家庭内打卡与进度。</li><li>昵称、打卡及戒烟设置仅本人可修改。</li><li>共同计划新共享规则尚未启用。</li></ul></template>
 <template #display><dl><div><dt>显示模式</dt><dd>自动</dd></div><div><dt>动画</dt><dd>跟随系统</dd></div></dl></template>
 <template #security><dl><div><dt>账户</dt><dd>本地样本</dd></div></dl></template>
 <template #footer><span>本地样板 · 不保存</span><button class="static-toggle" :aria-pressed="stationary" aria-label="切换静态晶片预览" @click="still=!stationary">{{stationary?'◇':'◌'}}</button></template>
</IdentitySpace></template>
<style scoped>
dl{margin:0;padding:0}dl>div{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:54px;border-bottom:1px solid #8a989c20}dt{color:#859093;font-size:12px}dd{margin:0;font-size:13px;color:#465257}.privacy-rules{list-style:none;padding:0;margin:0;color:#69767a;font-size:12px;line-height:1.8}.privacy-rules li{padding:14px 0;border-bottom:1px solid #8a989c20}.static-toggle{width:44px;height:44px;border:0;background:none;color:#7e898c;font-size:22px;cursor:pointer}.static-toggle:focus-visible{outline:2px solid #a68c5b;outline-offset:3px}
</style>
<style scoped>.sample-apply{display:block;margin:26px 0 12px auto;padding:12px 22px;min-height:44px;border:1px solid #a4aeb440;border-radius:4px;background:#fff6;color:#6d777b;font:inherit;font-size:12px;cursor:pointer}</style>
