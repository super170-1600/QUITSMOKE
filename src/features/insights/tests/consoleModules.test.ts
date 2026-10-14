import {describe,it,expect} from 'vitest'
import {calculateInsights} from '../domain/metrics'
import {consoleModules} from '../adapters/consoleModules'
const settings={quitStartDate:'2026-10-01',timezone:'Asia/Shanghai',baselineCigarettesPerDay:'20',packPrice:'30',cigarettesPerPack:20,currency:'CNY'}
describe('account console mapping',()=>{
 it('empty account retains missing values, never demo series',()=>{const snapshot=calculateInsights([],settings,'2026-10-03'),modules=consoleModules(snapshot);expect(modules[0]!.values).toEqual([null,null,null]);expect(modules[1]!.summary).toBe('—');expect(modules[1]!.values).toEqual([null,null,null])})
 it('maps actual quantities and scores from the same snapshot',()=>{const snapshot=calculateInsights([{date:'2026-10-01',cigarettesCount:3,cravingScore:9},{date:'2026-10-03',cigarettesCount:0,cravingScore:2}],settings,'2026-10-03'),modules=consoleModules(snapshot);expect(modules[0]!.values).toEqual([3,null,0]);expect(modules[1]!.values).toEqual([9,null,2]);expect(modules[2]!.summary).toContain(snapshot.summary.savings.estimatedAmount!);expect(modules[3]!.values).toEqual([null,null,null,null])})
})
