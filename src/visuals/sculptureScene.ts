import * as THREE from 'three'
import { coverLayout, COVER_ENTRY_DURATION_MS } from './coverLayout'

export interface SculptureScene {
  setPointer(x: number, y: number): void
  setHover(value: boolean): void
  setReducedMotion(value: boolean): void
  begin(): void
  reset(): void
  dispose(): void
}
interface Options { reducedMotion: boolean; onFailure(): void }
const artUrl = `${import.meta.env.BASE_URL}images/breath-portal-v3.webp`
const cleanUrl = `${import.meta.env.BASE_URL}images/breath-portal-clean-v3.webp`
const ease = (x: number) => { const t = THREE.MathUtils.clamp(x, 0, 1); return t * t * (3 - 2 * t) }

// High-detail rendered plates, GPU deformation, and live volumetric debris.
// This is a 2.5D scene, not a reconstruction of the plate's original mesh.
export async function createSculptureScene(host: HTMLElement, options: Options): Promise<SculptureScene> {
  const loader = new THREE.TextureLoader()
  const loaded = await Promise.allSettled([loader.loadAsync(artUrl), loader.loadAsync(cleanUrl)])
  if (loaded.some(result => result.status === 'rejected')) {
    loaded.forEach(result => { if (result.status === 'fulfilled') result.value.dispose() })
    throw new Error('Cover artwork could not be loaded')
  }
  const [dirty, clean] = loaded.map(result => (result as PromiseFulfilledResult<THREE.Texture>).value) as [THREE.Texture, THREE.Texture]
  for (const texture of [dirty, clean]) {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false
  }
  let renderer: THREE.WebGLRenderer
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' }) }
  catch (error) { dirty.dispose(); clean.dispose(); throw error }
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor('#f4f3f0', 0)
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 20)
  camera.position.z = 5
  const viewport = new THREE.Vector2(1, 1)
  const imageRect = new THREE.Vector4(0, 0, 1, 1)
  const portal = new THREE.Vector2(.105, .59)
  const pointer = new THREE.Vector2()
  const smoothPointer = new THREE.Vector2()
  const uniforms = {
    uDirty: { value: dirty }, uClean: { value: clean },
    uTime: { value: 0 }, uMotion: { value: options.reducedMotion ? 0 : 1 },
    uProgress: { value: 0 }, uHover: { value: 0 }, uPortalRadius: { value: .18 },
    uPointer: { value: smoothPointer }, uViewport: { value: viewport },
    uImageRect: { value: imageRect }, uPortal: { value: portal },
    uMobile: { value: 0 }, uBackground: { value: new THREE.Color('#f4f3f0') },
  }
  const artMaterial = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: `varying vec2 vUv;
      void main(){vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);}`,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uDirty,uClean;
      uniform float uTime,uMotion,uProgress,uHover,uMobile,uPortalRadius;
      uniform vec2 uPointer,uViewport,uPortal;
      uniform vec4 uImageRect;
      uniform vec3 uBackground;
      vec2 artworkUv(vec2 screen){
        vec2 p=(screen-uImageRect.xy)/uImageRect.zw;
        return vec2(p.x,1.0-p.y);
      }
      float valid(vec2 p){return step(0.0,p.x)*step(p.x,1.0)*step(0.0,p.y)*step(p.y,1.0);}
      float edgeMask(vec2 uv){
        return mix(1.0,smoothstep(0.0,.1,uv.y)*smoothstep(0.0,.07,1.0-uv.y),uMobile);
      }
      vec3 sampleArt(vec2 uv,float purification){
        return mix(texture2D(uDirty,clamp(uv,0.0,1.0)).rgb,texture2D(uClean,clamp(uv,0.0,1.0)).rgb,purification);
      }
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      float mist(vec2 p){return noise(p)*.55+noise(p*2.03+7.1)*.28+noise(p*4.01+19.3)*.17;}
      void main(){
        vec2 screen=vec2(vUv.x,1.0-vUv.y);
        vec2 uv=artworkUv(screen);
        float objectMask=smoothstep(.29,.46,uv.x)*smoothstep(.01,.12,uv.y);
        vec3 original=texture2D(uDirty,clamp(uv,0.0,1.0)).rgb;
        float depth=1.0-dot(original,vec3(.2126,.7152,.0722));
        float breathing=sin(uTime*.57)*.0015;
        vec2 flow=vec2(sin(uv.y*12.0+uTime*.24),cos(uv.x*9.0-uTime*.19))*.001;
        vec2 drift=(uPointer*vec2(.0024,-.0016)*(depth+.25)+flow+vec2(breathing,-breathing*.4))*objectMask*uMotion;
        // Continuous, feathered vapor erosion: no cells, cracks or camera scaling.
        float dissolve=smoothstep(0.0,.82,uProgress);
        float smokeMask=smoothstep(.33,.47,uv.x)*smoothstep(.10,.24,uv.y);
        float cigaretteMask=smoothstep(.075,.11,uv.x)*(1.0-smoothstep(.35,.40,uv.x))*smoothstep(.065,.10,uv.y)*(1.0-smoothstep(.25,.31,uv.y));
        vec3 originalArt=sampleArt(uv+drift,0.0);
        vec2 turbulence=vec2(mist(uv*6.0+vec2(0,uProgress*.8)),mist(uv*6.0+vec2(17,uProgress*.6)))-.5;
        vec2 vaporUv=uv+drift+turbulence*.060*dissolve-vec2(.023,.055)*dissolve;
        float density=mist(uv*12.0+turbulence*2.1-vec2(uProgress*.55,uProgress*1.2));
        float threshold=dissolve*1.5-.25;
        float remaining=smoothstep(threshold-.13,threshold+.13,density)*(1.0-dissolve*.60);
        // Replace baked-in floor debris too, not just the live dust overlay.
        float ashMask=smoothstep(.23,.34,uv.x)*(1.0-smoothstep(.20,.43,uv.y));
        float ashClearing=smoothstep(.02,.72,uProgress+.10*(density-.5));
        vec3 purifiedFloor=mix(originalArt,sampleArt(uv,1.0),ashMask*ashClearing);
        vec3 coolBackground=(sampleArt(vec2(.43,.70),0.0)+sampleArt(vec2(.46,.60),0.0))*.5;
        vec3 warmBackground=sampleArt(vec2(.39,.35),0.0);
        vec3 backdrop=mix(warmBackground,coolBackground,smoothstep(.18,.80,uv.y));
        backdrop=mix(backdrop,sampleArt(uv,1.0),cigaretteMask*(1.0-smokeMask));
        vec3 vapor=sampleArt(vaporUv,dissolve);
        vec3 sculpture=mix(backdrop,vapor,remaining);
        vec3 color=mix(purifiedFloor,sculpture,smokeMask*smoothstep(0.0,.10,uProgress));
        color=mix(color,sampleArt(uv,1.0),cigaretteMask*(1.0-smokeMask)*dissolve);
        color=mix(uBackground,color,valid(uv)*edgeMask(uv));
        vec2 delta=(screen-uPortal)*vec2(uViewport.x/uViewport.y,1.0);
        float radius=length(delta);
        float lightRadius=uPortalRadius;
        float rings=(.5+.5*sin(radius*96.0-uTime*.75))*exp(-pow((radius-lightRadius*.75)*12.0,2.0));
        float glow=exp(-dot(delta,delta)/(lightRadius*lightRadius))*(uHover*.065+sin(uProgress*3.14159)*.14)+rings*uHover*.025;
        color+=vec3(1.0,.84,.58)*glow;
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }
    `,
  })
  const artGeometry = new THREE.PlaneGeometry(2, 2)
  const plate = new THREE.Mesh(artGeometry, artMaterial)
  plate.renderOrder = -10; plate.frustumCulled = false
  scene.add(plate)

  let seed = 4381
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  // Match particle emission to dark pixels in this project's artwork.
  const image = dirty.image as HTMLImageElement
  const sampleCanvas = document.createElement('canvas')
  sampleCanvas.width = image.naturalWidth; sampleCanvas.height = image.naturalHeight
  const context = sampleCanvas.getContext('2d', { willReadFrequently: true })
  let pixels: Uint8ClampedArray | undefined
  if (context) {
    context.drawImage(image, 0, 0)
    pixels = context.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data
  }
  const sourceParticles = Array.from({ length: 450 }, (_, index) => {
    let x = .78, y = .7
    for (let attempts = 0; attempts < 120; attempts++) {
      x = .30 + random() * .65; y = index >= 300 ? .87 + random() * .10 : .40 + random() * .50
      if (!pixels) break
      const offset = (Math.floor(y * sampleCanvas.height) * sampleCanvas.width + Math.floor(x * sampleCanvas.width)) * 4
      if ((pixels[offset]! + pixels[offset + 1]! + pixels[offset + 2]!) / 765 < .30) break
    }
    const paper = index >= 40 && index < 65
    if (paper) { x = .12 + random() * .21; y = .85 - (x - .12) * .32 + (random() - .5) * .012 }
    const glass = index >= 65 && index < 180
    if (glass) { const t = random(); x = .66 + Math.sin(t * 8) * .20; y = .12 + t * .62 }
    return { x, y, paper, glass, vx: (random() - .5) * .26, vy: -.055 - random() * .105, phase: random() * 6, size: .8 + random() ** 2 * 2.8 }
  })
  sampleCanvas.width = sampleCanvas.height = 1
  pixels = undefined
  const positions = new Float32Array(sourceParticles.length * 3)
  const sizes = new Float32Array(sourceParticles.map(p => p.glass ? 8 + p.size * 5 : p.size))
  const colors = new Float32Array(sourceParticles.length * 3)
  sourceParticles.forEach((p, i) => new THREE.Color(p.glass ? '#f1ede3' : '#494441').toArray(colors, i * 3))
  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  const particleUniforms = { uOpacity: { value: .1 }, uDpr: { value: 1 }, uEntry: { value: 0 } }
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: particleUniforms, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
    vertexShader: `attribute float aSize; attribute vec3 aColor; varying vec3 vColor; uniform float uDpr,uEntry;
      void main(){vColor=aColor;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=mix(min(aSize,3.0),aSize,uEntry)*uDpr;}`,
    fragmentShader: `uniform float uOpacity;varying vec3 vColor;
      void main(){float d=length(gl_PointCoord-.5);float alpha=exp(-d*d*24.0)*(1.0-smoothstep(.35,.5,d))*uOpacity;if(alpha<.01)discard;gl_FragColor=vec4(vColor,alpha);
      #include <colorspace_fragment>
      }`,
  })
  const particles = new THREE.Points(particleGeometry, particleMaterial)
  particles.frustumCulled = false; particles.renderOrder = 1
  scene.add(particles)

  let disposed = false, reduced = options.reducedMotion, hovered = false
  let frame = 0, last = performance.now(), clock = 0
  let enteringAt: number | null = null
  let mobile = false
  function updateImageRect() {
    const width = host.clientWidth, height = host.clientHeight
    if (!width || !height) return
    viewport.set(width, height)
    mobile = width < 700
    uniforms.uMobile.value = mobile ? 1 : 0
    const imageAspect = image.naturalWidth / image.naturalHeight
    const layout = coverLayout(width, height, imageAspect)
    imageRect.set(layout.x, layout.y, layout.width, layout.height)
    portal.set(layout.x + layout.width * .214, layout.y + layout.height * .439)
    uniforms.uPortalRadius.value = Math.max(120, Math.min(360, width * layout.width * .22)) / height / 2
  }
  function render(now: number) {
    if (disposed) return
    const dt = Math.min((now - last) / 1000, .05)
    last = now
    if (!reduced) clock += dt
    const p = enteringAt === null ? 0 : THREE.MathUtils.clamp((now - enteringAt) / COVER_ENTRY_DURATION_MS, 0, 1)
    uniforms.uProgress.value = p; uniforms.uTime.value = clock; uniforms.uMotion.value = reduced ? 0 : 1
    uniforms.uHover.value += ((hovered ? 1 : 0) - uniforms.uHover.value) * (1 - Math.exp(-dt * 5))
    smoothPointer.lerp(pointer, 1 - Math.exp(-dt * 3))
    const gathering = ease(p / .82)
    const scattering = gathering
    sourceParticles.forEach((source, i) => {
      const x = imageRect.x + source.x * imageRect.z, y = imageRect.y + source.y * imageRect.w
      const drift = reduced ? 0 : Math.sin(clock * .4 + source.phase) * .0009
      const sx = x + drift + source.vx * scattering, sy = y + drift + source.vy * scattering
      positions[i * 3] = sx * 2 - 1
      positions[i * 3 + 1] = 1 - sy * 2
      positions[i * 3 + 2] = .2

    })
    particleGeometry.attributes.position!.needsUpdate = true
    particleUniforms.uEntry.value = enteringAt === null ? 0 : ease(p / .18)
    particleUniforms.uOpacity.value = enteringAt === null ? .08 : .36 * (1 - gathering)
    renderer.render(scene, camera)
  }
  function tick(now: number) {
    if (disposed) return
    frame = 0
    if (!document.hidden) render(now)
    else last = now
    if (!reduced || enteringAt !== null) frame = requestAnimationFrame(tick)
  }
  function wake() { if (!frame && !disposed) { last = performance.now(); frame = requestAnimationFrame(tick) } }
  function resize() {
    if (disposed || !host.clientWidth || !host.clientHeight) return
    updateImageRect()
    const dpr = Math.min(devicePixelRatio, mobile ? 1.5 : 1.8)
    renderer.setPixelRatio(dpr); renderer.setSize(host.clientWidth, host.clientHeight)
    particleUniforms.uDpr.value = dpr
    render(performance.now())
  }
  function contextLost(event: Event) { event.preventDefault(); options.onFailure() }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize(); wake()
  return {
    setPointer(x, y) { pointer.set(x, y) },
    setHover(value) { hovered = value; if (!reduced) wake() },
    setReducedMotion(value) { reduced = value; if (value) { pointer.set(0, 0); smoothPointer.set(0, 0) }; wake() },
    begin() { updateImageRect(); enteringAt = performance.now(); wake() },
    reset() { enteringAt = null; hovered = false; render(performance.now()); wake() },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame); observer.disconnect()
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      artGeometry.dispose(); artMaterial.dispose(); dirty.dispose(); clean.dispose()
      particleGeometry.dispose(); particleMaterial.dispose()
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    },
  }
}
