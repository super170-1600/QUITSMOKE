import { calculateInsights } from '../domain/metrics'
import type { ConsoleModule } from '../ui/consoleTypes'
import type { DailyRecord } from '../domain/types'
import { addLocalDays } from '@/utils/date'

// Explicit isolated fixture, not store data or a random chart.
const counts = [5, 4, 3, 3, 2, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const scores = [8, 7, 6, 7, 5, 6, 5, 4, 5, 6, 4, 4, 3, 5, 4, 3, 3, 4, 2, 3, 2, 3, 1, 2, 2, 1, 2, 1]
const records: DailyRecord[] = counts.map((count, index) => ({ date: addLocalDays('2026-09-16', index), cigarettesCount: count, cravingScore: scores[index], mood: 'calm' }))
export const demoSnapshot = calculateInsights(records, { quitStartDate: '2026-09-16', timezone: 'Asia/Shanghai', baselineCigarettesPerDay: '15', packPrice: '20', cigarettesPerPack: 20, currency: 'CNY' }, '2026-10-13')
const { journey, craving, savings } = demoSnapshot.summary
// Overview columns are a sampled cumulative sequence; detail still shows daily differences.
let cumulative=0
const cumulativeSavings=demoSnapshot.points.map(point=>point.estimatedAmount===null?null:(cumulative+=Number(point.estimatedAmount)))
export const nicoDomains: ConsoleModule[] = [
  { id: 'journey', label: '无烟历程', summary: String(journey.currentVerifiedStreak), unit: '天', accent: '#487f8e', accessibilityLabel: '无烟历程，静态样板', detail: '连续无烟', shape: 'timeline', values: counts.slice(-7), secondary: [{ label: '已记录', value: journey.recordedDays }, { label: '最长', value: journey.longestVerifiedStreak }, { label: '累计吸烟', value: journey.observedCigarettes }] },
  { id: 'craving', label: '烟瘾', summary: craving.mean!.toFixed(1), unit: '/ 10', accent: '#65848f', accessibilityLabel: '烟瘾波谱，静态样板', detail: `${craving.sampleDays} 天样本`, shape: 'spectrum', values: scores.slice(-14) },
  { id: 'savings', label: '节省估算', summary: `¥${savings.estimatedAmount!.split('.')[0]}`, accent: '#a47b3b', accessibilityLabel: '累计节省光柱，点击查看每日估算明细', detail: `${savings.coveredDays} / 28 天已记录`, shape: 'columns', values: [3,7,11,15,19,23,27].map(index=>cumulativeSavings[index]??null) },
  { id: 'recovery', label: '恢复参考', summary: '待确认', accent: '#7c8d96', accessibilityLabel: '恢复参考，尚无法确认', detail: '尚无法确认', shape: 'path', values: [null, null, null, null] },
]
