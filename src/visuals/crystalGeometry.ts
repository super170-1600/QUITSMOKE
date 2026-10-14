import * as THREE from 'three'
import { hubModules, type HubFaceId } from '@/config/hubModules'

export interface CrystalFace {
  id: string
  moduleId?: HubFaceId
  normal: THREE.Vector3
  center: THREE.Vector3
  vertices: THREE.Vector3[]
  geometry: THREE.BufferGeometry
  area: number
}
interface Plane { normal: THREE.Vector3; distance: number; id: string; moduleId?: HubFaceId }

/** Six broad optical windows, twelve edge bevels and eight unequal corner cuts.
 * Only the six broad planes are reserved for navigation.
 */
export function createCrystalGeometry(): CrystalFace[] {
  const distances = [1.12, 1.05, 1.24, 1.06, 1.05, 1.14]
  const tilts = [[-.045, .065, 0], [.035, -.055, .06], [.055, 0, -.065], [.025, -.055, 0], [-.04, .03, -.035], [-.06, 0, .04]] as const
  const planes: Plane[] = hubModules.map((face, index) => ({
    normal: new THREE.Vector3(...face.normal).applyEuler(new THREE.Euler(...tilts[index]!)), distance: distances[index]!, id: face.id, moduleId: face.id,
  }))
  const mainPlanes = [...planes]
  let bevelIndex = 0
  for (const [a, b] of [[0, 1], [0, 2], [1, 2]] as const) {
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const pa = mainPlanes.find(p => p.normal.getComponent(a) * sa > .9)!
      const pb = mainPlanes.find(p => p.normal.getComponent(b) * sb > .9)!
      const weight = [.72, 1.18, .9, 1.30, 1.08, .80, 1.22, .86, .75, 1.15, .92, 1.25][bevelIndex]!
      const cut = [.11, .19, .15, .24, .16, .12, .22, .14, .18, .13, .21, .16][bevelIndex++]!
      const sum = pa.normal.clone().addScaledVector(pb.normal, weight)
      planes.push({ normal: sum.clone().normalize(), distance: (pa.distance + pb.distance * weight - cut) / sum.length(), id: `bevel-${a}-${b}-${sa}-${sb}` })
    }
  }
  let index = 0
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const sum = mainPlanes.find(p => p.normal.x * x > .9)!.normal.clone().multiplyScalar(1 + y * .08)
      .addScaledVector(mainPlanes.find(p => p.normal.y * y > .9)!.normal, 1 + z * .10)
      .addScaledVector(mainPlanes.find(p => p.normal.z * z > .9)!.normal, 1 + x * .06)
    planes.push({ normal: sum.clone().normalize(), distance: (2.74 + [.12, -.11, .04, -.04, .17, -.08, .02, -.14][index++]!) / sum.length(), id: `corner-${x}-${y}-${z}` })
  }
  const points: THREE.Vector3[] = []
  // Leave every navigation window broad despite the asymmetric corner cuts.
  for (const plane of planes) plane.distance *= 1.14
  for (let a = 0; a < planes.length; a++) for (let b = a + 1; b < planes.length; b++) for (let c = b + 1; c < planes.length; c++) {
    const pa = planes[a]!, pb = planes[b]!, pc = planes[c]!
    const cross = new THREE.Vector3().crossVectors(pb.normal, pc.normal)
    const determinant = pa.normal.dot(cross)
    if (Math.abs(determinant) < 1e-7) continue
    const point = cross.multiplyScalar(pa.distance)
      .add(new THREE.Vector3().crossVectors(pc.normal, pa.normal).multiplyScalar(pb.distance))
      .add(new THREE.Vector3().crossVectors(pa.normal, pb.normal).multiplyScalar(pc.distance))
      .divideScalar(determinant)
    if (planes.every(plane => plane.normal.dot(point) <= plane.distance + 1e-6)
      && !points.some(existing => existing.distanceToSquared(point) < 1e-10)) points.push(point)
  }
  return planes.flatMap(plane => {
    const vertices = points.filter(point => Math.abs(plane.normal.dot(point) - plane.distance) < 1e-5).map(point => point.clone())
    // Unequal cuts can make a shallow corner plane redundant; omit empty faces.
    if (vertices.length < 3) return []
    const center = vertices.reduce((sum, point) => sum.add(point), new THREE.Vector3()).divideScalar(vertices.length)
    const helper = Math.abs(plane.normal.y) > .9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)
    const u = new THREE.Vector3().crossVectors(helper, plane.normal).normalize()
    const v = new THREE.Vector3().crossVectors(plane.normal, u).normalize()
    vertices.sort((a, b) => Math.atan2(a.clone().sub(center).dot(v), a.clone().sub(center).dot(u)) - Math.atan2(b.clone().sub(center).dot(v), b.clone().sub(center).dot(u)))
    const positions: number[] = [], normals: number[] = [], uvs: number[] = []
    let area = 0
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i]!, b = vertices[(i + 1) % vertices.length]!
      area += new THREE.Vector3().crossVectors(a.clone().sub(center), b.clone().sub(center)).length() / 2
      for (const point of [center, a, b]) {
        positions.push(...point.toArray()); normals.push(...plane.normal.toArray())
        const local = point.clone().sub(center)
        uvs.push(local.dot(u) / 2.5 + .5, local.dot(v) / 2.5 + .5)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.computeBoundingSphere()
    return [{ id: plane.id, moduleId: plane.moduleId, normal: plane.normal, center, vertices, geometry, area }]
  })
}
