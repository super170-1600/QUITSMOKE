import {Vector2} from 'three'
const measuredSize=new Vector2()
interface SurfaceRenderer {
  getSize(target:Vector2): {x:number;y:number}
  setSize(width:number,height:number,updateStyle:boolean): void
}
/** Reassigning canvas dimensions clears its drawing buffer, even when dimensions match. */
export function resizeSurface(renderer:SurfaceRenderer,width:number,height:number):boolean {
  if(width<=0||height<=0)return false
  const size=renderer.getSize(measuredSize)
  if(size.x===width&&size.y===height)return false
  renderer.setSize(width,height,false)
  return true
}
