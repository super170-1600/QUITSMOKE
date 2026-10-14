<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,watch} from 'vue'
import * as THREE from 'three'
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js'
import type {CheckinModel} from '@/types/domain'
import {haloVisual,haloAmount,haloMood} from '@/visuals/haloVisual'
import DailyHalo from './DailyHalo.vue'
const props=defineProps<{mode:'daily'|'archive';date:string;record?:CheckinModel|null;dates?:string[];records?:CheckinModel[];selectedDate?:string|null;mood?:CheckinModel['mood'];score?:number|null;pose?:{yaw:number;pitch:number}}>()
const emit=defineEmits<{project:[nodes:{date:string;x:number;y:number;ring:number}[]]}>()
const host=ref<HTMLDivElement>(),failed=ref(false)
let archiveRoot:THREE.Group
let renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,objects:THREE.Group,environment:THREE.Texture,resize:ResizeObserver
const resources:(THREE.BufferGeometry|THREE.Material|THREE.Texture)[]=[]
function material<T extends THREE.Material>(value:T){resources.push(value);return value}
function mesh(geometry:THREE.BufferGeometry,mat:THREE.Material){resources.push(geometry);const obj=new THREE.Mesh(geometry,mat);obj.castShadow=true;obj.receiveShadow=true;return obj}
function sculpture(record:CheckinModel|null|undefined,date:string,scale=1){
 const group=new THREE.Group(),state=haloVisual(date,record,date===props.date),amount=haloAmount(record?.cigarettes),appearance=haloMood(props.mode==='daily'?props.mood??record?.mood:record?.mood)
 const glass=material(new THREE.MeshPhysicalMaterial({color:'#8fbbd3',roughness:.06,metalness:.04,transmission:.89,thickness:.2,ior:1.46,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.15}))
 const silver=material(new THREE.MeshStandardMaterial({color:'#284c66',metalness:.85,roughness:.16}))
 const belt=material(new THREE.MeshStandardMaterial({color:appearance.color,metalness:.7,roughness:.18,emissive:appearance.color,emissiveIntensity:record ? .17 : .02}))
 if(props.selectedDate===date){group.add(mesh(new THREE.TorusGeometry(.7,.012,8,96),material(new THREE.MeshStandardMaterial({color:'#c58b32',metalness:.65,roughness:.2,emissive:'#b27929',emissiveIntensity:.2}))))}
 if(record){
  group.add(mesh(new THREE.TorusGeometry(.55,.075,16,112),glass))
  const rim=mesh(new THREE.TorusGeometry(.615,.013,8,112),silver);rim.position.z=-.015;group.add(rim)
  if(state.complete)group.add(mesh(new THREE.TorusGeometry(.46,.039,12,112),belt))
  else for(let i=0;i<amount.fragments;i++){const arc=mesh(new THREE.TorusGeometry(.46,.039,12,24,Math.PI*2/amount.fragments*amount.coverage),belt);arc.rotation.z=i*Math.PI*2/amount.fragments;group.add(arc)}
  for(let i=0;i<state.texture;i++){const ring=mesh(new THREE.TorusGeometry(.25+i*.013,.006,6,64,Math.PI*1.3),silver);ring.rotation.z=i*.7;ring.position.z=.025;group.add(ring)}
  if(amount.intensity>0){
   const charcoal=material(new THREE.MeshPhysicalMaterial({color:'#263849',metalness:.4,roughness:.26,clearcoat:1}))
   for(let i=0;i<Math.ceil(amount.intensity*30);i++){const angle=i*2.399;const fragment=mesh(new THREE.IcosahedronGeometry(.009+amount.intensity*.018+(i%3)*.004,0),charcoal);const radius=.49+(i%4)*.022;fragment.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,.09+(i%3)*.014);fragment.rotation.set(i*.9,i*.4,i);group.add(fragment)}
  }
 }else{
  const empty=material(new THREE.MeshStandardMaterial({color:'#a9bdc8',metalness:.4,roughness:.4,transparent:true,opacity:.22}))
  group.add(mesh(new THREE.TorusGeometry(.55,.013,6,72,Math.PI*1.75),empty))
 }
 // Mood can be previewed before an amount is entered, without inventing a zero-smoking record.
 if(record||props.mode==='daily'&&props.mood){
  const moodMaterial=material(new THREE.MeshPhysicalMaterial({color:appearance.color,metalness:.25,roughness:appearance.shape==='faceted'?.2:.09,transmission:.2,thickness:.25,clearcoat:1,emissive:appearance.color,emissiveIntensity:appearance.shape==='low'?.035:.2}))
  const core=mesh(appearance.shape==='faceted'?new THREE.IcosahedronGeometry(.205,0):new THREE.SphereGeometry(appearance.shape==='radiant'?.195:.18,24,16),moodMaterial)
  core.scale.set(1,appearance.shape==='low'?.6:appearance.shape==='orbit'?1.16:1,.6);core.position.y=appearance.shape==='low'?-.055:0;group.add(core)
  if(appearance.shape==='orbit'){for(let i=0;i<3;i++){const orbit=mesh(new THREE.TorusGeometry(.255+i*.024,.011,8,72,Math.PI*1.65),belt);orbit.rotation.set(.5+i*.25,-.45+i*.3,i*1.8);orbit.position.z=.06;group.add(orbit)}}
  if(appearance.shape==='faceted'){for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;const shard=mesh(new THREE.OctahedronGeometry(.034,0),moodMaterial);shard.position.set(Math.cos(angle)*.285,Math.sin(angle)*.285,.045);shard.rotation.z=angle;group.add(shard)}}
  if(appearance.shape==='low'){const arc=mesh(new THREE.TorusGeometry(.26,.014,8,64,Math.PI*1.25),belt);arc.rotation.set(.35,.2,Math.PI*.9);arc.position.y=-.055;group.add(arc)}
 }
 group.scale.setScalar(scale);return group
}
function clear(){objects?.clear();for(const resource of resources.splice(0))resource.dispose()}
function fallback(){emit('project',(props.dates??[]).map((date,index)=>{const ring=Math.floor(index/7),angle=index%7*Math.PI*2/7,radius=10+ring*5.7;return {date,x:50+Math.sin(angle)*radius,y:50-Math.cos(angle)*radius*.75,ring}}))}
function build(){if(failed.value){fallback();return}if(!scene)return;clear();const archive=props.mode==='archive'
 const floor=mesh(new THREE.PlaneGeometry(200,200),material(new THREE.ShadowMaterial({color:'#536d7d',opacity:.13})));floor.rotation.x=-Math.PI/2;floor.position.y=archive?-.5:-1.15;objects.add(floor)
 if(!archive){const halo=sculpture(props.record,props.date,2.45);halo.rotation.set(-.18,-.23,-.18);halo.position.y=.42;objects.add(halo)
  // This optical mounting is decorative; only the foreground halo represents the record.
  const mounting=material(new THREE.MeshPhysicalMaterial({color:'#9cc9e2',transmission:.9,roughness:.05,thickness:.16,ior:1.46,clearcoat:1}))
  for(let i=0;i<3;i++){const back=mesh(new THREE.TorusGeometry(.88+i*.15,.022+i*.006,10,112,Math.PI*1.8),mounting);back.position.set(0,.42,-.16-i*.09);back.rotation.set(.18+i*.1,.22-i*.14,.35+i*.7);objects.add(back)}
  for(let i=0;i<5;i++){const angle=i*1.23;const bead=mesh(new THREE.SphereGeometry(.025+i*.008,16,12),mounting);bead.position.set(Math.cos(angle)*1.55,.42+Math.sin(angle)*1.4,-.1+i*.06);objects.add(bead)}
 }else{
  archiveRoot=new THREE.Group();archiveRoot.position.y=0;objects.add(archiveRoot)
  const records=new Map(props.records?.map(row=>[row.checkinDate,row]));const rail=material(new THREE.MeshPhysicalMaterial({color:'#93bed1',metalness:.1,roughness:.13,transmission:.78,thickness:.09,ior:1.45,clearcoat:1})),edge=material(new THREE.MeshStandardMaterial({color:'#355b74',metalness:.85,roughness:.22}))
  for(let ring=0;ring<Math.ceil((props.dates?.length??0)/7);ring++){const radius=1.05+ring*.58,height=.15+ring*.12;const track=mesh(new THREE.TorusGeometry(radius,.085,16,144),rail);track.rotation.x=Math.PI/2;track.position.y=height;archiveRoot.add(track);const rim=mesh(new THREE.TorusGeometry(radius+.08,.02,8,144),material(new THREE.MeshStandardMaterial({color:ring%2?'#b78236':'#397ca2',metalness:.8,roughness:.18})));rim.rotation.x=Math.PI/2;rim.position.y=height-.027;archiveRoot.add(rim)
   for(let j=0;j<7;j++){const date=props.dates?.[ring*7+j];if(!date)continue;const angle=j*Math.PI*2/7;const halo=sculpture(records.get(date),date,.44);halo.rotation.set(-.12,0,0);halo.position.set(Math.sin(angle)*radius,height+.34,-Math.cos(angle)*radius);archiveRoot.add(halo)}
  }
  const central=sculpture({id:'center',checkinDate:props.date,cigarettes:0,cravingLevel:1,mood:'fulfilled',note:''},props.date,.85);central.position.y=.65;central.rotation.set(-.12,0,0);archiveRoot.add(central)
 }
 render()
}
function render(){if(failed.value){fallback();return}if(!host.value||!renderer)return;const width=host.value.clientWidth,height=host.value.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=props.mode==='archive'?Math.max(40,2*Math.atan(5.6/(10.2*camera.aspect))*180/Math.PI):34;camera.updateProjectionMatrix();if(props.mode==='archive'&&archiveRoot){archiveRoot.rotation.set(0,props.pose?.yaw??0,0);archiveRoot.updateMatrixWorld(true)}renderer.render(scene,camera)
 if(props.mode==='archive'){emit('project',(props.dates??[]).map((date,index)=>{const ring=Math.floor(index/7),angle=index%7*Math.PI*2/7,radius=1.05+ring*.58;const point=new THREE.Vector3(Math.sin(angle)*radius,.15+ring*.12+.34,-Math.cos(angle)*radius);archiveRoot.localToWorld(point);point.project(camera);return {date,x:(point.x+1)*50,y:(1-point.y)*50,ring}}))}
}
onMounted(()=>{try{
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.value!.appendChild(renderer.domElement)
 scene=new THREE.Scene();const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04).texture;scene.environment=environment;room.dispose();pmrem.dispose()
 camera=new THREE.PerspectiveCamera(34,1,.1,100);if(props.mode==='archive'){camera.position.set(.2,5.8,8.4);camera.lookAt(0,0,0)}else{camera.position.set(.3,1.8,6.6);camera.lookAt(0,.2,0)}
 scene.add(new THREE.HemisphereLight('#e6f5ff','#c4b79e',.85));const key=new THREE.DirectionalLight('#fff1d5',2.2);key.position.set(-4,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.bias=-.001;key.shadow.normalBias=.03;key.shadow.radius=4;scene.add(key);const cool=new THREE.DirectionalLight('#b8dfff',2.2);cool.position.set(5,3,-4);scene.add(cool)
 objects=new THREE.Group();scene.add(objects);build();resize=new ResizeObserver(render);resize.observe(host.value!)
 }catch{failed.value=true;clear();renderer?.domElement.remove();fallback()}})
watch(()=>[props.record,props.records,props.dates,props.selectedDate,props.mood,props.score],build,{deep:true})
watch(()=>props.pose,render,{deep:true})
onBeforeUnmount(()=>{resize?.disconnect();clear();environment?.dispose();renderer?.dispose();renderer?.forceContextLoss()})
</script>
<template><div ref="host" class="optical-scene" aria-hidden="true"><div v-if="failed" class="optical-fallback"><DailyHalo v-if="mode==='daily'" :date="date" :record="record" :size="180" :mood="mood" :reduced-motion="true"/><DailyHalo v-for="(item,index) in mode==='archive'?(dates??[]):[]" :key="item" :date="item" :record="records?.find(row=>row.checkinDate===item)" :size="44" :reduced-motion="true" :style="{position:'absolute',left:`${50+Math.sin(index%7*Math.PI*2/7)*(10+Math.floor(index/7)*5.7)}%`,top:`${50-Math.cos(index%7*Math.PI*2/7)*(10+Math.floor(index/7)*5.7)*.75}%`,transform:'translate(-50%,-50%)'}"/></div></div></template>
<style scoped>.optical-scene{position:absolute;inset:0;overflow:hidden}.optical-scene :deep(canvas){display:block;width:100%;height:100%}.optical-fallback{height:100%;display:grid;place-items:center;font-size:160px;color:#91b3c4}</style>
