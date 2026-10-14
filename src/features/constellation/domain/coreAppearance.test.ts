import {describe,it,expect} from 'vitest'
import {coreAppearance} from './coreAppearance'
describe('生命核心状态映射',()=>{
 it('吸烟量逐步增加碎粒，未记录不冒充零支成就',()=>{expect(coreAppearance().fragments).toBe(0);expect(coreAppearance({cigarettes:1,score:0,mood:null}).fragments).toBeGreaterThan(0);expect(coreAppearance({cigarettes:20,score:0,mood:null}).fragments).toBeGreaterThan(coreAppearance({cigarettes:2,score:0,mood:null}).fragments)})
 it('焦虑、烦躁、疲惫具有不同色彩、流动和形变',()=>{const states=(['anxious','irritable','tired'] as const).map(mood=>coreAppearance({cigarettes:0,score:5,mood}));expect(new Set(states.map(s=>s.color)).size).toBe(3);expect(new Set(states.map(s=>s.speed)).size).toBe(3);expect(new Set(states.map(s=>s.distortion)).size).toBe(3)})
 it('烟瘾张力随评分变化且不越界',()=>{expect(coreAppearance({cigarettes:0,score:10,mood:'calm'}).tension).toBe(1);expect(coreAppearance({cigarettes:0,score:0,mood:'calm'}).tension).toBe(0)})
})
