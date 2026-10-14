import {describe,it,expect} from 'vitest'
import {previewData} from '../domain/previewData'
describe('isolated visualization input',()=>{
 it('generates dated bounded records without mutating its input',()=>{const values={days:28,baseline:20,daily:8,craving:7,price:30};const result=previewData(values,'2026-10-14');expect(result.records).toHaveLength(28);expect(result.records[0]!.date).toBe('2026-09-17');expect(result.records[27]!.date).toBe('2026-10-14');expect(result.records.every(row=>row.cravingScore!>=0&&row.cravingScore!<=10)).toBe(true);expect(values.daily).toBe(8)})
})
