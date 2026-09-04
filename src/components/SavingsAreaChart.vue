<script setup lang="ts">
import { nextTick,onBeforeUnmount,onMounted,ref,watch } from 'vue'
import { init,use,type EChartsType } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent,TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { SavingsTrendPoint } from '@/utils/visualization'
use([LineChart,GridComponent,TooltipComponent,CanvasRenderer])
const props=defineProps<{points:SavingsTrendPoint[]}>();const element=ref<HTMLDivElement|null>(null);let chart:EChartsType|null=null
function render(){if(!element.value)return;chart?.dispose();chart=init(element.value);const step=Math.max(0,Math.ceil(props.points.length/6)-1);chart.setOption({grid:{left:45,right:12,top:20,bottom:32},tooltip:{trigger:'axis',valueFormatter:(value:unknown)=>`¥${Number(value).toFixed(2)}`},xAxis:{type:'category',boundaryGap:false,data:props.points.map(point=>point.date.slice(5)),axisLabel:{interval:step,color:'#8b9690'},axisLine:{lineStyle:{color:'#e5e9e7'}}},yAxis:{type:'value',axisLabel:{formatter:'¥{value}',color:'#8b9690'},splitLine:{lineStyle:{color:'#eef1ef'}}},series:[{name:'累计节省',type:'line',smooth:.3,symbol:'none',data:props.points.map(point=>Number(point.savedMoney.toFixed(2))),lineStyle:{color:'#398653',width:3},areaStyle:{color:'rgba(65,151,91,.18)'}}]})}
function resize(){chart?.resize()}watch(()=>props.points,async()=>{await nextTick();render()},{deep:true});onMounted(()=>{render();window.addEventListener('resize',resize)});onBeforeUnmount(()=>{window.removeEventListener('resize',resize);chart?.dispose()})
</script>
<template><div ref="element" class="savings-chart"></div></template>
<style scoped>.savings-chart{width:100%;height:245px}</style>
