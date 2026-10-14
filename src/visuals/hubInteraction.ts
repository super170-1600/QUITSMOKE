import * as THREE from 'three'
import { hubModules, type HubFaceId } from '@/config/hubModules'
export type HubInteractionMode='idle'|'dragging'|'settling'|'focused'
export interface HubInteractionState {mode:HubInteractionMode;face:HubFaceId|null;hover:HubFaceId|null;activated:boolean}
export const validHubFaces=hubModules.filter(m=>m.enabled).map(m=>m.id)
export function nearestHubFace(normals:Map<HubFaceId,THREE.Vector3>,rotation:THREE.Quaternion,view:THREE.Vector3):HubFaceId {
  let best=validHubFaces[0]!,score=-Infinity
  for(const id of validHubFaces){const n=normals.get(id);if(!n)continue;const dot=n.clone().applyQuaternion(rotation).dot(view);if(dot>score){score=dot;best=id}}
  return best
}
export function alignedHubRotation(normal:THREE.Vector3,rotation:THREE.Quaternion,view:THREE.Vector3){return new THREE.Quaternion().setFromUnitVectors(normal.clone().applyQuaternion(rotation).normalize(),view.clone().normalize()).multiply(rotation).normalize()}

export function createHubInteraction(surface:HTMLElement,root:THREE.Group,camera:THREE.Camera,pickables:THREE.Mesh[],normals:Map<HubFaceId,THREE.Vector3>,options:{reduced():boolean;wake():void;change(state:HubInteractionState):void}) {
  const state:HubInteractionState={mode:'idle',face:null,hover:null,activated:false}
  const initial=root.quaternion.clone(),ray=new THREE.Raycaster(),point=new THREE.Vector2(),velocity=new THREE.Vector2()
  let pointer:number|null=null,startX=0,startY=0,lastX=0,lastY=0,lastTime=0,moved=false,inertia=0,elapsed=0
  const from=new THREE.Quaternion(),target=new THREE.Quaternion()
  const view=()=>camera.position.clone().sub(root.position).normalize()
  function emit(){const snapshot={...state};state.activated=false;options.change(snapshot);options.wake()}
  function hit(x:number,y:number){const rect=surface.parentElement!.getBoundingClientRect();point.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);root.updateMatrixWorld(true);ray.setFromCamera(point,camera);const mesh=ray.intersectObjects(pickables.filter(m=>m.visible),false)[0]?.object;return mesh?.userData.assetRole==='face'&&validHubFaces.includes(mesh.userData.faceId)?mesh.userData.faceId as HubFaceId:null}
  function settle(id?:HubFaceId){const face=id??nearestHubFace(normals,root.quaternion,view());state.face=face;state.hover=null;state.mode='settling';state.activated=false;from.copy(root.quaternion);target.copy(alignedHubRotation(normals.get(face)!,root.quaternion,view()));elapsed=0;inertia=0;if(options.reduced()){root.quaternion.copy(target);state.mode='focused'}emit()}
  function rotate(dx:number,dy:number){const delta=new THREE.Quaternion().setFromEuler(new THREE.Euler(dy,dx,0,'YXZ'));root.quaternion.premultiply(delta).normalize()}
  function down(e:PointerEvent){if(pointer!==null||e.button!==0)return;pointer=e.pointerId;startX=lastX=e.clientX;startY=lastY=e.clientY;lastTime=e.timeStamp;moved=false;velocity.set(0,0);inertia=0;state.activated=false;if(state.mode==='settling')state.mode='idle';surface.setPointerCapture(pointer);surface.focus({preventScroll:true});emit()}
  function move(e:PointerEvent){if(pointer===null){const hovered=hit(e.clientX,e.clientY);if(hovered!==state.hover){state.hover=hovered;emit()}return}if(e.pointerId!==pointer)return
    const dx=e.clientX-lastX,dy=e.clientY-lastY,seconds=Math.max(.008,(e.timeStamp-lastTime)/1000)
    if(!moved&&Math.hypot(e.clientX-startX,e.clientY-startY)>=7){moved=true;state.mode='dragging';state.face=null;state.hover=null}
    if(moved){const scale=.007;rotate(dx*scale,dy*scale);velocity.set(THREE.MathUtils.clamp(dx*scale/seconds,-3,3),THREE.MathUtils.clamp(dy*scale/seconds,-3,3));emit()}
    lastX=e.clientX;lastY=e.clientY;lastTime=e.timeStamp
  }
  function up(e:PointerEvent){if(pointer!==e.pointerId)return;pointer=null;if(surface.hasPointerCapture(e.pointerId))surface.releasePointerCapture(e.pointerId)
    if(moved){state.mode='settling';inertia=options.reduced()?0:.18;state.activated=false;if(!inertia)settle();else emit()}
    else{const face=hit(e.clientX,e.clientY);if(face){if(state.face===face&&state.mode==='focused'){state.activated=true;emit()}else settle(face)}}
  }
  function cancel(){if(pointer===null)return;pointer=null;velocity.set(0,0);settle()}
  function key(e:KeyboardEvent){const index=validHubFaces.indexOf(state.face as typeof validHubFaces[number]);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();settle(validHubFaces[(index+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+validHubFaces.length)%validHubFaces.length])}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(state.face&&state.mode==='focused'){state.activated=true;emit()}else settle()}
    else if(e.key==='Escape'){e.preventDefault();root.quaternion.copy(initial);inertia=0;state.mode='idle';state.face=null;state.hover=null;state.activated=false;emit()}
  }
  function leave(){if(pointer===null){state.hover=null;emit()}}
  surface.addEventListener('pointerdown',down);surface.addEventListener('pointermove',move);surface.addEventListener('pointerup',up);surface.addEventListener('pointercancel',cancel);surface.addEventListener('lostpointercapture',cancel);surface.addEventListener('pointerleave',leave);surface.addEventListener('keydown',key)
  return {state,focusFace(id:HubFaceId){if(validHubFaces.includes(id as typeof validHubFaces[number]))settle(id)},update(dt:number){
    if(state.mode!=='settling')return
    if(inertia>0){rotate(velocity.x*dt,velocity.y*dt);velocity.multiplyScalar(Math.exp(-14*dt));inertia-=dt;if(inertia<=0)settle();return}
    elapsed+=dt;const t=options.reduced()?1:Math.min(1,elapsed/.42),ease=1-Math.pow(1-t,3);root.quaternion.slerpQuaternions(from,target,ease);if(t===1){state.mode='focused';emit()}
  },get active(){return state.mode==='settling'},dispose(){surface.removeEventListener('pointerdown',down);surface.removeEventListener('pointermove',move);surface.removeEventListener('pointerup',up);surface.removeEventListener('pointercancel',cancel);surface.removeEventListener('lostpointercapture',cancel);surface.removeEventListener('pointerleave',leave);surface.removeEventListener('keydown',key)}}
}
