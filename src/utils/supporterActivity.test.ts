import { describe, expect, it } from 'vitest'
import { buildSupporterActivityWeek, summarizeSupporterActivity } from '@/utils/supporterActivity'
import type { EncouragementModel } from '@/types/domain'

const item=(id:string,createdAt:string):EncouragementModel=>({id,familyId:'f1',fromUserId:'u1',toUserId:'u2',type:'heart',message:'',createdAt,fromNickname:'妈妈'})
describe('summarizeSupporterActivity',()=>{
  it('summarizes today, recent seven days and active days',()=>{const result=summarizeSupporterActivity([item('1','2026-09-05T02:00:00Z'),item('2','2026-09-03T02:00:00Z'),item('3','2026-08-20T02:00:00Z')],'2026-09-05');expect(result.today).toBe(1);expect(result.recent7Days).toBe(2);expect(result.activeDays).toBe(3)})
  it('ignores future activity',()=>{expect(summarizeSupporterActivity([item('1','2026-09-06T02:00:00Z')],'2026-09-05').recent7Days).toBe(0)})
  it('counts chat messages and reactions through the same activity shape',()=>{const result=summarizeSupporterActivity([item('1','2026-09-05T02:00:00Z'),{createdAt:'2026-09-05T03:00:00Z'}],'2026-09-05');expect(result.today).toBe(2);expect(result.activeDays).toBe(1)})
})
describe('buildSupporterActivityWeek',()=>{
  it('returns seven natural days ending today and combines same-day activity',()=>{const result=buildSupporterActivityWeek([item('1','2026-09-05T02:00:00Z'),item('2','2026-09-05T03:00:00Z'),item('3','2026-09-01T02:00:00Z')],'2026-09-05');expect(result).toHaveLength(7);expect(result[0]?.date).toBe('2026-08-30');expect(result[6]).toMatchObject({date:'2026-09-05',count:2,isToday:true});expect(result.find(day=>day.date==='2026-09-01')?.count).toBe(1)})
})
