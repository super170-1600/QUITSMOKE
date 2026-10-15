import * as THREE from 'three'
import {resizeSurface} from '@/visuals/resizeSurface'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import type {StudyOptions,StudyReport,StudyTarget} from '../types'
import {sampleSupporters,samplePlan} from '../adapters/mock'
import {createAtmosphere} from './atmosphere'
import {createEncouragementEffects} from './encouragementEffects'
import type {EffectId} from '../config/effects'
import {createCoreStateVisual} from './coreStateVisual'
import {createCheckinFeedback} from './checkinFeedback'

export async function createConstellation(host:HTMLElement,options:StudyOptions,onFrame:(targets:StudyTarget[],report:StudyReport)=>void,signal:AbortSignal){
 const response=await fetch('/models/nico-constellation.glb',{signal})
 if(!response.ok)throw new Error('无法读取生命核心资产')
 const asset=await response.arrayBuffer(),source=await new GLTFLoader().parseAsync(asset,'/models/')
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>()
 source.scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(material=>materials.add(material))})
 const disposeAsset=()=>{geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());textures.forEach(value=>value.dispose())}
 if(signal.aborted){disposeAsset();return undefined}
 let renderer:THREE.WebGLRenderer
 try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'})}catch(error){disposeAsset();throw error}
 host.appendChild(renderer.domElement)
 renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1
 renderer.info.autoReset=false
 renderer.setPixelRatio(Math.min(devicePixelRatio,host.clientWidth<700?1.25:1.5))
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.1,70),sculpture=new THREE.Group();sculpture.add(source.scene);scene.add(sculpture)
 const own=<T extends THREE.Material>(material:T)=>{materials.add(material);return material}
 const glass=own(new THREE.MeshPhysicalMaterial({color:'#f6fcfc',roughness:.045,transmission:1,thickness:.11,ior:1.46,envMapIntensity:1.1,clearcoat:.4}))
 const silver=own(new THREE.MeshStandardMaterial({color:'#b8c6ca',metalness:.82,roughness:.21}))
 const gold=own(new THREE.MeshStandardMaterial({color:'#c5a36d',metalness:.75,roughness:.24}))
 const hybrid=own(glass.clone());hybrid.transmission=.35;hybrid.transparent=true;hybrid.opacity=.28;hybrid.depthWrite=false
 const pearl=own(new THREE.MeshPhysicalMaterial({color:'#f5ebd7',metalness:.12,roughness:.16,clearcoat:1,emissive:'#ffd798',emissiveIntensity:1.8}))
 const shellMeshes:THREE.Mesh[]=[]
 source.scene.traverse(object=>{const mesh=object as THREE.Mesh;if(!mesh.isMesh)return;const name=(mesh.material as THREE.Material).name;mesh.material=name==='Optical Glass'?glass:name==='Champagne'?gold:silver;if(name==='Optical Glass')shellMeshes.push(mesh)})
 function mesh(geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Object3D=sculpture){geometries.add(geometry);const object=new THREE.Mesh(geometry,material);parent.add(object);return object}
 const heart=mesh(new THREE.IcosahedronGeometry(.36,2),pearl);heart.position.set(0,1.3,0);heart.rotation.set(.2,.35,.15)
 const coreLight=new THREE.PointLight('#ffdbab',3.5,4.5,2);coreLight.position.copy(heart.position);sculpture.add(coreLight)
 const core=source.scene.getObjectByName('LifeCore')!,orbitA=source.scene.getObjectByName('OrbitA')!,orbitB=source.scene.getObjectByName('OrbitB')!
 function path(t:number,index:number){const tilt=index===0?.44:-.70,roll=index===0?.62:-.50,a=(index===0?-.5:.65)+t*Math.PI*1.73,x=3.05*Math.cos(a),y=.12*Math.sin(a*2),z=1.9*Math.sin(a),raised=x*Math.sin(tilt)+y*Math.cos(tilt);return new THREE.Vector3(x*Math.cos(tilt)-y*Math.sin(tilt),1.3+raised*Math.cos(roll)-z*Math.sin(roll),raised*Math.sin(roll)+z*Math.cos(roll)+(index===0?.25:-.4))}
 const supporterPearl=own(pearl.clone())
 const supporters=(options.supporters??sampleSupporters).slice(0,2).map((supporter,index)=>{
  const group=new THREE.Group();sculpture.add(group);group.position.copy(path(index===0?.08:.55,index))
  const shell=mesh(new THREE.SphereGeometry(.19,32,20),glass,group)
  const nucleus=mesh(new THREE.IcosahedronGeometry(.095,2),index===0?gold:supporterPearl,group)
  const collar=mesh(new THREE.TorusGeometry(.22,.009,8,64),index===0?gold:silver,group);collar.rotation.set(.3,.3,index===0?.44:-.7)
  return {group,shell,nucleus,home:group.position.clone(),...supporter}
 })
 const plan=new THREE.Group();sculpture.add(plan)
 const planPoints=Array.from({length:65},(_,i)=>{const a=.16+i/64*Math.PI*.78;return new THREE.Vector3(Math.cos(a)*3.55,-.32+Math.sin(a)*.35,Math.sin(a)*2.45)})
 const planMetal=own(new THREE.MeshStandardMaterial({color:'#d9bd89',metalness:.78,roughness:.22,emissive:'#bd8c47',emissiveIntensity:.24}))
 const planGlass=own(new THREE.MeshPhysicalMaterial({color:'#fff7e8',transmission:.92,thickness:.15,ior:1.46,roughness:.08,clearcoat:1,envMapIntensity:1.15}))
 const planLine=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(planPoints),96,.035,8,false),planMetal,plan)
 const planProgress=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(planPoints.map(point=>point.clone().add(new THREE.Vector3(0,.052,0)))),96,.012,6,false),planMetal,plan);planProgress.visible=false
 const pendingPlan=own(new THREE.MeshStandardMaterial({color:'#a5adb8',roughness:.3,metalness:.65,transparent:true,opacity:.68,depthWrite:false}))
 const planNodeGeometry=new THREE.OctahedronGeometry(.105,0),planTickGeometry=new THREE.TorusGeometry(.082,.016,8,24),planAmountGeometry=new THREE.SphereGeometry(.073,12,8);geometries.add(planTickGeometry);geometries.add(planAmountGeometry);const planNodes=Array.from({length:90},()=>{const object=mesh(planNodeGeometry,pendingPlan,plan);object.visible=false;return object})
 // Two interlocking optical rings make the shared-goal entry distinct from supporter pearls.
 const planEntry=new THREE.Group();planEntry.position.copy(planPoints[32]!).add(new THREE.Vector3(0,.22,0));plan.add(planEntry)
 const planEntryGeometry=new THREE.TorusGeometry(.22,.028,10,64)
 const entryRings=[mesh(planEntryGeometry,planGlass,planEntry),mesh(planEntryGeometry,planMetal,planEntry)]
 entryRings[0]!.position.x=-.095;entryRings[0]!.rotation.set(.25,-.3,-.3)
 entryRings[1]!.position.x=.095;entryRings[1]!.rotation.set(-.25,.3,.3)
 const entryGem=mesh(new THREE.OctahedronGeometry(.095,0),planMetal,planEntry);entryGem.rotation.z=Math.PI/4
 const relics=new THREE.Group();sculpture.add(relics)
 const memory=new THREE.Group();sculpture.add(memory)
 const starCanvas=document.createElement('canvas');starCanvas.width=starCanvas.height=128
 const starContext=starCanvas.getContext('2d')!,starGlow=starContext.createRadialGradient(64,64,0,64,64,62)
 starGlow.addColorStop(0,'rgba(255,255,255,1)');starGlow.addColorStop(.08,'rgba(255,255,255,.95)');starGlow.addColorStop(.24,'rgba(255,255,255,.25)');starGlow.addColorStop(1,'rgba(255,255,255,0)')
 starContext.fillStyle=starGlow;starContext.fillRect(0,0,128,128)
 starContext.strokeStyle='rgba(255,255,255,.75)';starContext.lineWidth=1.2;starContext.beginPath();starContext.moveTo(28,64);starContext.lineTo(100,64);starContext.moveTo(64,28);starContext.lineTo(64,100);starContext.stroke()
 const starTexture=new THREE.CanvasTexture(starCanvas);textures.add(starTexture)
 const starMaterial=own(new THREE.SpriteMaterial({map:starTexture,color:'#ffe5ad',transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}))
 const sealMaterial=own(new THREE.SpriteMaterial({map:starTexture,color:'#c0e2fa',transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}))
 function random(id:string,salt:number){let hash=2166136261^salt;for(let i=0;i<id.length;i++)hash=Math.imul(hash^id.charCodeAt(i),16777619);hash=Math.imul(hash^(hash>>>16),0x7feb352d);hash=Math.imul(hash^(hash>>>15),0x846ca68b);return ((hash^(hash>>>16))>>>0)/4294967295}
 // Distant atmospheric stars are scenery; only record stars have clickable IDs.
 const skyPositions:number[]=[],skyColors:number[]=[]
 for(let i=0;i<520;i++){const id='sky-'+i;skyPositions.push((random(id,11)-.5)*23,(random(id,41)-.5)*14+1,-5-random(id,83)*7);const tone=i%5===0?new THREE.Color('#d3b88b'):new THREE.Color('#afc6df');skyColors.push(tone.r,tone.g,tone.b)}
 const skyGeometry=new THREE.BufferGeometry();skyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(skyPositions,3));skyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(skyColors,3));geometries.add(skyGeometry)
 const sky=new THREE.Points(skyGeometry,own(new THREE.PointsMaterial({size:.035,vertexColors:true,transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending})));scene.add(sky)
 let traceKey=''
 function syncTraces(next:StudyOptions){
  const rows=(next.traces??[]).slice(-100),key=JSON.stringify(rows)
  sky.visible=next.atmosphere==='dark'
  if(key===traceKey)return;traceKey=key;host.dataset.traceCount=String(rows.length)
  memory.clear()
  rows.forEach(row=>{
   const group=new THREE.Group();memory.add(group)
   let x=(random(row.id,7)-.5)*9.6,y=(random(row.id,53)-.5)*5.4+1.3
   if(Math.abs(x)<1.65&&Math.abs(y-1.3)<1.2)x=x<0?-2.05:2.05
   group.position.set(x,y,-1.6+random(row.id,97)*2.3);group.userData.traceId=row.id;group.userData.kind=row.kind
   const light=new THREE.Sprite(row.kind==='encouragement'?starMaterial:sealMaterial),size=(row.kind==='encouragement'?.16:.11)+random(row.id,31)*.08
   light.scale.set(size,size,1);group.userData.starSize=size;group.add(light)
  })
 }
 for(let i=0;i<2;i++){const object=mesh(new THREE.OctahedronGeometry(.075,0),i===0?glass:silver,relics);object.position.set(-2.45+i*.24,-.62,.5+i*.1)}
 const atmosphere=createAtmosphere(scene,sculpture,path)
 const floor=mesh(new THREE.PlaneGeometry(200,200),own(new THREE.MeshStandardMaterial({color:'#e9ece9',roughness:.5})),scene);floor.rotation.x=-Math.PI/2;floor.position.y=-1.25
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'rgba(60,58,52,.27)');gradient.addColorStop(.55,'rgba(90,80,68,.09)');gradient.addColorStop(1,'rgba(90,80,68,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128)
 const shadowTexture=new THREE.CanvasTexture(canvas);textures.add(shadowTexture)
 const contact=mesh(new THREE.PlaneGeometry(4.8,3.2),own(new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false})),scene);contact.rotation.x=-Math.PI/2;contact.position.y=-1.24
 scene.background=new THREE.Color('#f4f1e9')
 const ambient=new THREE.HemisphereLight('#fff7e7','#b4bbbe',1.05);scene.add(ambient)
 const key=new THREE.DirectionalLight('#fff0d6',1.6);key.position.set(-4,6,5);scene.add(key)
 const rim=new THREE.DirectionalLight('#dfeef6',1.15);rim.position.set(4,2,-4);scene.add(rim)
 let environment:THREE.WebGLRenderTarget|undefined
 try{
  const hdr=await new HDRLoader().loadAsync('/environments/studio_small_09_1k.hdr')
  if(signal.aborted){hdr.dispose();atmosphere.dispose();disposeAsset();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();return undefined}
  const studio=new THREE.Scene();studio.background=hdr
  const cards:THREE.Mesh[]=[]
  for(const [color,radiance,width,height,position] of [['#fff5df',3,.4,5,[-3,2,3]],['#e1eef7',2.4,.25,5,[3,2,2]],['#223039',.7,1.4,4,[2,1,-3]]] as const){const material=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(radiance),side:THREE.DoubleSide}),card=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);card.position.set(position[0],position[1],position[2]);card.lookAt(0,1.3,0);studio.add(card);cards.push(card)}
  const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(studio,.02);scene.environment=environment.texture
  cards.forEach(card=>{card.geometry.dispose();(card.material as THREE.Material).dispose()});hdr.dispose();pmrem.dispose()
 }catch{/* Studio key/rim keep a usable fallback. */}
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.1,0);controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=false;controls.rotateSpeed=.35;controls.minPolarAngle=.65;controls.maxPolarAngle=1.65
 const encouragement=createEncouragementEffects(sculpture,scene.environment)
 const feedback=createCheckinFeedback(sculpture)
 const stateVisual=createCoreStateVisual(sculpture)
 let disposed=false,paused=false,current=options,lastView=options.view,frameId=0,time=0,last=performance.now(),frames=0
 let projection:{id:string;from:THREE.Vector3;to:THREE.Vector3;elapsed:number;closing:boolean;resolve:()=>void}|undefined
 let projected:string|undefined
 function updateProjection(dt:number){
  if(!projection)return
  const item=supporters.find(value=>value.id===projection!.id)!
  projection.elapsed+=dt
  const p=Math.min(1,projection.elapsed/.85),t=p*p*(3-2*p)
  item.group.position.lerpVectors(projection.from,projection.to,t)
  item.group.scale.setScalar(projection.closing?.25+.75*t:1-.75*t)
  if(p===1){const finished=projection;projection=undefined;if(finished.closing){projected=undefined;controls.enabled=true}finished.resolve()}
 }
 function projectSupporter(id:string,open:boolean){
  projection?.resolve();projection=undefined
  const item=supporters.find(value=>value.id===id)
  if(!item)return Promise.resolve()
  if(projected&&projected!==id){const old=supporters.find(value=>value.id===projected)!;old.group.position.copy(old.home);old.group.scale.setScalar(1)}
  projected=id;controls.enabled=false
  const to=open?camera.position.clone().lerp(controls.target,.58):item.home.clone()
  return new Promise<void>(resolve=>{projection={id,from:item.group.position.clone(),to,elapsed:0,closing:!open,resolve};if(!current.motion||motion.matches){updateProjection(.85);draw()}else wake()})
 }
 const motion=matchMedia('(prefers-reduced-motion:reduce)')
 const isAnimated=()=>current.motion&&!motion.matches
 const hasAnimation=()=>isAnimated()||encouragement.active||feedback.active||Boolean(projection)
 function stop(){cancelAnimationFrame(frameId);frameId=0;last=performance.now()}
 function wake(){if(!disposed&&!paused&&!document.hidden&&hasAnimation()&&!frameId){last=performance.now();frameId=requestAnimationFrame(tick)}}
 function tick(now:number){frameId=0;if(disposed||paused||document.hidden||!hasAnimation())return;const budget=host.clientWidth<700?1000/30:1000/60;if(now-last<budget-.5){frameId=requestAnimationFrame(tick);return}const dt=Math.min(.05,(now-last)/1000);last=now;if(isAnimated()){time+=dt;supporters.forEach((value,index)=>{value.home.copy(path((index===0?.08:.55)+Math.sin(time*.1+index)*.025,index));if(value.id!==projected)value.group.position.copy(value.home)});atmosphere.update(time);memory.children.forEach(object=>{const light=object.children[0];if(light){const size=object.userData.starSize*(1+.12*Math.sin(time*.7+random(object.userData.traceId,13)*6.28));light.scale.set(size,size,1)}});stateVisual.update(time);heart.rotation.y=.35+time*.22*stateVisual.appearance.speed;core.rotation.y=time*.06}updateProjection(dt);feedback.update(dt);heart.scale.setScalar(1+(isAnimated()?stateVisual.appearance.breath*Math.sin(time*(.8+stateVisual.appearance.speed)):0)+feedback.pulse);encouragement.tick(dt);pearl.emissiveIntensity=(current.atmosphere==='dark'?1.2:.85)*(1+.08*Math.sin(time*1.2)+feedback.pulse+(encouragement.active?Math.sin(encouragement.state.progress*Math.PI)*.25:0));draw();if(hasAnimation())frameId=requestAnimationFrame(tick)}
 function pose(){const aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.position.set(current.view==='side'?5:0,4.1,Math.max(10.3,8/(2*Math.tan(THREE.MathUtils.degToRad(18.5))*aspect)));camera.lookAt(0,1.1,0);controls.update()}
 function draw(){
  if(disposed||paused||document.hidden||!host.clientWidth||!host.clientHeight)return
  if(resizeSurface(renderer,host.clientWidth,host.clientHeight)){camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix()}scene.updateMatrixWorld(true)
  const targets:StudyTarget[]=[]
  function target(id:string,position:THREE.Vector3,label:string){const p=position.clone().project(camera);if(p.z<1&&p.z>-1)targets.push({id,label,x:(p.x+1)*host.clientWidth/2,y:(1-p.y)*host.clientHeight/2})}
  if(current.layers.core)target('core',new THREE.Vector3(0,1.3,0),current.supporters?'生命核心':'生命核心 · 视觉样板')
  supporters.forEach((supporter,index)=>{if(supporter.group.visible)target(supporter.id,supporter.group.position,supporter.label)})
  if(plan.visible)target('plan',planEntry.getWorldPosition(new THREE.Vector3()),'共同计划')
  memory.children.forEach(object=>{if(object.userData.kind==='encouragement')target('memory:'+object.userData.traceId,object.getWorldPosition(new THREE.Vector3()),'鼓励印记 '+object.userData.traceId)})
  if(relics.visible)target('relic',new THREE.Vector3(-2.33,-.62,.55),'纪念晶体 · 示意')
  renderer.info.reset();const start=performance.now();renderer.render(scene,camera);frames++
  onFrame(targets,{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,renderMs:performance.now()-start,assetBytes:asset.byteLength,supporterCount:supporters.filter(value=>value.group.visible).length,orbitCount:Number(orbitA.visible)+Number(orbitB.visible),scheme:current.scheme,atmosphere:current.atmosphere,frames,animated:isAnimated(),effect:encouragement.state,feedback:feedback.state})
 }
 function update(next:StudyOptions){syncTraces(next);syncPlan(next);const viewChanged=next.view!==lastView;lastView=next.view;current=next;stateVisual.set(next.coreState,next.layers.core);pearl.color.set(stateVisual.appearance.color);pearl.emissive.set(stateVisual.appearance.secondary);coreLight.color.set(stateVisual.appearance.secondary);core.visible=heart.visible=coreLight.visible=next.layers.core;orbitA.visible=next.layers.orbitA;orbitB.visible=next.layers.orbitB&&next.members!==1;plan.visible=next.layers.planArc;relics.visible=next.layers.relics;supporters.forEach((value,index)=>value.group.visible=index<next.members&&(index===0?orbitA.visible:orbitB.visible));shellMeshes.forEach(value=>value.material=next.scheme==='A'?glass:hybrid);supporters.forEach(value=>value.shell.material=next.scheme==='A'?glass:hybrid);const dark=next.atmosphere==='dark';(floor.material as THREE.MeshStandardMaterial).color.set(dark?'#20222c':'#e9ece9');(floor.material as THREE.MeshStandardMaterial).roughness=dark?.24:.4;ambient.intensity=dark?.3:.9;glass.envMapIntensity=dark?.82:1.1;silver.emissive.set(dark?'#9cadbb':'#000000');silver.emissiveIntensity=dark?.10:0;gold.emissive.set(dark?'#b78c4c':'#000000');gold.emissiveIntensity=dark?.14:0;pearl.emissiveIntensity=dark?1.2:.85;floor.visible=contact.visible=!dark;key.intensity=dark?1.1:1.6;coreLight.distance=dark?2.4:4.5;atmosphere.setTheme(next.atmosphere,renderer.getPixelRatio());atmosphere.setOptions(next.layers.photons,next.density,orbitA.visible,orbitB.visible,next.layers.core);atmosphere.update(time);if(viewChanged)pose();if(!next.motion||!next.layers.core){updateProjection(.85);encouragement.cancel();feedback.cancel();}if(!isAnimated())stop();draw();wake()}
 controls.addEventListener('change',draw)
 function syncPlan(next:StudyOptions){
  const states=next.plan?.nodes??Array.from({length:samplePlan.nodes},(_,i)=>i<samplePlan.active?'verified':'missing')
  const empty=states.length===0,n=empty?7:Math.min(90,states.length)
  planLine.material=planMetal
  planMetal.emissiveIntensity=next.atmosphere==='dark'?.3:.08
  planProgress.visible=next.plan?.type==='limit'&&['active','completed','missed'].includes(next.plan.status)
  const coverage=states.filter(state=>state==='verified').length/Math.max(1,states.length)
  planProgress.geometry.setDrawRange(0,Math.floor((planProgress.geometry.index?.count??0)*coverage/3)*3)
  planNodes.forEach((node,i)=>{
   node.visible=i<n;if(i>=n)return
   const enabled=!empty&&(!next.plan||['active','completed','missed'].includes(next.plan.status)),verified=states[i]==='verified'&&enabled
   node.material=verified?planMetal:pendingPlan
   node.geometry=next.plan?.type==='scene'?planTickGeometry:next.plan?.type==='limit'?planAmountGeometry:planNodeGeometry
   node.scale.setScalar((verified?1:.78)*Math.min(1,Math.sqrt(14/n)))
   node.position.copy(planPoints[Math.round(i/Math.max(1,n-1)*64)]!).y+=.09
  })
 }
 const observer=new ResizeObserver(()=>{pose();draw()});observer.observe(host)
 const visibility=()=>{if(document.hidden){updateProjection(.85);stop();encouragement.cancel();feedback.cancel()}else{draw();wake()}};document.addEventListener('visibilitychange',visibility)
 const motionChanged=()=>{stop();if(motion.matches){updateProjection(.85);encouragement.cancel();feedback.cancel();}draw();wake()};motion.addEventListener('change',motionChanged)
 pose();update(options)
 return {update,projectSupporter,feedback:(kind:'record'|'node'|'plan')=>{encouragement.cancel();feedback.play(kind,motion.matches||!current.motion);draw();wake()},reset:()=>{pose();draw()},playEffect:(id:EffectId,senderId:string)=>{const from=supporters.find(value=>value.id===senderId&&value.group.visible)?.group.position??path(.2,0);const state=encouragement.play(id,from,motion.matches||!current.motion);draw();wake();return state},seekEffect:(progress:number)=>{encouragement.seek(progress);draw()},cancelEffect:()=>{encouragement.cancel();feedback.cancel();draw()},setPaused:(value:boolean)=>{paused=value;if(value){stop();encouragement.cancel();feedback.cancel()}else{draw();wake()}},dispose:()=>{disposed=true;projection?.resolve();projection=undefined;stop();observer.disconnect();controls.removeEventListener('change',draw);controls.dispose();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',motionChanged);encouragement.dispose();feedback.dispose();stateVisual.dispose();atmosphere.dispose();environment?.dispose();disposeAsset();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}}
}
