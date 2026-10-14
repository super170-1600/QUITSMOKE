import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createCrystalGeometry } from './crystalGeometry'
import { createFaceGlyph } from './faceGlyphs'
import { hubModules } from '@/config/hubModules'

describe('crystal navigation geometry', () => {
  it('has six broad stable main faces and non-degenerate asymmetric bevel and corner facets', () => {
    const faces = createCrystalGeometry()
    expect(faces.filter(face => face.id.startsWith('bevel-')).length).toBeGreaterThanOrEqual(8)
    expect(faces.filter(face => face.id.startsWith('corner-')).length).toBeGreaterThanOrEqual(4)
    expect(faces.filter(face => face.moduleId).map(face => face.moduleId)).toEqual(hubModules.map(face => face.id))
    for (const face of faces) {
      expect(face.area).toBeGreaterThan(0)
      if (face.moduleId) expect(face.area, face.id).toBeGreaterThan(3)
      for (const vertex of face.vertices) expect(Math.abs(vertex.clone().sub(face.center).dot(face.normal))).toBeLessThan(1e-5)
      const position = face.geometry.getAttribute('position')
      const a = new THREE.Vector3().fromBufferAttribute(position, 0), b = new THREE.Vector3().fromBufferAttribute(position, 1), c = new THREE.Vector3().fromBufferAttribute(position, 2)
      expect(new THREE.Vector3().crossVectors(b.sub(a), c.sub(a)).normalize().dot(face.normal)).toBeGreaterThan(.99)
      face.geometry.dispose()
    }
  })
  it('is a closed manifold with each edge shared by exactly two faces', () => {
    const faces = createCrystalGeometry(), edges = new Map<string, number>()
    for (const face of faces) {
      face.vertices.forEach((point, i) => {
        const key = [point, face.vertices[(i + 1) % face.vertices.length]!].map(p => p.toArray().map(v => v.toFixed(5)).join(',')).sort().join('|')
        edges.set(key, (edges.get(key) ?? 0) + 1)
      })
      face.geometry.dispose()
    }
    expect([...edges.values()].every(count => count === 2)).toBe(true)
  })
  it('provides five real geometry glyphs and an entirely blank reserved face', () => {
    for (const module of hubModules) {
      const glyph = createFaceGlyph(module.id)
      expect(glyph.children.length > 0).toBe(module.enabled)
      glyph.traverse(object => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose()) })
    }
  })
})
