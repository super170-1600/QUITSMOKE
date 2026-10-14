import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createCrystalGeometry } from './crystalGeometry'
import { createSealedCigarette } from './sealedCigarette'
import { createFaceGlyph } from './faceGlyphs'
import { createHubAtmosphere, createSealedVapor } from './hubAtmosphere'
import type { HubFaceId } from '@/config/hubModules'

export const HUB_VIEWS = ['overview', 'front', 'left', 'right', 'back', 'top', 'checkin', 'progress', 'achievements', 'reserved', 'support', 'profile'] as const
export type HubView = typeof HUB_VIEWS[number]
interface Options { view?: HubView; reducedMotion: boolean; debug?: boolean; onFailure(): void }
export interface HubScene { dispose(): void; setReducedMotion(value: boolean): void }

export function createHubScene(host: HTMLElement, options: Options): HubScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = .96
  renderer.info.autoReset = false
  renderer.setClearColor('#f5f5f1', 0)
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const backgroundCanvas = document.createElement('canvas')
  backgroundCanvas.width = backgroundCanvas.height = 256
  const backgroundContext = backgroundCanvas.getContext('2d')!
  const wash = backgroundContext.createLinearGradient(0, 0, 200, 256)
  wash.addColorStop(0, '#fdfaf4'); wash.addColorStop(.42, '#e0e2e5'); wash.addColorStop(1, '#ccd3da')
  backgroundContext.fillStyle = wash; backgroundContext.fillRect(0, 0, 256, 256)
  const warmWash = backgroundContext.createRadialGradient(25, 205, 0, 25, 205, 210)
  warmWash.addColorStop(0, 'rgba(255,242,215,.85)'); warmWash.addColorStop(1, 'rgba(255,250,237,0)')
  backgroundContext.fillStyle = warmWash; backgroundContext.fillRect(0, 0, 256, 256)
  for (const offset of [-80, -12, 68]) {
    const ray = backgroundContext.createLinearGradient(0, offset, 170, offset + 170)
    ray.addColorStop(0, 'rgba(255,255,255,0)'); ray.addColorStop(.46, 'rgba(255,253,245,0)')
    ray.addColorStop(.5, 'rgba(255,253,245,.30)'); ray.addColorStop(.56, 'rgba(255,253,245,0)'); ray.addColorStop(1, 'rgba(255,255,255,0)')
    backgroundContext.fillStyle = ray; backgroundContext.fillRect(0, 0, 256, 256)
  }
  const backgroundMap = new THREE.CanvasTexture(backgroundCanvas)
  backgroundMap.colorSpace = THREE.SRGBColorSpace
  scene.background = backgroundMap
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 50)
  const root = new THREE.Group()
  scene.add(root)

  // Procedural studio softboxes: optical reflections without external assets.
  const studio = new THREE.Scene()
  studio.background = new THREE.Color('#454d58')
  const softbox = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(2) })
  const warmbox = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e9b777').multiplyScalar(2) })
  const box = new THREE.BoxGeometry(1, 1, 1)
  for (const [x, y, z, sx, sy, sz] of [[-4, 3, 2, .35, 6, 3], [4, 1, 3, .16, 5, 2], [0, 6, 0, 6, .3, 4], [-2, -2, -4, 4, 1.5, .1], [-3, 2, -2, .10, 5, 3], [-4, -3, 2, .15, 4, 5], [0, -3, 4, 5, .10, 1]]) {
    const panel = new THREE.Mesh(box, x! < 0 ? warmbox : softbox)
    panel.position.set(x!, y!, z!); panel.scale.set(sx!, sy!, sz!); studio.add(panel)
  }
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(studio, .045)
  scene.environment = environment.texture
  scene.environmentRotation.set(.15, .65, .25)
  pmrem.dispose(); box.dispose(); softbox.dispose(); warmbox.dispose()
  scene.add(new THREE.HemisphereLight('#f7fbff', '#b8ab96', .75))
  const key = new THREE.DirectionalLight('#fff0d8', 2)
  key.position.set(-3, 5, 6); scene.add(key)
  const fill = new THREE.DirectionalLight('#dcecff', 1.3)
  fill.position.set(4, 1, -2); scene.add(fill)
  scene.add(createHubAtmosphere())

  const faces = createCrystalGeometry()
  for (const face of faces) {
    // Subtle optical polishing, not another overlapping glass layer.
    // The selectable plane remains exact; only the shading normal rolls at its edge.
    const positions = face.geometry.getAttribute('position'), normals = face.geometry.getAttribute('normal')
    for (let i = 0; i < positions.count; i++) {
      const offset = new THREE.Vector3().fromBufferAttribute(positions, i).sub(face.center)
      const normal = face.normal.clone().addScaledVector(offset, face.moduleId ? .14 : .60).normalize()
      normals.setXYZ(i, normal.x, normal.y, normal.z)
    }
  }
  // One closed, transmissive shell: no alpha-opacity stack and no painted sheen.
  const shellGeometry = mergeGeometries(faces.filter(face => face.moduleId).map(face => face.geometry))!
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0, roughness: .018, transmission: 1,
    thickness: .12, ior: 1.46, clearcoat: 0, clearcoatRoughness: .03,
    envMapIntensity: 1, side: THREE.FrontSide, depthWrite: false,
    transparent: true, opacity: .16,
    attenuationColor: new THREE.Color('#eff8ff'), attenuationDistance: 16,
  })
  const shell = new THREE.Mesh(shellGeometry, glass)
  shell.userData = { faces: faces.map(face => ({ id: face.id, moduleId: face.moduleId, vertices: face.vertices.map(v => v.toArray()) })), navigable: false }
  root.add(shell)
  const cuts = new THREE.Mesh(mergeGeometries(faces.filter(face => !face.moduleId).map(face => face.geometry))!, new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: .12, roughness: .015, transmission: .82,
    thickness: .60, ior: 1.52, dispersion: .25, envMapIntensity: 1.4,
    side: THREE.FrontSide, depthWrite: false, attenuationDistance: 12,
    transparent: true, opacity: .70,
    attenuationColor: new THREE.Color('#edf5ff'),
  }))
  root.add(cuts)
  const glyphs: { group: THREE.Group; normal: THREE.Vector3; center: THREE.Vector3; id: HubFaceId }[] = []
  const seams: { line: THREE.Mesh; normal: THREE.Vector3; center: THREE.Vector3 }[] = []
  const seamMaterial = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: .15, roughness: .035, transmission: .65, thickness: .04, ior: 1.5, envMapIntensity: 1.3, depthWrite: false })
  for (const face of faces) {
    face.geometry.dispose()
    if (face.moduleId) {
      const glyph = createFaceGlyph(face.moduleId)
      glyph.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), face.normal)
      glyph.position.copy(face.center).add(new THREE.Vector3(0, .58, -.018).applyQuaternion(glyph.quaternion))
      root.add(glyph)
      glyphs.push({ group: glyph, normal: face.normal, center: face.center, id: face.moduleId })
      const segments = face.vertices.map((a, i) => {
        const b = face.vertices[(i + 1) % face.vertices.length]!
        const direction = b.clone().sub(a)
        const geometry = new THREE.CylinderGeometry(.009, .009, direction.length(), 10)
        geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
        geometry.translate(...a.clone().add(b).multiplyScalar(.5).addScaledVector(face.normal, .001).toArray())
        return geometry
      })
      const line = new THREE.Mesh(mergeGeometries(segments)!, seamMaterial)
      segments.forEach(g => g.dispose())
      root.add(line); seams.push({ line, normal: face.normal, center: face.center })
    }
    if (options.debug) root.add(new THREE.ArrowHelper(face.normal, face.center, .30, face.moduleId ? '#897556' : '#8a9ca3', .07, .025))
  }
  const cigarette = createSealedCigarette()
  cigarette.position.y = -.10
  cigarette.position.x = -.16
  cigarette.rotation.z = .64
  root.add(cigarette)
  const vapor = createSealedVapor()
  root.add(vapor.group)

  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = shadowCanvas.height = 128
  const ctx = shadowCanvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(80,86,87,.18)'); gradient.addColorStop(.4, 'rgba(91,97,97,.08)'); gradient.addColorStop(1, 'rgba(91,97,97,0)')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128)
  const shadowMap = new THREE.CanvasTexture(shadowCanvas)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.5, .50), new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: .75 }))
  shadow.position.set(0, -1.95, -.3); scene.add(shadow)

  const view = options.view ?? 'overview'
  const rotations: Record<HubView, [number, number, number]> = {
    overview: [.36, -.48, -.10], front: [0, 0, 0], checkin: [0, 0, 0],
    left: [0, Math.PI / 2, 0], support: [0, Math.PI / 2, 0],
    right: [0, -Math.PI / 2, 0], progress: [0, -Math.PI / 2, 0],
    back: [0, Math.PI, 0], reserved: [0, Math.PI, 0],
    top: [Math.PI / 2, 0, 0], achievements: [Math.PI / 2, 0, 0], profile: [-Math.PI / 2, 0, 0],
  }
  root.rotation.set(...rotations[view])
  let disposed = false, reduced = options.reducedMotion, frame = 0
  let clock = 0, last = performance.now()
  function render(now: number) {
    if (disposed) return
    const dt = Math.min((now - last) / 1000, .05); last = now
    if (!reduced && !options.view && !document.hidden) clock += dt
    root.position.y = Math.sin(clock * .55) * .016
    vapor.update(clock)
    root.updateMatrixWorld(true)
    for (const { line, normal, center } of seams) {
      line.visible = normal.clone().transformDirection(root.matrixWorld).dot(camera.position.clone().sub(center.clone().applyMatrix4(root.matrixWorld)).normalize()) > .2
    }
    for (const glyph of glyphs) {
      const normal = glyph.normal.clone().transformDirection(root.matrixWorld)
      const center = glyph.center.clone().applyMatrix4(root.matrixWorld)
      const facing = normal.dot(camera.position.clone().sub(center).normalize())
      glyph.group.visible = facing > .12
      glyph.group.scale.setScalar(facing > .65 ? .67 : .62)
    }
    renderer.info.reset()
    renderer.render(scene, camera)
    if (import.meta.env.DEV) renderer.domElement.dataset.renderStats = JSON.stringify({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, points: renderer.info.render.points, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, pixelRatio: renderer.getPixelRatio(), facets: faces.length })
  }
  function tick(now: number) {
    frame = 0
    if (!document.hidden) render(now)
    else last = now
    if (!disposed && !reduced && !options.view) frame = requestAnimationFrame(tick)
  }
  function wake() { if (!frame && !disposed) { last = performance.now(); frame = requestAnimationFrame(tick) } }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight
    if (disposed || !w || !h) return
    camera.aspect = w / h
    camera.position.set(0, .06, Math.max(7.5, 3.55 / (2 * Math.tan(THREE.MathUtils.degToRad(16)) * camera.aspect)))
    camera.lookAt(0, -.05, 0); camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(devicePixelRatio, w < 700 ? 1.4 : 1.75))
    renderer.setSize(w, h); render(performance.now())
  }
  function lost(event: Event) { event.preventDefault(); options.onFailure() }
  renderer.domElement.addEventListener('webglcontextlost', lost)
  const observer = new ResizeObserver(resize); observer.observe(host)
  resize(); wake()
  return {
    setReducedMotion(value) { reduced = value; render(performance.now()); if (!value) wake() },
    dispose() {
      if (disposed) return
      disposed = true; cancelAnimationFrame(frame); observer.disconnect()
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
      scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material)) })
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose())
      shadowMap.dispose(); backgroundMap.dispose(); environment.dispose(); renderer.dispose(); renderer.domElement.remove()
    },
  }
}
