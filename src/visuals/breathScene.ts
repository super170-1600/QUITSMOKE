import * as THREE from 'three'

export interface BreathScene {
  setPointer(x: number, y: number): void
  setHover(value: boolean): void
  setReducedMotion(value: boolean): void
  begin(): void
  reset(): void
  dispose(): void
}
interface Options {
  reducedMotion: boolean
  onPortalPosition(x: number, y: number): void
  onFailure(): void
}
const smooth = (x: number) => { const v = THREE.MathUtils.clamp(x, 0, 1); return v * v * (3 - 2 * v) }

/** A deliberately choreographed sculpture, rather than an expensive fluid simulation. */
export function createBreathScene(host: HTMLElement, options: Options): BreathScene {
  const scene = new THREE.Scene()
  scene.background = null
  scene.fog = new THREE.Fog('#eeedeb', 20, 43)
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 80)
  camera.position.set(0, 1.5, 19)
  camera.lookAt(0, .6, 0)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  host.appendChild(renderer.domElement)

  const root = new THREE.Group()
  scene.add(root)
  scene.add(new THREE.HemisphereLight('#ffffff', '#a7a4a0', 1.25))
  const key = new THREE.DirectionalLight('#fff8ec', 3)
  key.position.set(-5, 6, 8)
  scene.add(key)
  const rim = new THREE.DirectionalLight('#c5ddf2', 3)
  rim.position.set(5, 4, -3)
  scene.add(rim)
  const front = new THREE.DirectionalLight('#ffffff', .8)
  front.position.set(1, -2, 7)
  scene.add(front)

  // A small studio environment gives silver and glass actual reflected light.
  const studio = new THREE.Scene()
  studio.background = new THREE.Color('#687581')
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
  const lightMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  for (const [x, y, z, sx, sy, sz] of [[-7, 3, 0, 1, 8, 5], [6, 5, -4, 2, 9, 1], [0, 9, 0, 9, 1, 3]]) {
    const panel = new THREE.Mesh(boxGeometry, lightMaterial)
    panel.position.set(x!, y!, z!); panel.scale.set(sx!, sy!, sz!)
    studio.add(panel)
  }
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(studio, .08)
  scene.environment = environment.texture
  boxGeometry.dispose(); lightMaterial.dispose(); pmrem.dispose()

  const textures: THREE.Texture[] = []
  function glowTexture(shadow = false) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, shadow ? 'rgba(55,48,43,.30)' : 'rgba(255,245,222,.8)')
    gradient.addColorStop(.24, shadow ? 'rgba(55,48,43,.16)' : 'rgba(255,244,225,.36)')
    gradient.addColorStop(1, shadow ? 'rgba(55,48,43,0)' : 'rgba(255,244,225,0)')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    textures.push(texture)
    return texture
  }
  const glowMap = glowTexture()
  const shadowMap = glowTexture(true)
  const groundShadow = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: .6 }))
  groundShadow.rotation.x = -Math.PI / 2
  groundShadow.position.set(1, -2.55, 0)
  root.add(groundShadow)

  const portal = new THREE.Group()
  portal.position.set(-3.65, .85, .6)
  root.add(portal)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, transparent: true, depthWrite: false, opacity: .65 }))
  halo.scale.set(5.7, 5.7, 1)
  portal.add(halo)
  const ringMaterials: THREE.MeshBasicMaterial[] = []
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshBasicMaterial({ color: i % 2 ? '#fffaf0' : '#aa9474', transparent: true, opacity: .22 + (i === 1 ? .2 : 0), depthWrite: false })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.94 + i * .115, .01 + (i === 1 ? .005 : 0), 6, 140), material)
    ring.rotation.set(.09 * i, -.08 * i, .3 * i)
    portal.add(ring); ringMaterials.push(material)
  }
  const portalCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, transparent: true, depthWrite: false, opacity: .7 }))
  portalCore.scale.set(1.5, 1.5, 1)
  portal.add(portalCore)

  const cigarette = new THREE.Group()
  cigarette.position.set(-2.55, -1.97, 1)
  cigarette.rotation.z = .19
  root.add(cigarette)
  const paperMaterial = new THREE.MeshStandardMaterial({ color: '#f5f0e7', roughness: .78 })
  const filterMaterial = new THREE.MeshStandardMaterial({ color: '#bc8750', roughness: .76 })
  const ashMaterial = new THREE.MeshStandardMaterial({ color: '#514b46', roughness: 1 })
  const cut = { value: 1.65 }
  for (const [material, center] of [[paperMaterial, .28], [filterMaterial, -1.25], [ashMaterial, 1.37]] as const) {
    material.onBeforeCompile = shader => {
      shader.uniforms.uCut = cut
      shader.vertexShader = `varying float vCutX;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>\nvCutX = ${center.toFixed(2)} - transformed.y;`)
      shader.fragmentShader = `uniform float uCut;\nvarying float vCutX;\n${shader.fragmentShader}`.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat cutGrain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453);\nif(vCutX + cutGrain * .065 > uCut) discard;')
    }
    material.customProgramCacheKey = () => `cover-cut-${center}`
  }
  function cylinder(length: number, x: number, material: THREE.Material, radius = .14) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), material)
    mesh.rotation.z = Math.PI / 2; mesh.position.x = x
    cigarette.add(mesh)
    return mesh
  }
  cylinder(1, -1.25, filterMaterial)
  cylinder(2.05, .28, paperMaterial)
  cylinder(.2, 1.37, ashMaterial, .145)
  const seamMaterial = new THREE.MeshStandardMaterial({ color: '#d5b280', roughness: .65 })
  cylinder(.027, -.72, seamMaterial, .143)
  cylinder(.02, -.79, seamMaterial, .143)
  const paperSeam = new THREE.Mesh(new THREE.BoxGeometry(1.95, .003, .004), new THREE.MeshStandardMaterial({ color: '#d1cdc4' }))
  paperSeam.position.set(.26, .115, .08)
  cigarette.add(paperSeam)

  const smoke = new THREE.Group()
  root.add(smoke)
  const ribbons: { mesh: THREE.Mesh; positions: Float32Array; original: Float32Array; phase: number }[] = []
  const segments = 150
  for (let ribbon = 0; ribbon < 17; ribbon++) {
    const positions = new Float32Array((segments + 1) * 2 * 3)
    const uv = new Float32Array((segments + 1) * 4)
    const indices: number[] = []
    const offset = ribbon * .36
    const width = ribbon % 4 === 0 ? .13 : .10 + (ribbon % 3) * .055
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * Math.PI * 3.1 + offset * .52 * Math.sin(t * Math.PI)
      const radius = Math.sin(t * Math.PI) * (1.6 + ribbon * .035)
      const x = .9 + Math.sin(angle) * radius + t * 2.3
      const y = -1.9 + t * 6.2
      const z = Math.cos(angle) * radius * .6 + .1 + Math.sin(offset) * .14
      const taper = Math.sin(Math.PI * t) ** .65
      for (let side = 0; side < 2; side++) {
        const p = (i * 2 + side) * 3
        const w = (side ? 1 : -1) * width * taper
        positions[p] = x + Math.cos(angle) * w
        positions[p + 1] = y + Math.sin(offset) * .1 * taper
        positions[p + 2] = z + Math.sin(angle) * w
        uv[(i * 2 + side) * 2] = t; uv[(i * 2 + side) * 2 + 1] = side
      }
      if (i < segments) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    geometry.setIndex(indices); geometry.computeVertexNormals()
    const material = new THREE.MeshPhysicalMaterial({
      color: ribbon % 4 === 0 ? '#c6d2dc' : '#e4e9ed',
      metalness: ribbon % 4 === 0 ? .8 : .32,
      roughness: ribbon % 4 === 0 ? .21 : .12,
      transmission: ribbon % 4 === 0 ? 0 : .55,
      thickness: .13, ior: 1.3, clearcoat: .85,
      transparent: true, opacity: ribbon % 4 === 0 ? .62 : .64,
      side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.1,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    smoke.add(mesh)
    ribbons.push({ mesh, positions, original: positions.slice(), phase: offset })
  }

  // Seeded randomness makes revisions and screenshots reproducible.
  let seed = 9173
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  const particleCount = 650
  const particleBase = new Float32Array(particleCount * 3)
  const particlePositions = new Float32Array(particleCount * 3)
  const particleColors = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount; i++) {
    const t = random() ** 2
    const spread = .2 + t * 1.8
    particleBase[i * 3] = -1 + t * 4.7 + (random() - .5) * spread
    particleBase[i * 3 + 1] = -2 + t * 4.7 + (random() - .5) * spread
    particleBase[i * 3 + 2] = (random() - .5) * 2
    const color = new THREE.Color(i < 460 ? '#57524d' : '#faf6ef')
    color.toArray(particleColors, i * 3)
  }
  particlePositions.set(particleBase)
  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3).setUsage(THREE.DynamicDrawUsage))
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))
  const particleMaterial = new THREE.PointsMaterial({ size: .044, vertexColors: true, transparent: true, opacity: .7, depthWrite: false, sizeAttenuation: true })
  const particles = new THREE.Points(particleGeometry, particleMaterial)
  particles.frustumCulled = false
  root.add(particles)

  // Actual small fragments at the source, with airy pinpoints farther up the flow.
  const granuleGeometry = new THREE.IcosahedronGeometry(1, 0)
  const granuleMaterial = new THREE.MeshStandardMaterial({ color: '#4f4943', roughness: .88, transparent: true })
  const granules = new THREE.InstancedMesh(granuleGeometry, granuleMaterial, 110)
  granules.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  granules.frustumCulled = false
  const granuleData = Array.from({ length: 110 }, () => {
    const t = random() ** 2
    return { x: -1.05 + t * 2.5 + (random() - .5) * (.25 + t * .8), y: -2 + t * 2.6 + (random() - .5) * .3, z: (random() - .5) * .9, size: .012 + random() ** 3 * .065, phase: random() * 6 }
  })
  root.add(granules)

  const bridgeMaterial = new THREE.LineBasicMaterial({ color: '#d4c5ac', transparent: true, opacity: .14, depthWrite: false })
  const bridges: { line: THREE.Line; positions: Float32Array; lane: number }[] = []
  for (let lane = 0; lane < 6; lane++) {
    const positions = new Float32Array(90 * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
    const line = new THREE.Line(geometry, bridgeMaterial)
    line.frustumCulled = false
    root.add(line); bridges.push({ line, positions, lane })
  }

  const shardsCount = 230
  const shardGeometry = new THREE.IcosahedronGeometry(1, 0)
  const shardMaterial = new THREE.MeshStandardMaterial({ roughness: .9, transparent: true })
  const shards = new THREE.InstancedMesh(shardGeometry, shardMaterial, shardsCount)
  shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  shards.frustumCulled = false
  const shardData = Array.from({ length: shardsCount }, (_, i) => ({
    x: -1.65 + random() * 3.15, angle: random() * Math.PI * 2,
    size: .015 + random() * .055, vx: (random() - .5) * 3,
    vy: .5 + random() * 2.3, vz: (random() - .5) * 2,
    spin: random() * 5, delay: i / shardsCount * .2,
  }))
  shardData.forEach((s, i) => shards.setColorAt(i, new THREE.Color(s.x < -.72 ? '#bc8750' : s.x > 1.1 ? '#4a4540' : '#e6dfd3')))
  shards.visible = false
  cigarette.add(shards)
  const beads = new THREE.Group()
  const beadGeometry = new THREE.SphereGeometry(1, 12, 8)
  const beadMaterial = new THREE.MeshPhysicalMaterial({ color: '#f8f5ee', metalness: .28, roughness: .1, transmission: .35, thickness: .2, transparent: true, opacity: .65 })
  const beadData: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number }[] = []
  for (let i = 0; i < 30; i++) {
    const t = random()
    const angle = t * Math.PI * 3.1 + .6
    const base = new THREE.Vector3(1.1 + t * 2.5 + Math.sin(angle) * 1.9, -1.5 + t * 5.5, Math.cos(angle) * 1.3)
    const mesh = new THREE.Mesh(beadGeometry, beadMaterial)
    mesh.scale.setScalar(.02 + random() ** 3 * .095)
    mesh.position.copy(base); beads.add(mesh)
    beadData.push({ mesh, base, phase: random() * 6 })
  }
  root.add(beads)

  let mobile = false
  let reduced = options.reducedMotion
  let hovered = false
  let hoverAmount = 0
  let enteringAt: number | null = null
  let disposed = false
  let frame = 0
  let elapsed = 0
  let previous = performance.now()
  const pointer = new THREE.Vector2()
  const easedPointer = new THREE.Vector2()
  const dummy = new THREE.Object3D()
  const destination = new THREE.Vector3()
  function resize() {
    const width = host.clientWidth, height = host.clientHeight
    if (!width || !height || disposed) return
    mobile = width < 700
    camera.aspect = width / height
    camera.position.set(mobile ? .2 : 0, mobile ? 1.8 : 1.5, mobile ? 23 : 19)
    camera.lookAt(mobile ? .2 : 0, .6, 0)
    camera.updateProjectionMatrix()
    root.scale.setScalar(mobile ? .86 : Math.min(1.15, camera.aspect / 1.55))
    portal.position.set(mobile ? -2.1 : -3.65, mobile ? 2 : .85, .6)
    cigarette.position.set(mobile ? -.5 : -2.55, -1.97, 1)
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.4 : 1.75))
    renderer.setSize(width, height)
    root.updateMatrixWorld(true)
    const screen = portal.getWorldPosition(new THREE.Vector3()).project(camera)
    options.onPortalPosition((screen.x + 1) / 2, (1 - screen.y) / 2)
    render(performance.now())
  }
  function render(now: number) {
    if (disposed) return
    const dt = Math.min((now - previous) / 1000, .05)
    previous = now
    if (!reduced) elapsed += dt
    const progress = enteringAt === null ? 0 : THREE.MathUtils.clamp((now - enteringAt) / 2450, 0, 1)
    const breakup = smooth((progress - .05) / .42)
    const gathering = smooth((progress - .3) / .65)
    hoverAmount += ((hovered ? 1 : 0) - hoverAmount) * (1 - Math.exp(-dt * 5))
    easedPointer.lerp(pointer, 1 - Math.exp(-dt * 3))
    const breath = reduced ? 0 : Math.sin(elapsed * .65) * .018
    smoke.scale.set(1 + breath, 1 + breath * .5, 1)
    smoke.rotation.y = reduced ? 0 : easedPointer.x * .035
    smoke.rotation.x = reduced ? 0 : easedPointer.y * .018
    portal.scale.setScalar(1 + hoverAmount * .04 + gathering * .12)
    portal.rotation.z = reduced ? 0 : Math.sin(elapsed * .18) * .055
    halo.material.opacity = .5 + hoverAmount * .18 + gathering * .15
    portalCore.material.opacity = .6 + hoverAmount * .2
    ringMaterials.forEach((material, i) => { material.opacity = (.24 + (i === 1 ? .22 : 0)) * (1 + hoverAmount * .5 + gathering * .6) })
    destination.copy(portal.position)
    for (const ribbon of ribbons) {
      const { positions, original, phase } = ribbon
      for (let i = 0; i < positions.length; i += 3) {
        const t = Math.floor(i / 6) / segments
        const movement = Math.sin(elapsed * .32 + t * 8 + phase) * .055 * Math.sin(t * Math.PI)
        const gather = smooth((gathering - t * .12) / .88)
        positions[i] = THREE.MathUtils.lerp(original[i]! + movement, destination.x + Math.sin(t * 14 + phase) * (1 - gather) * .25, gather)
        positions[i + 1] = THREE.MathUtils.lerp(original[i + 1]! + movement * .6, destination.y + Math.cos(t * 12 + phase) * (1 - gather) * .25, gather)
        positions[i + 2] = THREE.MathUtils.lerp(original[i + 2]!, destination.z, gather)
      }
      ribbon.mesh.geometry.attributes.position!.needsUpdate = true
      // Recompute lighting normals less often; the resting sculpture retains its highlights.
      if (enteringAt !== null) ribbon.mesh.geometry.computeVertexNormals()
      const material = ribbon.mesh.material as THREE.MeshPhysicalMaterial
      material.opacity = (Math.round(ribbon.phase / .36) % 4 === 0 ? .62 : .64) * (1 - smooth((progress - .78) / .2))
    }
    for (let i = 0; i < particleCount; i++) {
      const p = i * 3
      const drift = reduced ? 0 : Math.sin(elapsed * .3 + i * .8) * .045
      particlePositions[p] = particleBase[p]! + drift + breakup * Math.sin(i * 2.1) * 1.5
      particlePositions[p + 1] = particleBase[p + 1]! + drift * .8 + breakup * (.4 + (i % 13) / 10)
      particlePositions[p + 2] = particleBase[p + 2]! + breakup * Math.cos(i) * .5
    }
    particleGeometry.attributes.position!.needsUpdate = true
    particleMaterial.opacity = .65 * (1 - smooth((progress - .13) / .5))
    granuleData.forEach((g, i) => {
      const drift = reduced ? 0 : Math.sin(elapsed * .35 + g.phase) * .018
      dummy.position.set(g.x + drift + breakup * Math.cos(g.phase) * 1.6, g.y + drift + breakup * .8, g.z + breakup * Math.sin(g.phase) * .4)
      dummy.rotation.set(g.phase + drift, g.phase * 2, g.phase)
      dummy.scale.setScalar(g.size * (1 - smooth((progress - .18) / .5)))
      dummy.updateMatrix(); granules.setMatrixAt(i, dummy.matrix)
    })
    granules.instanceMatrix.needsUpdate = true
    granuleMaterial.opacity = .8 * (1 - smooth((progress - .13) / .5))
    bridgeMaterial.opacity = (.1 + hoverAmount * .22 + gathering * .12) * (1 - smooth((progress - .78) / .2))
    for (const bridge of bridges) {
      for (let i = 0; i < 90; i++) {
        const t = i / 89
        const curve = Math.sin(t * Math.PI)
        bridge.positions[i * 3] = THREE.MathUtils.lerp(destination.x, 1.5, t)
        bridge.positions[i * 3 + 1] = THREE.MathUtils.lerp(destination.y, .15, t) + curve * (.25 + bridge.lane * .08) + Math.sin(elapsed * .24 + t * 5 + bridge.lane) * .015 * curve
        bridge.positions[i * 3 + 2] = curve * (.4 + bridge.lane * .035)
      }
      bridge.line.geometry.attributes.position!.needsUpdate = true
    }
    for (const bead of beadData) {
      bead.mesh.position.set(
        THREE.MathUtils.lerp(bead.base.x + Math.sin(elapsed * .35 + bead.phase) * .04, destination.x, gathering),
        THREE.MathUtils.lerp(bead.base.y + Math.cos(elapsed * .4 + bead.phase) * .045, destination.y, gathering),
        THREE.MathUtils.lerp(bead.base.z, destination.z, gathering),
      )
    }
    beadMaterial.opacity = .65 * (1 - gathering)
    const dissolved = smooth((progress - .03) / .35)
    cut.value = THREE.MathUtils.lerp(1.65, -1.85, dissolved)
    for (const child of cigarette.children) if (child !== shards) child.visible = dissolved < .88
    cigarette.scale.setScalar(1 - dissolved * .06)
    shards.visible = enteringAt !== null && progress < .8
    if (shards.visible) {
      shardData.forEach((s, i) => {
        const t = smooth((progress - s.delay * .3) / .6)
        dummy.position.set(s.x + s.vx * t, Math.cos(s.angle) * .12 + s.vy * t, Math.sin(s.angle) * .12 + s.vz * t)
        dummy.rotation.set(t * s.spin, t * s.spin * .7, t * 3)
        const released = smooth((s.x - cut.value + .08) / .15)
        dummy.scale.setScalar(s.size * released * (1 - smooth((progress - .52) / .28)))
        dummy.updateMatrix(); shards.setMatrixAt(i, dummy.matrix)
      })
      shards.instanceMatrix.needsUpdate = true
      shardMaterial.opacity = 1 - smooth((progress - .4) / .4)
    }
    groundShadow.material.opacity = .6 * (1 - dissolved)
    renderer.render(scene, camera)
  }
  function tick(now: number) {
    if (disposed) return
    if (!document.hidden) render(now)
    else previous = now
    if (!reduced || enteringAt !== null) frame = requestAnimationFrame(tick)
    else frame = 0
  }
  function wake() { if (!frame && !disposed) { previous = performance.now(); frame = requestAnimationFrame(tick) } }
  function contextLost(event: Event) { event.preventDefault(); options.onFailure() }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize(); wake()
  return {
    setPointer(x, y) { pointer.set(x, y) },
    setHover(value) { hovered = value; if (!reduced) wake() },
    setReducedMotion(value) { reduced = value; if (value) pointer.set(0, 0); wake() },
    begin() { enteringAt = performance.now(); wake() },
    reset() { enteringAt = null; hovered = false; render(performance.now()); wake() },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame); observer.disconnect()
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
      scene.traverse(object => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) geometries.add(mesh.geometry)
        if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m)
      })
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose())
      textures.forEach(t => t.dispose()); environment.dispose()
      renderer.dispose(); renderer.domElement.remove()
    },
  }
}
