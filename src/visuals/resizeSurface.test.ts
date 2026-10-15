import {expect,it,vi} from 'vitest'
import {resizeSurface} from './resizeSurface'
it('resizes the drawing buffer only on actual layout changes',()=>{
 let width=0,height=0
 const renderer={getSize:()=>({x:width,y:height}),setSize:vi.fn((w:number,h:number)=>{width=w;height=h})}
 expect(resizeSurface(renderer,900,600)).toBe(true)
 for(let frame=0;frame<120;frame++)expect(resizeSurface(renderer,900,600)).toBe(false)
 expect(renderer.setSize).toHaveBeenCalledTimes(1)
 expect(resizeSurface(renderer,390,500)).toBe(true)
 expect(renderer.setSize).toHaveBeenCalledTimes(2)
 expect(resizeSurface(renderer,0,0)).toBe(false)
})
