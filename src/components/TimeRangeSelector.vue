<script setup lang="ts">
import type { TimeRange } from '@/utils/visualization'
defineProps<{ modelValue: TimeRange }>()
defineEmits<{ 'update:modelValue': [value: TimeRange] }>()
const options:{value:TimeRange;label:string}[]=[{value:'7d',label:'7天'},{value:'30d',label:'30天'},{value:'90d',label:'90天'},{value:'180d',label:'半年'},{value:'1y',label:'1年'},{value:'all',label:'全部'}]
</script>
<template><div class="range-selector" role="group" aria-label="时间范围"><button v-for="option in options" :key="option.value" :class="{active:modelValue===option.value}" @click="$emit('update:modelValue',option.value)">{{option.label}}</button></div></template>
<style scoped>.range-selector{display:flex;gap:4px;overflow-x:auto;padding:4px;border-radius:14px;background:#edf1ee;scrollbar-width:none}.range-selector::-webkit-scrollbar{display:none}.range-selector button{flex:0 0 auto;border:0;border-radius:10px;padding:8px 11px;background:transparent;color:#75827b;font-size:12px}.range-selector button.active{background:#fff;color:var(--green-700);box-shadow:0 3px 10px rgba(25,55,43,.08);font-weight:700}</style>
