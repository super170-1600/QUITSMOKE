import {describe,it,expect} from 'vitest'
import {archiveDates,archiveWeekDates,decodePulseNote,encodePulseNote,validatePulseDate} from './dailyPulse'
describe('Pulse compatibility and calendar dates',()=>{
 it('round trips real score and mood without changing old notes',()=>{expect(decodePulseNote(encodePulseNote('感受',0,'calm'))).toEqual({note:'感受',cravingScore:0,mood:'calm'});expect(decodePulseNote('历史备注')).toEqual({note:'历史备注',cravingScore:undefined,mood:undefined})})
 it('rejects invalid ranges and oversized notes',()=>{expect(()=>encodePulseNote('',11,'calm')).toThrow();expect(()=>encodePulseNote('字'.repeat(161),5,'tired')).toThrow()})
 it('keeps 28 fixed slots over leap dates and year boundaries',()=>{const dates=archiveDates('2024-03-01');expect(dates).toHaveLength(28);expect(dates[26]).toBe('2024-02-29');expect(archiveDates('2026-01-05')[0]).toBe('2025-12-09');expect(archiveDates('2026-01-05',1)[27]).toBe('2025-12-08')})
 it('blocks future, invalid, and pre-plan dates',()=>{expect(()=>validatePulseDate('2026-10-14','2026-09-01','2026-10-13')).toThrow();expect(()=>validatePulseDate('2026-02-30','2026-01-01')).toThrow();expect(()=>validatePulseDate('2026-08-01','2026-09-01')).toThrow();expect(()=>validatePulseDate('2026-10-12','2026-09-01','2026-10-13')).not.toThrow()})
})

describe('Seven-week archive',()=>{
 it('groups 49 slots into Monday–Sunday weeks, including unrecordable future slots',()=>{const dates=archiveWeekDates('2026-10-13');expect(dates).toHaveLength(49);expect(dates[0]).toBe('2026-08-31');expect(dates[42]).toBe('2026-10-12');expect(dates[48]).toBe('2026-10-18');expect(archiveWeekDates('2026-10-13',1)[48]).toBe('2026-08-30')})
})