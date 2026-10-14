import type {InsightsSnapshot} from '../domain/types'
import type {ConsoleModule} from '../ui/consoleTypes'
export function consoleModules(snapshot:InsightsSnapshot):ConsoleModule[]{
 const {journey,craving,savings,recovery}=snapshot.summary;let amount=0
 const cumulative=snapshot.points.map(point=>point.estimatedAmount===null?null:(amount+=Number(point.estimatedAmount)))
 const values=cumulative.slice(-14)
 return [
  {id:'journey',label:'无烟历程',summary:String(journey.currentVerifiedStreak),unit:'天',accent:'#487f8e',accessibilityLabel:'无烟历程，查看实际每日记录',shape:'timeline',values:snapshot.points.slice(-14).map(point=>point.cigarettesCount),detail:'连续无烟',secondary:[{label:'已记录',value:journey.recordedDays},{label:'最长',value:journey.longestVerifiedStreak},{label:'累计吸烟',value:journey.observedCigarettes}]},
  {id:'craving',label:'烟瘾',summary:craving.mean===null?'—':craving.mean.toFixed(1),unit:'/ 10',accent:'#65848f',accessibilityLabel:'烟瘾波谱，查看实际评分',shape:'spectrum',values:snapshot.points.slice(-14).map(point=>point.cravingScore),detail:`${craving.sampleDays} 天样本`},
  {id:'savings',label:'节省估算',summary:savings.estimatedAmount===null?'—':`¥${savings.estimatedAmount}`,accent:'#a47b3b',accessibilityLabel:'节省光柱，查看每日估算明细',shape:'columns',values,detail:`${savings.coveredDays} 天覆盖`},
  {id:'recovery',label:'恢复参考',summary:recovery.eligibility==='confirmed'?'参考进程':'待确认',accent:'#7c8d96',accessibilityLabel:'恢复参考，查看适用条件',shape:'path',values:[null,null,null,null],detail:recovery.reason},
 ]
}
