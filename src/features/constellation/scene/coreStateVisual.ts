import * as THREE from 'three'
import {coreAppearance,type CoreState} from '../domain/coreAppearance'
// Independent inner optical structure. No private record is copied into supporter effects.
export function createCoreStateVisual(parent:THREE.Object3D){
 const group=new THREE.Group();group.position.set(0,1.3,0);parent.add(group)
 const geometry=new THREE.TorusGeometry(.49,.018,8,80)
 const materials=[0,1,2].map(()=>new THREE.MeshStandardMaterial({color:'#b6d7ed',metalness:.65,roughness:.24,emissive:'#b6d7ed',emissiveIntensity:.25,transparent:true,opacity:.8}))
 const rings=materials.map(material=>{const ring=new THREE.Mesh(geometry,material);group.add(ring);return ring})
 const debrisGeometry=new THREE.OctahedronGeometry(.021,0),debrisMaterial=new THREE.MeshStandardMaterial({color:'#282631',metalness:.32,roughness:.48})
 const debris=new THREE.InstancedMesh(debrisGeometry,debrisMaterial,84);debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(debris)
 const dummy=new THREE.Object3D();let appearance=coreAppearance(),enabled=true
 function update(time:number){
  rings.forEach((ring,i)=>{ring.rotation.set(.55+i*.73+Math.sin(time*appearance.speed+i)*appearance.distortion, time*appearance.speed*(i%2?-.28:.22)+i, i*.85);ring.scale.setScalar(1+i*.1+appearance.tension*.12+Math.sin(time*appearance.speed*2+i)*appearance.distortion)})
  for(let i=0;i<debris.count;i++){const a=i*2.39996+time*.12,r=.42+(i%7)*.035;dummy.position.set(Math.cos(a)*r,Math.sin(i*1.73+time*.2)*.4,Math.sin(a)*r);dummy.rotation.set(a,i*.7,a*.4);dummy.scale.setScalar(.4+(i%5)*.27);dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix)}
  debris.instanceMatrix.needsUpdate=true
 }
 return {get appearance(){return appearance},set(state:CoreState|undefined,visible:boolean){appearance=coreAppearance(state);enabled=visible;group.visible=enabled;debris.count=appearance.fragments;materials.forEach((material,i)=>{material.color.set(i===1?appearance.secondary:appearance.color);material.emissive.copy(material.color)});update(0)},update,dispose(){group.removeFromParent();geometry.dispose();debrisGeometry.dispose();debrisMaterial.dispose();materials.forEach(material=>material.dispose())}}
}
