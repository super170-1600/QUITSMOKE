import {describe,it,expect} from 'vitest'
import {Quaternion,Vector3,Euler} from 'three'
import {createCrystalGeometry} from './crystalGeometry'
import {nearestHubFace,alignedHubRotation,validHubFaces} from './hubInteraction'
import type {HubFaceId} from '@/config/hubModules'
describe('crystal magnetic navigation',()=>{
  const faces=createCrystalGeometry(),normals=new Map<HubFaceId,Vector3>(faces.filter(f=>f.moduleId).map(f=>[f.moduleId!,f.normal]))
  it('aligns all five independent tilted faces accurately, preserving a unit rotation',()=>{
    const initial=new Quaternion().setFromEuler(new Euler(.47,-.66,-.08)),view=new Vector3(0,.9,8.7).normalize()
    for(const id of validHubFaces){const target=alignedHubRotation(normals.get(id)!,initial,view);expect(normals.get(id)!.clone().applyQuaternion(target).dot(view)).toBeCloseTo(1,10);expect(nearestHubFace(normals,target,view)).toBe(id);expect(target.length()).toBeCloseTo(1,10)}
  })
  it('never attracts to the blank reserved face, even when it faces the camera',()=>{
    const view=new Vector3(0,0,1),rotation=alignedHubRotation(normals.get('reserved')!,new Quaternion(),view)
    expect(validHubFaces).not.toContain('reserved');expect(nearestHubFace(normals,rotation,view)).not.toBe('reserved')
  })
})
