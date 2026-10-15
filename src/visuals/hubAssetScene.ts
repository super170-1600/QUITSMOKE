import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { createHubPhotons, createCoreDissipation } from './hubPhotons'
import { createHubInteraction, type HubInteractionState } from './hubInteraction'
import type { HubFaceId } from '@/config/hubModules'
import { HUB_VIEWS, type HubView, type HubScene } from './hubScene'
export { HUB_VIEWS }
export const HUB_STAGES = ['A', 'B', 'C', 'D'] as const
export const HUB_SCHEMES = ['physical', 'hybrid'] as const
export type HubStage = typeof HUB_STAGES[number]
export type HubScheme = typeof HUB_SCHEMES[number]
interface Options { view?: HubView; stage?: HubStage; scheme?: HubScheme; photons?: boolean; density?: number; animatePreview?: boolean; reducedMotion: boolean; onFailure(): void; onInteraction?(state:HubInteractionState):void; onTransition?(progress:number,anchor:{x:number;y:number;width:number;height:number}):void }
export interface HubAssetScene extends HubScene { setPhotons(enabled: boolean, density?: number): void; focusFace(id:HubFaceId):void; transitionFace(id:HubFaceId,open:boolean):Promise<void>; cancelOpening():void; skipTransition():void; setPaused(value:boolean):void }

export async function createHubAssetScene(host: HTMLElement, options: Options): Promise<HubAssetScene> {
  const gltf = await new GLTFLoader().loadAsync('/models/quitsmoke-seal-study.glb')
  const sourceMaterials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  gltf.scene.traverse(o => {
    const mesh = o as THREE.Mesh
    if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => {
      sourceMaterials.add(m); Object.values(m).forEach(v => { if (v instanceof THREE.Texture) textures.add(v) })
    })
  })
  let hdr: THREE.DataTexture
  try { hdr = await new HDRLoader().loadAsync('/environments/studio_small_09_1k.hdr') }
  catch (error) { gltf.scene.traverse(o => (o as THREE.Mesh).geometry?.dispose()); sourceMaterials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); throw error }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1
  renderer.info.autoReset = false
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .1, 50)
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const wash = ctx.createLinearGradient(0, 0, 256, 180)
  wash.addColorStop(0, '#faf7f1'); wash.addColorStop(.48, '#e0e3e5'); wash.addColorStop(1, '#cbd2d8')
  ctx.fillStyle = wash; ctx.fillRect(0,0,256,256)
  const background = new THREE.CanvasTexture(canvas); background.colorSpace = THREE.SRGBColorSpace; scene.background = background
  // Reflection cards shape the highlights, rather than lifting the whole exposure.
  // They are captured into the environment only and never obscure the sculpture.
  const reflectionStudio = new THREE.Scene(); reflectionStudio.background = hdr
  const reflectionCards: THREE.Mesh[] = []
  function reflectionCard(color: string, radiance: number, width: number, height: number, position: [number, number, number]) {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(radiance), side: THREE.DoubleSide })
    const card = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
    card.position.set(...position); card.lookAt(0, 0, 0); reflectionStudio.add(card); reflectionCards.push(card)
  }
  reflectionCard('#ffdfae', 5, .35, 5, [-3, 1.5, 3])
  reflectionCard('#e7f4ff', 4, .22, 4, [3, 1, 2])
  reflectionCard('#fff4de', 3, 3, .18, [0, -2, 3])
  reflectionCard('#152536', .5, 1.6, 5, [2.4, 1, -3])
  const pmrem = new THREE.PMREMGenerator(renderer); const env = pmrem.fromScene(reflectionStudio, .015, .1, 30)
  reflectionCards.forEach(card => { card.geometry.dispose(); (card.material as THREE.Material).dispose() })
  hdr.dispose(); pmrem.dispose(); scene.environment = env.texture; scene.environmentRotation.y = .65
  scene.add(new THREE.HemisphereLight('#f2f8ff', '#b4a591', .6))
  const warm = new THREE.DirectionalLight('#ffe9cc', 1.6); warm.position.set(-3, 4, 5); scene.add(warm)
  const cold = new THREE.DirectionalLight('#dceaff', .9); cold.position.set(4, 2, -3); scene.add(cold)
  const root = new THREE.Group(); root.add(gltf.scene); scene.add(root)
  const dissipation=createCoreDissipation(env.texture)
  gltf.scene.getObjectByName('CigaretteCore')!.add(dissipation.group)
  const stage = options.stage ?? 'D', scheme = options.scheme ?? 'hybrid'
  const photons = createHubPhotons(env.texture, options.density ?? 1.2)
  const externalAssets: THREE.Object3D[] = []
  let photonsEnabled = (options.photons ?? true) && stage === 'D'
  photons.setEnabled(photonsEnabled); scene.add(photons.group)
  const faces: THREE.Mesh[] = [], glyphs: THREE.Object3D[] = []
  const normalById = new Map<HubFaceId, THREE.Vector3>()
  const seals: THREE.Object3D[] = []
  gltf.scene.traverse(object => {
    const role = object.userData.assetRole
    if (role === 'core') object.visible = stage !== 'A'
    if (role === 'seal') { object.visible = stage === 'C' || stage === 'D'; seals.push(object) }
    if (role === 'glyphs') object.visible = stage === 'D'
    if (role === 'glyph') glyphs.push(object)
    if (role === 'external') { object.visible = photonsEnabled; externalAssets.push(object) }
    if (!(object instanceof THREE.Mesh)) return
    if (role === 'face') { faces.push(object); normalById.set(object.userData.faceId, new THREE.Vector3(...object.userData.navigationNormal as [number,number,number])) }
    if (role === 'face' || role === 'cut') {
      const m = (object.material as THREE.MeshPhysicalMaterial).clone()
      m.side = THREE.FrontSide; m.depthWrite = false; m.envMapIntensity = 1
      m.roughness = .015; m.ior = 1.46
      m.thickness = role === 'face' ? .025 : .032
      if (scheme === 'physical') { m.transmission = 1; m.transparent = false; m.opacity = 1 }
      else {
        // Reflection-only outer shell permits refractive inner surfaces to remain visible.
        // This explicitly trades outer refraction for reliable layered composition.
        m.transmission = 0; m.transparent = true; m.opacity = role === 'face' ? .27 : .66
        m.color.set(role === 'face' ? '#e4edf1' : '#afc2d0'); m.metalness=role==='face'?.08:.45; m.clearcoat = .35
        m.onBeforeCompile = shader => {
          const outline=object.userData.opticalOutline as number[][] | undefined
          let edges='float opticalEdge=0.;'
          if(outline){
            const n=new THREE.Vector3(...object.userData.navigationNormal as [number,number,number])
            edges='float opticalDistance=100.;'
            outline.forEach((point,i)=>{
              const a=new THREE.Vector3(...point as [number,number,number]),b=new THREE.Vector3(...outline[(i+1)%outline.length] as [number,number,number])
              const inward=new THREE.Vector3().subVectors(b,a).cross(n).normalize()
              edges+=`opticalDistance=min(opticalDistance,abs(dot(vOpticalLocal,vec3(${inward.x.toFixed(8)},${inward.y.toFixed(8)},${inward.z.toFixed(8)}))-(${inward.dot(a).toFixed(8)})));`
            })
            edges+='float opticalEdge=exp(-pow(opticalDistance/.010,2.));'
          }
          shader.vertexShader='varying vec3 vOpticalLocal;\n'+shader.vertexShader
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOpticalLocal=transformed;')
          shader.fragmentShader='varying vec3 vOpticalLocal;\n'+shader.fragmentShader
          shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`${edges}\ndiffuseColor.a *= .22 + .78 * pow(1.0 - abs(dot(normal, geometryViewDir)), 2.0);diffuseColor.a=min(1.,diffuseColor.a+opticalEdge*.34);outgoingLight+=vec3(.65,.76,.84)*opticalEdge*.40;\n#include <opaque_fragment>`)
        }
        m.customProgramCacheKey = () => 'seal-study-rim-v3-'+object.uuid
      }
      object.material = m; sourceMaterials.add(m)
    } else if (role === 'ribbon' || role === 'sealShard' || role === 'externalRibbon') {
      const m = (object.material as THREE.MeshPhysicalMaterial).clone()
      m.thickness = role === 'ribbon' ? .012 : .028
      m.transmission = role === 'ribbon' ? .55 : role==='externalRibbon' ? 0 : .90
      if(role==='externalRibbon') {
        m.metalness=.45;m.transparent=true;m.opacity=.72;m.clearcoat=.9;m.envMapIntensity=1.3
        m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`diffuseColor.a *= pow(max(0.0,sin(vUv.x*3.14159265)),.45)*(.4+.6*pow(1.0-abs(dot(normal,geometryViewDir)),2.0));\n#include <opaque_fragment>`)}
        m.defines={...m.defines,USE_UV:''};m.customProgramCacheKey=()=> 'external-optic-fade-v1'
      }
      m.roughness = role === 'ribbon' ? .035 : .025; m.depthWrite = false; m.side = THREE.FrontSide
      object.material = m; sourceMaterials.add(m)
    }
  })
  // A quiet ground reference is shared by all A–D captures.
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width=shadowCanvas.height=128
  const sc = shadowCanvas.getContext('2d')!, gradient=sc.createRadialGradient(64,64,0,64,64,64)
  gradient.addColorStop(0,'rgba(65,66,67,.20)'); gradient.addColorStop(1,'rgba(65,66,67,0)')
  sc.fillStyle=gradient; sc.fillRect(0,0,128,128)
  const shadowMap = new THREE.CanvasTexture(shadowCanvas)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.5,3),new THREE.MeshBasicMaterial({ map:shadowMap,transparent:true,depthWrite:false }))
  shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-1.84,-.1); scene.add(shadow)
  const rotations: Record<HubView,[number,number,number]> = {
    overview:[.47,-.66,-.08], front:[0,0,0], checkin:[0,0,0], left:[0,Math.PI/2,0], support:[0,Math.PI/2,0],
    right:[0,-Math.PI/2,0], progress:[0,-Math.PI/2,0], back:[0,Math.PI,0], reserved:[0,Math.PI,0],
    top:[Math.PI/2,0,0], achievements:[Math.PI/2,0,0], profile:[-Math.PI/2,0,0],
  }
  root.rotation.set(...rotations[options.view ?? 'overview'])
  let disposed=false, reduced=options.reducedMotion, frame=0, clock=1.2, last=performance.now(), renderedFrames=0
  const surface=document.createElement('div');surface.className='hub-interaction';surface.tabIndex=options.view?-1:0
  surface.setAttribute('role','group');surface.setAttribute('aria-label','晶体导航，拖动翻转；方向键选面，Enter 确认，Escape 恢复视角')
  Object.assign(surface.style,{position:'absolute',touchAction:'none',cursor:'grab',pointerEvents:options.view?'none':'auto'})
  host.appendChild(surface)
  const pickables:THREE.Mesh[]=[];gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh&&['face','cut'].includes(o.userData.assetRole))pickables.push(o)})
  const interaction=createHubInteraction(surface,root,camera,pickables,normalById,{reduced:()=>reduced,wake,change:state=>{surface.style.cursor=state.mode==='dragging'?'grabbing':state.hover?'pointer':'grab';options.onInteraction?.(state)}})
  const nav=gltf.scene.getObjectByName('NavigationShell')!,bounds=new THREE.Box3(),corner=new THREE.Vector3()
  const faceOrigins=new Map(faces.map(face=>[face,face.position.clone()]))
  const faceOpacity=new Map(faces.map(face=>[face,(face.material as THREE.MeshPhysicalMaterial).opacity]))
  let paused=false, openingFace:HubFaceId|null=null, morph=0
  let morphAnchor={x:.5,y:.5,width:.2,height:.2}
  let morphTween:{from:number;to:number;elapsed:number;finish():void}|null=null
  function finishMorph(){const tween=morphTween;morphTween=null;tween?.finish()}
  function transitionFace(id:HubFaceId,open:boolean){
    finishMorph();openingFace=id;surface.inert=true
    root.updateMatrixWorld(true)
    const face=faces.find(f=>f.userData.faceId===id)!,center=face.getWorldPosition(new THREE.Vector3()).project(camera)
    const box=new THREE.Box3().setFromObject(face),lo=box.min.clone().project(camera),hi=box.max.clone().project(camera)
    morphAnchor={x:(center.x+1)/2,y:(1-center.y)/2,width:Math.max(.08,Math.abs(hi.x-lo.x)/2),height:Math.max(.08,Math.abs(hi.y-lo.y)/2)}
    options.onTransition?.(morph,morphAnchor)
    return new Promise<void>(finish=>{morphTween={from:morph,to:open?1:0,elapsed:0,finish};wake()})
  }
  function resetOpening(){finishMorph();morph=0;openingFace=null;surface.inert=false;options.onTransition?.(0,morphAnchor);wake()}
  function render(now:number) {
    if (disposed) return
    const dt=Math.max(0,Math.min((now-last)/1000,.05)); last=now
    if(morphTween){const tween=morphTween;tween.elapsed+=dt;const t=reduced?1:Math.min(1,tween.elapsed/1.35);morph=THREE.MathUtils.lerp(tween.from,tween.to,t*t*(3-2*t));options.onTransition?.(morph,morphAnchor);if(t===1){if(!tween.to){openingFace=null;surface.inert=false}finishMorph()}}
    interaction.update(dt)
    if (!reduced && (!options.view || options.animatePreview) && !document.hidden) clock+=dt
    photons.update(clock)
    dissipation.update(clock)
    root.position.y=Math.sin(clock*.4)*.012
    seals.forEach(s => { s.rotation.y=Math.sin(clock*.15)*.012 })
    root.updateMatrixWorld(true)
    const handoff=THREE.MathUtils.smoothstep(morph,.46,.86)
    for(const face of faces){const chosen=face.userData.faceId===openingFace;face.position.copy(faceOrigins.get(face)!);face.scale.setScalar(chosen?1+morph*1.2:1);if(chosen)face.position.addScaledVector(normalById.get(openingFace!)!,morph*1.6);(face.material as THREE.MeshPhysicalMaterial).opacity=faceOpacity.get(face)!*(chosen?1-handoff:1-morph*.3)}
    for(const face of faces){const material=face.material as THREE.MeshPhysicalMaterial;const focused=interaction.state.face===face.userData.faceId,hovered=interaction.state.hover===face.userData.faceId;material.emissive.set('#efd9b9');material.emissiveIntensity=hovered?.07:focused?.035:0;material.envMapIntensity=hovered?1.2:focused?1.1:1}
    for (const glyph of glyphs) {
      const normal=normalById.get(glyph.userData.faceId)!
      glyph.visible=stage==='D' && normal.clone().transformDirection(root.matrixWorld).dot(camera.position.clone().normalize())>.12
      glyph.position.copy(normal).multiplyScalar(interaction.state.hover===glyph.userData.faceId?.022:interaction.state.face===glyph.userData.faceId?.012:0)
      glyph.scale.setScalar(1)
      glyph.quaternion.identity()
      if(openingFace){glyph.visible=glyph.visible&&glyph.userData.faceId===openingFace&&handoff<.99;const face=faces.find(f=>f.userData.faceId===openingFace)!,center=faceOrigins.get(face)!;const scale=1+morph*1.7;const axis=new THREE.Vector3(0,1,0).cross(normal).normalize();if(axis.lengthSq()<.01)axis.set(1,0,0);glyph.quaternion.setFromAxisAngle(axis,Math.sin(morph*Math.PI)*.28);glyph.scale.setScalar(scale);glyph.position.copy(center).sub(center.clone().applyQuaternion(glyph.quaternion).multiplyScalar(scale)).addScaledVector(normal,morph*1.85)}
    }
    if (scheme==='hybrid') for (const face of faces) {
      const normal=normalById.get(face.userData.faceId)!
      const center=face.getWorldPosition(new THREE.Vector3())
      face.visible=normal.clone().transformDirection(root.matrixWorld).dot(camera.position.clone().sub(center).normalize())>0
    }
    renderer.info.reset(); renderer.render(scene,camera)
    bounds.setFromObject(nav);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity
    for(let i=0;i<8;i++){corner.set(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z).project(camera);const x=(corner.x+1)*host.clientWidth/2,y=(1-corner.y)*host.clientHeight/2;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
    Object.assign(surface.style,{left:Math.max(0,minX-12)+'px',top:Math.max(0,minY-12)+'px',width:Math.min(host.clientWidth,maxX-minX+24)+'px',height:Math.min(host.clientHeight,maxY-minY+24)+'px'})
    if(import.meta.env.DEV)surface.dataset.interaction=JSON.stringify({...interaction.state,quaternion:root.quaternion.toArray()})
    if(import.meta.env.DEV)surface.dataset.morph=JSON.stringify({progress:morph,face:openingFace,glyphScale:glyphs.find(g=>g.userData.faceId===openingFace)?.scale.x??1})
    renderedFrames++
    if(import.meta.env.DEV) renderer.domElement.dataset.renderStats=JSON.stringify({ asset:'Blender GLB',stage,scheme,photons:photonsEnabled,density:photons.density,renderedFrames,visibleFaceIds:faces.filter(f=>f.visible).map(f=>f.userData.faceId),faceIds:faces.map(f=>f.userData.faceId),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,pixelRatio:renderer.getPixelRatio() })
  }
  function tick(now:number) { frame=0;if(!document.hidden&&!paused)render(now);else last=now;if(!disposed&&!paused&&!frame&&(morphTween||interaction.active||(!reduced&&(!options.view||options.animatePreview))))frame=requestAnimationFrame(tick) }
  function wake(){if(!frame&&!disposed&&!paused){last=performance.now();frame=requestAnimationFrame(tick)}}
  function visibilityChanged(){if(document.hidden){cancelAnimationFrame(frame);frame=0}else wake()}
  document.addEventListener('visibilitychange',visibilityChanged)
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(disposed||!w||!h)return;camera.aspect=w/h;camera.position.set(0,.9,Math.max(8.7,5.8/(2*Math.tan(THREE.MathUtils.degToRad(16))*camera.aspect)));camera.lookAt(0,-.05,0);camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,w<700?1.4:1.75));renderer.setSize(w,h);render(performance.now())}
  function lost(event:Event){event.preventDefault();resetOpening();options.onFailure()}
  renderer.domElement.addEventListener('webglcontextlost',lost)
  const observer=new ResizeObserver(resize);observer.observe(host);resize();wake()
  return {
    transitionFace,cancelOpening:resetOpening,
    skipTransition(){if(morphTween){morph=morphTween.to;if(!morph){openingFace=null;surface.inert=false}finishMorph();wake()}},
    setPaused(value){paused=value;if(value){cancelAnimationFrame(frame);frame=0}else wake()},
    focusFace(id){interaction.focusFace(id)},
    setPhotons(enabled,density){photonsEnabled=enabled&&stage==='D';photons.setEnabled(photonsEnabled);externalAssets.forEach(o=>o.visible=photonsEnabled);if(density!==undefined)photons.setDensity(density);render(performance.now())},
    setReducedMotion(value){reduced=value;render(performance.now());if(!value)wake()},
    dispose(){if(disposed)return;disposed=true;document.removeEventListener('visibilitychange',visibilityChanged);cancelAnimationFrame(frame);interaction.dispose();surface.remove();observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);const geometries=new Set<THREE.BufferGeometry>();scene.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>sourceMaterials.add(m))});geometries.forEach(g=>g.dispose());sourceMaterials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());photons.dispose();dissipation.dispose();background.dispose();shadowMap.dispose();env.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()},
  }
}
