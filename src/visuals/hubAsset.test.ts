import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createCrystalGeometry } from './crystalGeometry'

const buffer = readFileSync(new URL('../../public/models/quitsmoke-seal-study.glb', import.meta.url))
const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString())
describe('Blender seal asset contract', () => {
  it('exports six independent navigation meshes with pivots, stable IDs and a reserved blank face', () => {
    expect(buffer.readUInt32LE(0)).toBe(0x46546c67)
    const faces = gltf.nodes.filter((n: any) => n.extras?.assetRole === 'face')
    const baseline=createCrystalGeometry()
    expect(faces.map((n: any) => n.extras.faceId).sort()).toEqual(['achievements','checkin','profile','progress','reserved','support'])
    expect(new Set(faces.map((n: any) => n.mesh)).size).toBe(6)
    for (const node of faces) {
      expect(node.translation.length).toBe(3)
      expect(node.extras.navigationNormal.length).toBe(3)
      const expected=baseline.find(f=>f.moduleId===node.extras.faceId)!.normal.toArray()
      expected.forEach((value,axis)=>expect(node.extras.navigationNormal[axis]).toBeCloseTo(value,8))
      expect(node.extras.navigationArea).toBeGreaterThan(1.5)
      expect(node.extras.opticalOutline.length).toBeGreaterThanOrEqual(3)
      expect(node.extras.selectable).toBe(node.extras.faceId !== 'reserved')
    }
    expect(gltf.nodes.filter((n: any) => n.extras?.assetRole === 'glyph')).toHaveLength(5)
    expect(gltf.nodes.some((n: any) => n.name === 'Glyph_reserved')).toBe(false)
    baseline.forEach(f=>f.geometry.dispose())
  })
  it('includes three volume ribbons, two separate seal shards and a spatial carbon flow', () => {
    const ribbons = gltf.nodes.filter((n: any) => n.extras?.assetRole === 'ribbon')
    expect(ribbons).toHaveLength(3)
    for (const node of ribbons) {
      expect(node.extras.closedSection).toBe(true)
      expect(node.extras.anchorFaceId).toBeTruthy()
      expect(node.extras.anchorPosition.length).toBe(3)
      const primitive = gltf.meshes[node.mesh].primitives[0]
      const accessor = gltf.accessors[primitive.attributes.POSITION]
      for (let axis = 0; axis < 3; axis++) expect(accessor.max[axis] - accessor.min[axis]).toBeGreaterThan(.1)
    }
    expect(gltf.nodes.filter((n: any) => n.extras?.assetRole === 'sealShard')).toHaveLength(2)
    expect(gltf.nodes.find((n: any) => n.extras?.assetRole === 'carbon').extras.particleCount).toBe(230)
  })
  it('bundles normal textures and PBR transmission without external texture requests', () => {
    expect(gltf.extensionsUsed).toContain('KHR_materials_transmission')
    expect(gltf.materials.some((m: any) => m.normalTexture)).toBe(true)
    expect(gltf.images.every((image: any) => image.bufferView !== undefined && !image.uri)).toBe(true)
    expect(buffer.length).toBeLessThan(3_000_000)
  })
  it('keeps exterior volume optics separate from the internal seal and excludes review lights', () => {
    const external=gltf.nodes.find((n:any)=>n.extras?.assetRole==='external')
    expect(external).toBeTruthy()
    const ribbons=gltf.nodes.filter((n:any)=>n.extras?.assetRole==='externalRibbon')
    expect(ribbons).toHaveLength(3)
    for(const node of ribbons){
      expect(external.children).toContain(gltf.nodes.indexOf(node))
      expect(node.extras.closedSection).toBe(true)
      expect(gltf.meshes[node.mesh].primitives[0].attributes.TEXCOORD_0).toBeDefined()
    }
    expect(gltf.nodes.some((n:any)=>n.name?.startsWith('Studio'))).toBe(false)
  })
})
