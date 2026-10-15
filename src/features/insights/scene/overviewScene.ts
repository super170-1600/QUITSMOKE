import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import type {ConsoleModule} from '../ui/consoleTypes'
import {resizeSurface} from '@/visuals/resizeSurface'

export interface SceneReport { calls: number; triangles: number; geometries: number; textures: number; renderMs: number; frames: number; pixelRatio: number }
export interface PanelAnchor { x: number; y: number; width: number; height: number; transform: string; orbit: { x:number; z:number; baseY:number;seatingError:number } }
export function createOverviewScene(host: HTMLElement, onFrame: (anchors: PanelAnchor[], report: SceneReport) => void,modules:ConsoleModule[]) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  host.appendChild(renderer.domElement)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = .98
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#ffffff')
  const camera = new THREE.OrthographicCamera(-8, 8, 4.8, -4.8, .1, 100)
  camera.position.set(0, 7.7, 12)
  camera.lookAt(0, 1.1, 0)
  const materials: THREE.Material[] = [], geometries: THREE.BufferGeometry[] = [], textures:THREE.Texture[]=[]
  const mat = <T extends THREE.Material>(value: T) => { materials.push(value); return value }
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    geometries.push(geometry)
    const object = new THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>(geometry, material)
    object.castShadow = true; object.receiveShadow = true
    return object
  }
  // Large studio cards create readable dark/cool reflection boundaries in clear glass.
  const room = new RoomEnvironment()
  const cardMat = new THREE.MeshBasicMaterial({ color: '#142b3b', side: THREE.DoubleSide })
  const cardGeometry = new THREE.PlaneGeometry(7, 12)
  const card = new THREE.Mesh(cardGeometry, cardMat)
  card.position.set(-5, 3, -4); card.rotation.y = .7; room.add(card)
  const warmMat = new THREE.MeshBasicMaterial({ color: '#fff0d5', side: THREE.DoubleSide })
  const warm = new THREE.Mesh(cardGeometry, warmMat)
  warm.position.set(5, 3, -3); warm.rotation.y = -.8; room.add(warm)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(room, .04)
  scene.environment = environment.texture
  room.dispose(); cardMat.dispose(); warmMat.dispose(); cardGeometry.dispose(); pmrem.dispose()
  // Exhibition material hierarchy. Body colour stays neutral; only long optical
  // paths through cut edges pick up a faint cool tint (Beer-Lambert attenuation).
  const heroGlass=mat(new THREE.MeshPhysicalMaterial({color:'#fffefa',transmission:.96,metalness:0,roughness:.045,thickness:.24,ior:1.46,clearcoat:.65,clearcoatRoughness:.09,envMapIntensity:.9}))
  heroGlass.name='Hero Glass'
  const structuralGlass=mat(new THREE.MeshPhysicalMaterial({color:'#f1f3f2',transmission:.72,metalness:0,roughness:.19,thickness:.14,ior:1.45,clearcoat:.45,envMapIntensity:.75}))
  structuralGlass.name='Structural Glass'
  const accentSilver=mat(new THREE.MeshStandardMaterial({color:'#6f828b',metalness:.65,roughness:.26}))
  accentSilver.name='Accent Material / platinum'
  const accentChampagne=mat(new THREE.MeshStandardMaterial({color:'#a98d5d',metalness:.58,roughness:.28}))
  accentChampagne.name='Accent Material / champagne'
  const quartz=mat(new THREE.MeshPhysicalMaterial({color:'#dcdedc',transmission:.26,roughness:.32,thickness:.2,ior:1.44,clearcoat:.24,envMapIntensity:.55}))
  quartz.name='Foundation / satin quartz'
  const opticalRim=mat(new THREE.MeshPhysicalMaterial({color:'#a4b6c0',metalness:.8,roughness:.19,clearcoat:.65,envMapIntensity:1.05}))
  opticalRim.name='Edge / silver-blue optical coating'
  const glass=heroGlass,clearGlass=structuralGlass,silver=accentSilver,gold=accentChampagne
  const cutGlass=mat(new THREE.MeshPhysicalMaterial({color:'#f1f8f7',transmission:.975,thickness:.18,roughness:.07,metalness:0,ior:1.49,attenuationColor:'#bbd8dc',attenuationDistance:.65,clearcoat:.55,envMapIntensity:1.0}))
  cutGlass.name='Hero Glass / thick edge'
  const screenGlass=mat(heroGlass.clone());screenGlass.transparent=true;screenGlass.opacity=.28;screenGlass.depthWrite=false;screenGlass.thickness=.065;screenGlass.name='Hero Glass / display shell'
  function slab(width: number, height: number, depth: number, radius: number, material: THREE.Material) {
    const shape = new THREE.Shape(), x = -width / 2, y = -height / 2
    shape.moveTo(x + radius, y); shape.lineTo(x + width - radius, y)
    shape.quadraticCurveTo(x + width, y, x + width, y + radius)
    shape.lineTo(x + width, y + height - radius); shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    shape.lineTo(x + radius, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - radius)
    shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y)
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .045, bevelThickness: .025, bevelSegments: 4, steps: 1, curveSegments: 12 })
    geometry.translate(0, 0, -depth / 2)
    const object = mesh(geometry, material)
    if (material === heroGlass) object.material = [material, cutGlass]
    if(material===heroGlass||material===structuralGlass)object.castShadow=false
    // A hairline reflective lip catches studio lights; broad faces stay quiet.
    if(material!==screenGlass){
      const points=shape.getPoints(12).map(point=>new THREE.Vector3(point.x,point.y,depth/2+.023))
      const lip=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true,'centripetal'),128,.008,6,true),opticalRim)
      lip.castShadow=false;object.add(lip)
    }
    return object
  }
  // A shadow catcher leaves the white canvas continuous with the surrounding UI.
  const floor = mesh(new THREE.PlaneGeometry(30, 30), mat(new THREE.ShadowMaterial({color:'#53616b',opacity:.12})))
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.65; floor.castShadow = false; scene.add(floor)
  const base = mesh(new THREE.CylinderGeometry(2.28, 2.38, .14, 128), quartz)
  base.position.y = -.4; scene.add(base)
  const secondaryRail=mesh(new THREE.TorusGeometry(2.30,.025,10,144),structuralGlass);secondaryRail.rotation.x=Math.PI/2;secondaryRail.position.y=-.32;secondaryRail.castShadow=false;scene.add(secondaryRail)
  const stack = new THREE.Group(); stack.rotation.y = -.42; scene.add(stack)
  for (let index = 0; index < 4; index++) {
    const layer = slab(3.6 - index * .60, 2.7-index*.45, .12, .12, index===0?quartz:index===1?structuralGlass:glass)
    layer.rotation.x = -Math.PI / 2
    layer.position.set(0,.02+index*.46,0)
    layer.userData.platformLayer=3-index
    stack.add(layer)
    const icon=new THREE.Group();icon.position.set(0,layer.position.y+.10,0);stack.add(icon)
    const domain=3-index,accent=domain===2?gold:silver
    const bezel=mesh(new THREE.TorusGeometry(.30,.015,8,64),accent);bezel.rotation.x=Math.PI/2;icon.add(bezel)
    if(domain===0){const halo=mesh(new THREE.TorusGeometry(.17,.027,10,64),glass);halo.rotation.x=Math.PI/2;icon.add(halo);const dot=mesh(new THREE.SphereGeometry(.09,16,10),gold);dot.position.x=.17;icon.add(dot)}
    if(domain===1){const points=Array.from({length:25},(_,i)=>new THREE.Vector3((i/24-.5)*.4,.035,Math.sin(i/24*Math.PI*3)*.09));icon.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.025,8,false),accent))}
    if(domain===2){for(let bar=0;bar<3;bar++){const column=mesh(new THREE.BoxGeometry(.065,.10+bar*.07,.09),gold);column.position.set((bar-1)*.115,(.10+bar*.07)/2,0);icon.add(column)}}
    if(domain===3){const diamond=mesh(new THREE.OctahedronGeometry(.17,0),silver);diamond.position.y=.10;icon.add(diamond)}
  }
  const center = mesh(new THREE.OctahedronGeometry(.48, 0), glass)
  center.position.set(0,2.24,0); center.rotation.set(.2, .5, .08); scene.add(center)
  const focusMaterial=mat(accentChampagne.clone())
  const core = mesh(new THREE.OctahedronGeometry(.16, 0), focusMaterial); core.position.copy(center.position); scene.add(core)
  const crown=new THREE.Group();crown.position.copy(center.position);crown.rotation.set(.20,0,.06);scene.add(crown)
  const crownPlate=mesh(new THREE.CylinderGeometry(.73,.73,.045,96),heroGlass);crownPlate.castShadow=false;crown.add(crownPlate)
  for(const [radius,tube,material] of [[.78,.070,heroGlass],[.58,.012,accentChampagne]] as const){const ring=mesh(new THREE.TorusGeometry(radius,tube,12,128),material);ring.rotation.x=Math.PI/2;crown.add(ring)}
  const crownLip=mesh(new THREE.TorusGeometry(.78,.009,6,128),opticalRim);crownLip.rotation.x=Math.PI/2;crownLip.position.y=.04;crownLip.castShadow=false;crown.add(crownLip)
  // A single horizontal optical rail carries every module, not four screen-space cards.
  const orbitX = 4.75, orbitZ = 3.75, trackY = -.05
  const panelAngles = [3.95, 5.25, .75, 2.25]
  const panelWidth = 2.65, panelHeight = 2.4
  const trackShape = new THREE.Shape()
  trackShape.absellipse(0, 0, orbitX + .38, orbitZ + .38, 0, Math.PI * 2, false, 0)
  const opening = new THREE.Path()
  opening.absellipse(0, 0, orbitX - .38, orbitZ - .38, 0, Math.PI * 2, true, 0)
  trackShape.holes.push(opening)
  const socketMaterial=mat(new THREE.MeshStandardMaterial({color:'#a4aaa5',metalness:.24,roughness:.48}))
  const sockets:{object:THREE.Mesh;center:THREE.Vector3[]}[]=[]
  for(const angle of panelAngles){
    const speed=Math.hypot(orbitX*Math.sin(angle),orbitZ*Math.cos(angle)),halfSpan=(panelWidth+.10)/speed/2
    const path=new THREE.Path(),floorShape=new THREE.Shape()
    const coordinates:THREE.Vector2[]=[]
    // Rotation -PI/2 maps shape Y to world -Z. Negate Y here so the recess
    // follows the same world ellipse as the standing panel, including its ends.
    for(let i=0;i<=48;i++){const a=angle-halfSpan+i/48*halfSpan*2;coordinates.push(new THREE.Vector2((orbitX+.13)*Math.cos(a),-(orbitZ+.13)*Math.sin(a)))}
    for(let i=48;i>=0;i--){const a=angle-halfSpan+i/48*halfSpan*2;coordinates.push(new THREE.Vector2((orbitX-.13)*Math.cos(a),-(orbitZ-.13)*Math.sin(a)))}
    for(const shape of [path,floorShape]){coordinates.forEach((point,i)=>i?shape.lineTo(point.x,point.y):shape.moveTo(point.x,point.y));shape.closePath()}
    trackShape.holes.push(path)
    const cavity=mesh(new THREE.ExtrudeGeometry(floorShape,{depth:.08,bevelEnabled:false,steps:1,curveSegments:48}),socketMaterial);cavity.rotation.x=-Math.PI/2;cavity.position.y=trackY-.10;cavity.castShadow=false;scene.add(cavity)
    sockets.push({object:cavity,center:Array.from({length:49},(_,i)=>new THREE.Vector3((coordinates[i].x+coordinates[97-i].x)/2,(coordinates[i].y+coordinates[97-i].y)/2,.08))})
  }
  const track = mesh(new THREE.ExtrudeGeometry(trackShape, { depth: .08, bevelEnabled: true, bevelSize: .025, bevelThickness: .018, bevelSegments: 2, steps: 1, curveSegments: 96 }), glass)
  track.rotation.x = -Math.PI / 2; track.position.y = trackY; track.castShadow = false; scene.add(track)
  for(const offset of [-.38,.38]){
    const points=Array.from({length:161},(_,i)=>{const angle=i/160*Math.PI*2;return new THREE.Vector3((orbitX+offset)*Math.cos(angle),trackY+.025,(orbitZ+offset)*Math.sin(angle))})
    const edge=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),160,.009,6,true),opticalRim);edge.castShadow=false;scene.add(edge)
  }
  const panels = panelAngles.map((angle, index) => {
    const foot = new THREE.Vector3(Math.cos(angle)*orbitX, trackY+.12, Math.sin(angle)*orbitZ)
    const plate = slab(panelWidth, panelHeight, .065, .09, screenGlass)
    const speed = Math.hypot(orbitX*Math.sin(angle),orbitZ*Math.cos(angle))
    const direction = -Math.sin(angle) >= 0 ? 1 : -1
    const bend = (x:number,y:number,z:number) => {
      const a = angle + direction*x/speed
      const normal = new THREE.Vector2(Math.cos(a)/orbitX,Math.sin(a)/orbitZ).normalize()
      return new THREE.Vector3(orbitX*Math.cos(a)-foot.x+normal.x*z,y,orbitZ*Math.sin(a)-foot.z+normal.y*z)
    }
    const vertices:number[]=[],indices:number[]=[],segments=48
    for(let i=0;i<=segments;i++) {
      for(const depth of [-.0325,.0325]) for(const y of [-panelHeight/2,panelHeight/2]) {
        const point=bend((i/segments-.5)*panelWidth,y,depth);vertices.push(point.x,point.y,point.z)
      }
      if(i<segments){const n=i*4;indices.push(n+2,n+6,n+3,n+3,n+6,n+7,n,n+1,n+4,n+1,n+5,n+4,n,n+4,n+2,n+2,n+4,n+6,n+1,n+3,n+5,n+3,n+7,n+5)}
    }
    const end=segments*4;indices.push(0,2,1,1,2,3,end,end+1,end+2,end+1,end+3,end+2)
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometries.push(geometry);plate.geometry=geometry
    plate.userData.bend = bend
    plate.userData.direction=direction
    plate.castShadow = false
    // The lower edge follows the rail; its bottom bevel is seated in the glass band.
    plate.position.copy(foot).add(new THREE.Vector3(0,panelHeight/2-.14,0))
    scene.add(plate)
    const panelLip=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length:49},(_,i)=>bend((i/48-.5)*panelWidth,panelHeight/2,.033))),48,.008,6,false),opticalRim);panelLip.castShadow=false;plate.add(panelLip)
    const socketEdge=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length:49},(_,i)=>bend((i/48-.5)*(panelWidth+.08),-panelHeight/2+.11,-.11))),48,.012,6,false),gold);socketEdge.castShadow=false;plate.add(socketEdge)
    const module=modules[index]
    if(module){
      const accent=mat(new THREE.MeshBasicMaterial({color:module.accent,side:THREE.DoubleSide}))
      accent.name='Accent Material / data ceramic'
      const addGraphic=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z=.11*(Math.sin(angle)>=0?1:-1))=>{
        const attribute=geometry.getAttribute('position')
        for(let i=0;i<attribute.count;i++){const point=bend(x+attribute.getX(i),y+attribute.getY(i),z+attribute.getZ(i));attribute.setXYZ(i,point.x,point.y,point.z)}
        geometry.computeVertexNormals();const object=mesh(geometry,material);object.castShadow=false;plate.add(object)
      }
      if(module.shape==='timeline'){
        for(let i=0;i<module.values.length;i++){const x=-.94+i*1.88/Math.max(1,module.values.length-1),y=Math.sin(i*.55)*.12
          const ring=new THREE.TorusGeometry(.105,.018,8,48);ring.scale(1,1.45,1);addGraphic(ring,accentSilver,x,y)
          if(module.values[i]!==null){const inner=new THREE.TorusGeometry(.06,.012,6,40);inner.scale(1,1.45,1);addGraphic(inner,accent,x,y)}
          if(module.values[i]===0)addGraphic(new THREE.SphereGeometry(.025,10,8),gold,x,y)
        }
      }else if(module.shape==='spectrum'){
        let points:THREE.Vector3[]=[]
        const flush=()=>{
          if(points.length===1){addGraphic(new THREE.SphereGeometry(.09,16,10),accent,points[0]!.x,points[0]!.y)}
          if(points.length>=2){
            const curve=new THREE.CatmullRomCurve3(points),vertices:number[]=[],indices:number[]=[]
            for(let i=0;i<=80;i++){
              const point=curve.getPoint(i/80),tangent=curve.getTangent(i/80),normal=new THREE.Vector3(-tangent.y,tangent.x,0).normalize().multiplyScalar(.065)
              for(const depth of [-.018,.018])for(const side of [-1,1])vertices.push(point.x+normal.x*side,point.y+normal.y*side,depth)
              if(i<80){const n=i*4;indices.push(n,n+4,n+1,n+1,n+4,n+5,n+2,n+3,n+6,n+3,n+7,n+6,n,n+2,n+4,n+2,n+6,n+4,n+1,n+5,n+3,n+3,n+5,n+7)}
            }
            indices.push(0,1,2,1,3,2,320,322,321,321,322,323)
            const ribbon=new THREE.BufferGeometry();ribbon.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));ribbon.setIndex(indices);addGraphic(ribbon,accent,0,0)
          }points=[]
        }
        module.values.forEach((value,i)=>{if(value===null){flush();return}points.push(new THREE.Vector3(-1+i*2/Math.max(1,module.values.length-1),-.65+value/10*1.25,0))});flush()
      }else if(module.shape==='columns'){
        const max=Math.max(1,...module.values.map(value=>Math.abs(value??0)))
        module.values.forEach((value,i)=>{if(value===null)return;const height=Math.max(.025,Math.abs(value)/max*1.2),baseline=-.62;const geometry=new THREE.BoxGeometry(.14,height,.08);addGraphic(geometry,value<0?accent:gold,-.9+i*1.8/Math.max(1,module.values.length-1),baseline+(value<0?-height:height)/2)})
      }else{
        module.values.forEach((_,i)=>{const geometry=new THREE.OctahedronGeometry(.11,0);geometry.scale(1,1.4,.5);addGraphic(geometry,accentSilver,-.86+i*.57,-.32+i*.20)})
      }
    }
    return plate
  })
  const turntable=new THREE.Group()
  for(const object of [...scene.children])if(object!==floor)turntable.add(object)
  scene.add(turntable)
  // Quiet architectural light planes and fine floor etching enrich the warm studio.
  const backgroundObjects=new THREE.Group();scene.add(backgroundObjects)
  const etched=mat(new THREE.MeshBasicMaterial({color:'#b7cdd2',transparent:true,opacity:.18,depthWrite:false}))
  for(let i=0;i<6;i++){const line=mesh(new THREE.BoxGeometry(24,.004,.004),etched);line.position.set(0,-.64,(i-3)*1.3);line.rotation.y=-.36;line.castShadow=false;backgroundObjects.add(line)}
  scene.add(new THREE.HemisphereLight('#fff9ed', '#8c989e', .9))
  const key = new THREE.DirectionalLight('#fff4e1', 1.9); key.position.set(-6, 8, 7); key.castShadow = true
  key.shadow.mapSize.set(1024, 1024);key.shadow.radius=3; key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7; key.shadow.bias = -.0005; key.shadow.normalBias = .025; scene.add(key)
  const fill = new THREE.DirectionalLight('#eef4f4', .65); fill.position.set(4, 4, -5); scene.add(fill)
  const rimLight=new THREE.DirectionalLight('#ddebf4',.45);rimLight.position.set(2,3,-7);scene.add(rimLight)
  let frames = 0, disposed = false, view = 'front', focusFrame=0
  let studioEnvironment: THREE.WebGLRenderTarget | undefined
  function draw() {
    if (disposed) return
    const width = host.clientWidth, height = host.clientHeight
    if (!width || !height) return
    const mobile = width < 700, half = mobile ? 5.4 : 3.8
    camera.left = -half * width / height; camera.right = half * width / height; camera.top = half; camera.bottom = -half
    camera.position.set(view === 'side' ? 5 : 0, mobile ? 6.8 : 7.7, 12)
    camera.lookAt(0, mobile ? .4 : .4, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld()
    panels.forEach(panel => { panel.visible = true })
    scene.updateMatrixWorld(true)
    resizeSurface(renderer,width,height)
    const start = performance.now(); renderer.render(scene, camera); frames++
    const anchors = panels.map((panel,index) => {
      const project = (x:number,y:number) => {
        const point = panel.localToWorld(panel.userData.bend(x,y,.075) as THREE.Vector3).project(camera)
        return new THREE.Vector2((point.x+1)*width/2,(1-point.y)*height/2)
      }
      const facing=project(panelWidth/2,0).x>=project(-panelWidth/2,0).x?1:-1
      const topLeft = project(-panelWidth/2*facing,panelHeight/2), topRight = project(panelWidth/2*facing,panelHeight/2), bottomLeft = project(-panelWidth/2*facing,-panelHeight/2)
      const horizontal = topRight.clone().sub(topLeft).divideScalar(280), vertical = bottomLeft.clone().sub(topLeft).divideScalar(240)
      let seatingError=panel.userData.seatingError as number|undefined
      if(seatingError===undefined){seatingError=0
      const positions=panel.geometry.getAttribute('position'),socket=sockets[index]
      for(let i=0;i<=48;i++){
        const sample=(.5+panel.userData.direction*(i/48-.5)*panelWidth/(panelWidth+.10))*48,first=Math.floor(sample),blend=sample-first
        const floor=socket.object.localToWorld(socket.center[first].clone().lerp(socket.center[Math.min(48,first+1)],blend))
        const base=panel.localToWorld(new THREE.Vector3((positions.getX(i*4)+positions.getX(i*4+2))/2,(positions.getY(i*4)+positions.getY(i*4+2))/2,(positions.getZ(i*4)+positions.getZ(i*4+2))/2))
        seatingError=Math.max(seatingError,base.distanceTo(floor))
      }
      panel.userData.seatingError=seatingError
      }
      return { x: topLeft.x, y: topLeft.y, width:280, height:240, transform:`matrix(${horizontal.x},${horizontal.y},${vertical.x},${vertical.y},0,0)`, orbit:{x:panel.position.x,z:panel.position.z,baseY:panel.position.y-panelHeight/2,seatingError} }
    })
    onFrame(anchors, { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, renderMs: performance.now() - start, frames, pixelRatio: renderer.getPixelRatio() })
  }
  const resize = new ResizeObserver(draw); resize.observe(host)
  // Reuse the project's attributed real studio HDR instead of flat white room reflections.
  new HDRLoader().load('/environments/studio_small_09_1k.hdr', texture => {
    if (disposed) { texture.dispose(); return }
    const generator = new THREE.PMREMGenerator(renderer)
    studioEnvironment = generator.fromEquirectangular(texture)
    texture.dispose(); generator.dispose()
    scene.environment = studioEnvironment.texture
    draw()
  }, undefined, () => { /* The procedural studio remains a working local fallback. */ })
  const contextLost = (event: Event) => { event.preventDefault(); host.dispatchEvent(new CustomEvent('orbital-context-lost')) }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  draw()
  return {
    draw,
    setView(value: 'front' | 'side') { view = value; draw() },
    setYaw(value:number){turntable.rotation.y=value;draw()},
    setFocus(id:string){
      cancelAnimationFrame(focusFrame)
      const index=modules.findIndex(module=>module.id===id),module=modules[index]
      if(!module)return
      const from=focusMaterial.color.clone(),to=new THREE.Color(module.accent),start=performance.now(),scale=core.scale.x,target=1+index*.10
      const tick=(now:number)=>{if(disposed)return;const t=matchMedia('(prefers-reduced-motion:reduce)').matches?1:Math.min(1,(now-start)/420),ease=t*t*(3-2*t);focusMaterial.color.copy(from).lerp(to,ease);core.scale.setScalar(scale+(target-scale)*ease);draw();if(t<1)focusFrame=requestAnimationFrame(tick)}
      focusFrame=requestAnimationFrame(tick)
    },
    dispose() {
      disposed = true; cancelAnimationFrame(focusFrame); resize.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose())
      textures.forEach(texture=>texture.dispose());environment.dispose(); studioEnvironment?.dispose(); renderer.dispose();renderer.forceContextLoss(); renderer.domElement.remove()
    },
  }
}
