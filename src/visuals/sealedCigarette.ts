import * as THREE from 'three'

export function createSealedCigarette() {
  const group = new THREE.Group()
  const paper = new THREE.MeshStandardMaterial({ color: '#faf9f4', roughness: .74 })
  const filter = new THREE.MeshStandardMaterial({ color: '#98602d', roughness: .84 })
  const ash = new THREE.MeshStandardMaterial({ color: '#211e1b', roughness: .95 })
  const gold = new THREE.MeshStandardMaterial({ color: '#d0ad70', metalness: .3, roughness: .54 })
  function cylinder(length: number, x: number, material: THREE.Material, radius = .095) {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 40)
    if (material === paper) {
      const vertices = geometry.getAttribute('position')
      for (let i = 0; i < vertices.count; i++) {
        if (vertices.getY(i) > -length / 2 + .001) continue
        const angle = Math.atan2(vertices.getZ(i), vertices.getX(i))
        vertices.setY(i, vertices.getY(i) + .030 * (1 + Math.sin(angle * 7)) + .014 * Math.cos(angle * 11))
      }
      vertices.needsUpdate = true; geometry.computeVertexNormals()
    }
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.z = Math.PI / 2; mesh.position.x = x; group.add(mesh)
  }
  cylinder(.46, -.60, filter)
  cylinder(1.03, .145, paper)
  cylinder(.022, -.36, gold, .097)
  cylinder(.014, -.40, gold, .097)
  cylinder(.014, .655, ash, .081)
  // Fine longitudinal paper seam and small filter speckles, all real geometry.
  const seam = new THREE.Mesh(new THREE.BoxGeometry(.97, .0015, .003), new THREE.MeshStandardMaterial({ color: '#c9c3b9', roughness: .9 }))
  seam.position.set(.14, .072, .061); group.add(seam)
  let seed = 47
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  const speckle = new THREE.InstancedMesh(new THREE.SphereGeometry(.003, 5, 4), new THREE.MeshBasicMaterial({ color: '#d5b789' }), 100)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < 100; i++) {
    const angle = random() * Math.PI * 2
    dummy.position.set(-.81 + random() * .42, Math.cos(angle) * .096, Math.sin(angle) * .096)
    dummy.scale.setScalar(.6 + random()); dummy.updateMatrix(); speckle.setMatrixAt(i, dummy.matrix)
  }
  group.add(speckle)
  const debris = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), ash, 180)
  for (let i = 0; i < 180; i++) {
    const coarse = i < 22, medium = i < 70
    const t = random() ** (coarse ? 3 : 1.8)
    const spread = .14 + t * .58
    dummy.position.set(.65 + t * .58, (random() - .5) * spread, (random() - .5) * spread)
    dummy.rotation.set(random() * 6, random() * 6, random() * 6)
    const size = coarse ? .016 + random() * .024 : medium ? .008 + random() * .012 : .002 + random() * .006
    dummy.scale.set(size, size * (.5 + random()), size * (.6 + random())); dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix)
  }
  group.add(debris)
  group.rotation.set(.14, -.12, .36)
  return group
}
