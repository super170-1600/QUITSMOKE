import { describe,it,expect } from 'vitest'
import { CatmullRomCurve3, Vector3 } from 'three'
import { curvePhase } from './hubPhotons'
describe('continuous optical trajectories',()=>{
  it('keeps reverse and long-running motion inside an open curve domain',()=>{
    const curve=new CatmullRomCurve3([new Vector3(0,0,0),new Vector3(1,1,0),new Vector3(2,0,1)])
    for(const time of [-10,0,10,1000,86400]) for(const speed of [-.011,.006,.065]){
      const t=curvePhase(.17,time,speed)
      expect(t).toBeGreaterThanOrEqual(0);expect(t).toBeLessThan(1)
      expect(curve.getPointAt(t).toArray().every(Number.isFinite)).toBe(true)
    }
  })
})
