import { describe, expect, it } from 'vitest'
import { buildCravingTrend, buildHeatmapData, buildSavingsTrend, buildSmokingTrend, getTimeRangeDates, type TimeRange } from '@/utils/visualization'
import { calculateSmokingStatistics } from '@/utils/statistics'
import type { CheckinModel, SmokingProfileModel } from '@/types/domain'

const profile: SmokingProfileModel = { id:'p1', quitStartDate:'2026-01-01', baselineDailyCigarettes:20, cigarettesPerPack:20, pricePerPack:30 }
const checkin = (date:string,cigarettes:number,cravingLevel=2):CheckinModel => ({ id:date, checkinDate:date, cigarettes, cravingLevel, note:'' })

describe('visualization transforms', () => {
  it('keeps missing smoking and craving values as null', () => {
    const rows=[checkin('2026-01-03',4,3)]
    const smoking=buildSmokingTrend(rows,profile,'7d','2026-01-03');const craving=buildCravingTrend(rows,profile,'7d','2026-01-03')
    expect(smoking[smoking.length-2]?.cigarettes).toBeNull()
    expect(craving[craving.length-2]?.craving).toBeNull()
  })
  it('keeps heatmap missing as an independent state', () => {
    const point=buildHeatmapData([],profile,'7d','2026-01-07')[0]
    expect(point).toMatchObject({status:'missing',intensity:-1,cigarettes:null})
  })
  it('calculates heatmap intensity relative to baseline', () => {
    const rows=[0,5,10,15,20,21].map((value,index)=>checkin(`2026-01-${String(index+1).padStart(2,'0')}`,value))
    expect(buildHeatmapData(rows,profile,'7d','2026-01-06').slice(1).map((point)=>point.intensity)).toEqual([0,1,2,3,4,5])
  })
  it('ends savings trend at the same savedMoney as statistics', () => {
    const rows=[checkin('2026-01-01',5),checkin('2026-01-02',10)]
    const trend=buildSavingsTrend(rows,profile,'all','2026-01-02')
    expect(trend[trend.length-1]?.savedMoney).toBe(calculateSmokingStatistics(profile,rows,'2026-01-02').savedMoney)
  })
  it.each<[TimeRange,number]>([['7d',7],['30d',30],['90d',90],['180d',180],['1y',365]])('returns %s as natural calendar days', (range,days) => {
    expect(getTimeRangeDates(range,profile.quitStartDate,'2026-12-31').days).toBe(days)
  })
  it('returns all days since quit start for all', () => {
    expect(getTimeRangeDates('all','2026-12-01','2026-12-31').days).toBe(31)
  })
})
