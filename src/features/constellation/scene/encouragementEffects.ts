import * as THREE from 'three'
import {effects,type EffectId,type EffectState} from '../config/effects'

export function createEncouragementEffects(root:THREE.Group,environment:THREE.Texture|null){
 const center=new THREE.Vector3(0,1.3,0),group=new THREE.Group();root.add(group)
 const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[]
 let state:EffectState={id:null,progress:0,status:'idle'},elapsed=0,duration=1,origin=new THREE.Vector3(),updateShape:(p:number)=>void=()=>{}
 function material<T extends THREE.Material>(value:T){materials.push(value);return value}
 function mesh(geometry:THREE.BufferGeometry,mat:THREE.Material){geometries.push(geometry);const object=new THREE.Mesh(geometry,mat);group.add(object);return object}
 function clear(){group.clear();geometries.splice(0).forEach(value=>value.dispose());materials.splice(0).forEach(value=>value.dispose());updateShape=()=>{}}
 function curve(offset:number){return new THREE.CubicBezierCurve3(origin.clone(),origin.clone().lerp(center,.3).add(new THREE.Vector3(offset*.55,.45+Math.abs(offset)*.7,.7+offset*.3)),origin.clone().lerp(center,.7).add(new THREE.Vector3(offset,.65+offset*.18,-.25-offset*.4)),center.clone())}
 function particles(count:number,color:string,radius=.025){
  const geo=new THREE.SphereGeometry(radius,6,4);geometries.push(geo)
  const mat=material(new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75,depthWrite:false}))
  const field=new THREE.InstancedMesh(geo,mat,count);field.frustumCulled=false;group.add(field);return {field,mat}
 }
 function build(id:EffectId){
  const gold=material(new THREE.MeshBasicMaterial({color:'#ffe0a3',transparent:true,opacity:.8,depthWrite:false}))
  const silver=material(new THREE.MeshBasicMaterial({color:'#dfedff',transparent:true,opacity:.75,depthWrite:false}))
  const glass=material(new THREE.MeshPhysicalMaterial({color:'#d7e5ec',roughness:.11,metalness:.25,transmission:.3,transparent:true,opacity:.46,thickness:.025,envMap:environment,envMapIntensity:1.3,side:THREE.DoubleSide,depthWrite:false}))
  const envelope=(p:number)=>Math.sin(Math.PI*p)**.55
  if(id==='glow'){
   const {field,mat}=particles(84,'#ffcd83'),matrix=new THREE.Matrix4(),lane=curve(.1)
   updateShape=p=>{for(let i=0;i<84;i++){const t=THREE.MathUtils.clamp(p*1.45-i/84*.40,0,1),point=lane.getPoint(t),spread=.11*Math.sin(Math.PI*t);point.add(new THREE.Vector3(Math.sin(i*4.1)*spread,Math.cos(i*5)*spread,Math.sin(i*2)*spread));matrix.makeTranslation(point.x,point.y,point.z);matrix.scale(new THREE.Vector3().setScalar((.4+i%4*.2)*envelope(p)));field.setMatrixAt(i,matrix)}field.instanceMatrix.needsUpdate=true;mat.opacity=.7*envelope(p)}
  }else if(id==='starlight'){
   const lanes=Array.from({length:7},(_,i)=>curve((i-3)*.38))
   const streaks=lanes.map(lane=>mesh(new THREE.TubeGeometry(lane,64,.012,6,false),silver))
   updateShape=p=>{lanes.forEach((lane,i)=>{const t=THREE.MathUtils.clamp(p*1.5-i*.065,0,1),head=lane.getPoint(t),tail=lane.getPoint(Math.max(0,t-.12));const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([tail,lane.getPoint(Math.max(0,t-.06)),head]),12,.012+i%3*.003,6,false);const previous=streaks[i]!.geometry;previous.dispose();streaks[i]!.geometry=geometry;geometries[geometries.indexOf(previous)]=geometry});silver.opacity=.85*envelope(p)}
  }else if(id==='resonance'){
   const rings=Array.from({length:3},(_,i)=>{const ring=mesh(new THREE.TorusGeometry(.38,.016,8,96),glass);ring.rotation.set(.3+i*.18,.12,i*.2);return ring})
   updateShape=p=>{rings.forEach((ring,i)=>{const local=THREE.MathUtils.clamp(p*1.3-i*.12,0,1);ring.position.copy(origin).lerp(center,local);ring.scale.setScalar(.7+local*2.5);ring.visible=local>0&&local<1});silver.opacity=.48*envelope(p);glass.opacity=.28*envelope(p)}
  }else if(id==='bloom'){
   const petals=Array.from({length:8},(_,i)=>{
    const vertices:number[]=[],indices:number[]=[]
    for(let j=0;j<=20;j++){const t=j/20,width=Math.sin(t*Math.PI)*.20;vertices.push(-width,t*.92,Math.sin(t*Math.PI)*.22,width,t*.92,Math.sin(t*Math.PI)*.22);if(j<20){const n=j*2;indices.push(n,n+1,n+2,n+1,n+3,n+2)}}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals()
    const petal=mesh(geometry,glass);petal.position.copy(center);petal.rotation.set(0,i*Math.PI/4,0);return petal
   })
   const {field,mat}=particles(40,'#f9d6a0',.018),matrix=new THREE.Matrix4()
   updateShape=p=>{const spread=Math.sin(p*Math.PI);petals.forEach((petal,i)=>{petal.rotation.set(spread*1.3,i*Math.PI/4+p*.2,0);petal.scale.setScalar(.2+spread);petal.position.copy(center).add(new THREE.Vector3(Math.sin(i*Math.PI/4)*spread*.75,0,Math.cos(i*Math.PI/4)*spread*.75))});glass.opacity=.52*envelope(p);for(let i=0;i<40;i++){const a=i/40*Math.PI*2,r=.6+p*.8;matrix.makeTranslation(center.x+Math.cos(a)*r,center.y+Math.sin(i*4)*p*.5,Math.sin(a)*r);matrix.scale(new THREE.Vector3().setScalar(envelope(p)));field.setMatrixAt(i,matrix)}field.instanceMatrix.needsUpdate=true;mat.opacity=.65*envelope(p)}
  }else{
   const {field,mat}=particles(128,'#e3efff',.018),matrix=new THREE.Matrix4()
   updateShape=p=>{for(let i=0;i<128;i++){const a=-.7+i/128*Math.PI*1.7+p*.4,r=1.45+Math.sin(i*5)*.055,formation=THREE.MathUtils.smoothstep(p,0,.35),point=new THREE.Vector3(Math.cos(a)*r,1.3+Math.sin(a)*r*.65,Math.sin(a)*r*.62);point.lerp(origin,(1-formation)*(i/128));matrix.makeTranslation(point.x,point.y,point.z);matrix.scale(new THREE.Vector3().setScalar((.55+i%3*.18)*envelope(p)));field.setMatrixAt(i,matrix)}field.instanceMatrix.needsUpdate=true;mat.opacity=.82*envelope(p)}
  }
 }
 function cancel(){clear();state={...state,status:'cancelled'};return {...state}}
 return {
  get active(){return state.status==='playing'},
  get state(){return {...state}},
  play(id:EffectId,from:THREE.Vector3,reduced:boolean){clear();origin.copy(from);duration=effects.find(effect=>effect.id===id)!.duration;elapsed=0;state={id,progress:0,status:reduced?'reduced':'playing'};if(!reduced){build(id);updateShape(.001)}return {...state}},
  tick(dt:number){if(state.status!=='playing')return;elapsed+=dt;const p=Math.min(1,elapsed/duration);state.progress=p;updateShape(p);if(p===1){clear();state.status='completed'}},
  seek(p:number){if(!state.id||!['playing','paused'].includes(state.status))return;state.status='paused';state.progress=Math.max(.001,Math.min(.999,p));updateShape(state.progress)},
  cancel,
  dispose(){clear();group.removeFromParent()},
 }
}
