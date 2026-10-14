import * as THREE from 'three'
import { createCrystalGeometry } from './crystalGeometry'
import { createSealedCigarette } from './sealedCigarette'
import { createFaceGlyph } from './faceGlyphs'

/** Offline Blender handoff only. Not imported by the application bundle. */
export function createModelBlueprint() {
  const faces = createCrystalGeometry()
  function serialize(mesh: THREE.Mesh, instance?: THREE.Matrix4) {
    const position = mesh.geometry.getAttribute('position'), points: number[][] = []
    const matrix = instance ? mesh.matrixWorld.clone().multiply(instance) : mesh.matrixWorld
    for (let i = 0; i < position.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(matrix).toArray())
    const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial
    return { points, indices: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : Array.from({ length: position.count }, (_, i) => i), color: material.color.getHexString(), metalness: material.metalness ?? 0, roughness: material.roughness ?? .5 }
  }
  const cigarette = createSealedCigarette()
  cigarette.position.set(-.16, -.10, 0); cigarette.rotation.z = .64; cigarette.updateMatrixWorld(true)
  const core: ReturnType<typeof serialize>[] = []
  cigarette.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    if (object instanceof THREE.InstancedMesh) {
      if (object.count === 180) return // replaced by an authored spatial particle stream
      for (let i = 0; i < object.count; i++) { const matrix = new THREE.Matrix4(); object.getMatrixAt(i, matrix); core.push(serialize(object, matrix)) }
    } else core.push(serialize(object))
  })
  const glyphs = faces.filter(face => face.moduleId && face.moduleId !== 'reserved').map(face => {
    const group = createFaceGlyph(face.moduleId!)
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), face.normal)
    group.position.copy(face.center).add(new THREE.Vector3(0, .67, -.015).applyQuaternion(group.quaternion))
    group.scale.setScalar(.56); group.updateMatrixWorld(true)
    const meshes: ReturnType<typeof serialize>[] = []
    group.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(serialize(object)) })
    return { id: face.moduleId, meshes }
  })
  const result = { schema: 1, coordinateSystem: 'Three.js Y-up', faces: faces.map(face => ({ id: face.id, moduleId: face.moduleId ?? null, center: face.center.toArray(), normal: face.normal.toArray(), vertices: face.vertices.map(v => v.toArray()) })), core, glyphs }
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
  cigarette.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m)) })
  faces.forEach(f => f.geometry.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose())
  return result
}
