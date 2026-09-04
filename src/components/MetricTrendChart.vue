<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init, use, type EChartsType } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { SmokingTrendPoint } from '@/utils/visualization'

use([LineChart,BarChart,GridComponent,MarkLineComponent,TooltipComponent,CanvasRenderer])
const props=defineProps<{points:SmokingTrendPoint[];metric:'smoking'|'craving';chartType:'line'|'bar'}>()
const element=ref<HTMLDivElement|null>(null)
let chart:EChartsType|null=null
type TooltipItem={dataIndex:number}

function render(){
  if(!element.value)return
  if(!chart)chart=init(element.value)
  const isSmoking=props.metric==='smoking'
  const labelStep=Math.max(0,Math.ceil(props.points.length/7)-1)
  chart.setOption({animationDuration:450,grid:{left:34,right:14,top:25,bottom:34},tooltip:{trigger:'axis',formatter:(params:unknown)=>{const first=(params as TooltipItem[])[0];const point=first?props.points[first.dataIndex]:undefined;if(!point)return '';const value=isSmoking?`${point.cigarettes??'未记录'} 支`:`${point.craving??'未记录'} / 5`;const reduction=point.reduction===null?'—':`${(point.reduction*100).toFixed(0)}%`;return `${point.date}<br/>${isSmoking?'吸烟支数':'烟瘾程度'}：${value}<br/>基线：${point.baseline} 支<br/>减少：${reduction}<br/>烟瘾：${point.craving??'—'}`}},xAxis:{type:'category',boundaryGap:props.chartType==='bar',data:props.points.map(point=>point.date.slice(5)),axisLabel:{interval:labelStep,color:'#8b9690'},axisLine:{lineStyle:{color:'#e5e9e7'}}},yAxis:{type:'value',min:isSmoking?0:1,max:isSmoking?undefined:5,minInterval:1,axisLabel:{color:'#8b9690'},splitLine:{lineStyle:{color:'#eef1ef'}}},series:[{type:props.chartType,data:props.points.map(point=>isSmoking?point.cigarettes:point.craving),connectNulls:false,smooth:props.chartType==='line'?0.25:false,symbolSize:5,barMaxWidth:18,lineStyle:{color:'#398653',width:3},itemStyle:{color:'#55a36c',borderRadius:props.chartType==='bar'?[5,5,0,0]:0},areaStyle:props.chartType==='line'?{color:'rgba(65,151,91,.09)'}:undefined,markLine:isSmoking&&props.points[0]?{silent:true,symbol:'none',lineStyle:{color:'#a9b1ad',type:'dashed'},data:[{yAxis:props.points[0].baseline,name:'基线'}]}:undefined}]})
}
function resize(){chart?.resize()}
watch(()=>[props.points,props.metric,props.chartType],async()=>{await nextTick();render()},{deep:true})
onMounted(()=>{render();window.addEventListener('resize',resize)})
onBeforeUnmount(()=>{window.removeEventListener('resize',resize);chart?.dispose()})
</script>
<template><div ref="element" class="metric-chart"></div></template>
<style scoped>.metric-chart{width:100%;height:280px}</style>
