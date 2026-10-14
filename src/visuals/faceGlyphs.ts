import * as THREE from 'three'
import type { HubFaceId } from '@/config/hubModules'

/** Glyph coordinates: x/y are in the face plane; z straddles the glass surface. */
export function createFaceGlyph(id: HubFaceId) {
  const group = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: '#c4c8cb', metalness: .75, roughness: .26 })
  const warm = new THREE.MeshStandardMaterial({ color: '#d3c6b2', metalness: .72, roughness: .28 })
  const glass = new THREE.MeshPhysicalMaterial({ color: '#d9e5e8', metalness: .06, roughness: .10, transmission: .35, thickness: .1, transparent: true, opacity: .92 })
  function ring(radius: number, thickness: number, z: number, material: THREE.Material = metal) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 10, 72), material)
    mesh.position.z = z; group.add(mesh); return mesh
  }
  function bar(x: number, y: number, width: number, height: number, z: number, material: THREE.Material = metal) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, .055), material)
    mesh.position.set(x, y, z); group.add(mesh); return mesh
  }
  function link(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 12), material)
    mesh.position.copy(a).add(b).multiplyScalar(.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); group.add(mesh)
  }
  if (id === 'checkin') {
    ring(.24, .027, .015); ring(.29, .006, -.015, warm)
    link(new THREE.Vector3(-.115, 0, .038), new THREE.Vector3(-.025, -.075, .038), .017, metal)
    link(new THREE.Vector3(-.025, -.075, .038), new THREE.Vector3(.13, .10, .038), .017, metal)
  } else if (id === 'progress') {
    for (const [x, height] of [[-.19, .15], [-.06, .25], [.07, .37], [.20, .48]]) {
      bar(x!, -.22 + height! / 2, .064, height!, .015, metal)
      bar(x!, -.22 + height! / 2, .032, height! - .02, .045, warm)
    }
    link(new THREE.Vector3(-.27, -.23, .04), new THREE.Vector3(.28, -.23, .04), .008, metal)
    const points = [new THREE.Vector3(-.22, -.03, .095), new THREE.Vector3(-.07, .055, .095), new THREE.Vector3(.07, .14, .095), new THREE.Vector3(.22, .25, .095)]
    for (let i = 0; i < 3; i++) link(points[i]!, points[i + 1]!, .008, warm)
  } else if (id === 'achievements') {
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(.215, .215, .045, 8), metal)
    badge.rotation.x = Math.PI / 2; badge.rotation.z = Math.PI / 8; group.add(badge)
    ring(.255, .008, -.018, warm)
    const star = new THREE.Shape()
    for (let i = 0; i < 10; i++) { const angle = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .066 : .143; const x = Math.cos(angle) * r, y = Math.sin(angle) * r; if (!i) star.moveTo(x, y); else star.lineTo(x, y) }
    star.closePath()
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: .018, bevelEnabled: true, bevelSize: .005, bevelThickness: .003, bevelSegments: 1, steps: 1 }), warm)
    mesh.position.z = .025; group.add(mesh)
  } else if (id === 'support') {
    const nodes = [new THREE.Vector3(-.21, -.13, .03), new THREE.Vector3(.21, -.13, .03), new THREE.Vector3(0, .23, .03)]
    for (let i = 0; i < 3; i++) { link(nodes[i]!, nodes[(i + 1) % 3]!, .009, warm); const node = new THREE.Mesh(new THREE.SphereGeometry(.066, 24, 16), glass); node.position.copy(nodes[i]!); group.add(node) }
  } else if (id === 'profile') {
    ring(.26, .011, -.01); ring(.19, .016, .015, warm); ring(.12, .007, .035)
    bar(0, 0, .092, .12, .042, glass)
  }
  // reserved deliberately produces no geometry, symbol, or label.
  return group
}
