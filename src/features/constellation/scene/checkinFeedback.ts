import * as THREE from 'three'
/** Separate record acknowledgement and optional mock plan celebration; no business decisions. */
export function createCheckinFeedback(parent:THREE.Object3D){
 const group=new THREE.Group();group.position.set(0,1.3,0);parent.add(group)
 const silver=new THREE.MeshBasicMaterial({color:'#e1edf0',transparent:true,opacity:0,depthWrite:false})
 const gold=new THREE.MeshBasicMaterial({color:'#e7cc98',transparent:true,opacity:0,depthWrite:false})
 const geometry=new THREE.TorusGeometry(.55,.008,6,80,Math.PI*1.75)
 const rings=Array.from({length:3},(_,i)=>{const ring=new THREE.Mesh(geometry,i===2?gold:silver);ring.rotation.set(.5+i*.7,.2+i*.4,i*.8);group.add(ring);return ring})
 const particleGeometry=new THREE.IcosahedronGeometry(.009,0),particles=new THREE.InstancedMesh(particleGeometry,silver,32);group.add(particles)
 const relicGeometry=new THREE.OctahedronGeometry(.17,0),relic=new THREE.Mesh(relicGeometry,gold);relic.position.set(-1.45,-.72,.55);group.add(relic)
 const arcGeometry=new THREE.TorusGeometry(3.25,.009,6,100),arc=new THREE.Mesh(arcGeometry,silver);arc.rotation.x=Math.PI/2;arc.position.y=-1.6;arc.scale.y=.72;group.add(arc)
 const dummy=new THREE.Object3D();let elapsed=0,duration=0,kind:'record'|'node'|'plan'='record'
 function cancel(){duration=0;group.visible=false}
 function play(value:typeof kind,reduced:boolean){cancel();kind=value;if(reduced)return;elapsed=0;duration=value==='record'?1:value==='node'?2:3.5;group.visible=true;update(0)}
 function update(dt:number){if(!duration)return;elapsed+=dt;const p=Math.min(1,elapsed/duration),envelope=Math.sin(p*Math.PI);silver.opacity=.5*envelope;gold.opacity=.45*envelope;relic.visible=arc.visible=kind==='plan';relic.scale.setScalar(Math.min(1,p*2)*envelope);relic.rotation.y=p*Math.PI;arcGeometry.setDrawRange(0,Math.floor((arcGeometry.index?.count??0)*Math.min(1,.65+p*.5)/3)*3);rings.forEach((ring,i)=>{ring.visible=kind!=='record'&&i<(kind==='node'?1:3);ring.scale.setScalar(.9+p*.9+i*.25);ring.rotation.z+=dt*.15});for(let i=0;i<32;i++){const a=i*2.39996,r=.85*(1-p)+.26,z=(i%7-3)*.055;dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,z);dummy.scale.setScalar(envelope);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix)}particles.instanceMatrix.needsUpdate=true;if(p===1)cancel()}
 cancel()
 return {play,update,cancel,get state(){return {active:duration>0,kind,progress:duration?Math.min(1,elapsed/duration):0}},get active(){return duration>0},get pulse(){return duration?Math.sin(Math.min(1,elapsed/duration)*Math.PI)*.12:0},dispose(){cancel();parent.remove(group);geometry.dispose();particleGeometry.dispose();relicGeometry.dispose();arcGeometry.dispose();silver.dispose();gold.dispose()}}
}
