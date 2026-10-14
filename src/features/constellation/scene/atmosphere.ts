import * as THREE from 'three'

// Local optical glow and depth-aware particles, without a full-frame bloom pass.
export function createAtmosphere(scene:THREE.Scene,sculpture:THREE.Group,path:(t:number,index:number)=>THREE.Vector3){
 const textures:THREE.Texture[]=[],materials:THREE.Material[]=[],geometries:THREE.BufferGeometry[]=[]
 const own=<T extends THREE.Material>(material:T)=>{materials.push(material);return material}
 const group=new THREE.Group();sculpture.add(group)
 const backdrop=document.createElement('canvas');backdrop.width=32;backdrop.height=256
 const ctx=backdrop.getContext('2d')!
 const background=new THREE.CanvasTexture(backdrop);background.colorSpace=THREE.SRGBColorSpace;textures.push(background)
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const glowContext=canvas.getContext('2d')!
 const glow=glowContext.createRadialGradient(64,64,0,64,64,64);glow.addColorStop(0,'rgba(255,255,255,.8)');glow.addColorStop(.18,'rgba(255,255,255,.35)');glow.addColorStop(.48,'rgba(255,255,255,.08)');glow.addColorStop(1,'rgba(255,255,255,0)');glowContext.fillStyle=glow;glowContext.fillRect(0,0,128,128)
 const glowTexture=new THREE.CanvasTexture(canvas);textures.push(glowTexture)
 const haloMaterial=own(new THREE.SpriteMaterial({map:glowTexture,color:'#ffe1a8',transparent:true,opacity:.23,depthWrite:false,blending:THREE.AdditiveBlending}))
 const halo=new THREE.Sprite(haloMaterial);halo.position.set(0,1.3,.3);halo.scale.set(2.8,2.8,1);group.add(halo)
 const distantMaterial=own(new THREE.SpriteMaterial({map:glowTexture,color:'#a8b9c8',transparent:true,opacity:.10,depthWrite:false,blending:THREE.AdditiveBlending}))
 const haze=new THREE.Sprite(distantMaterial);haze.position.set(-1,1,-3.2);haze.scale.set(9,4.8,1);scene.add(haze)
 const floorMaterial=own(new THREE.MeshBasicMaterial({map:glowTexture,color:'#e6bf7f',transparent:true,opacity:.26,depthWrite:false,blending:THREE.AdditiveBlending}))
 const floorGeo=new THREE.PlaneGeometry(6,4);geometries.push(floorGeo)
 const floorGlow=new THREE.Mesh(floorGeo,floorMaterial);floorGlow.rotation.x=-Math.PI/2;floorGlow.position.set(0,-1.23,.1);scene.add(floorGlow)
 const count=180,positions=new Float32Array(count*3),size=new Float32Array(count),tone=new Float32Array(count),brightness=new Float32Array(count)
 for(let i=0;i<count;i++){size[i]=i%17===0?5.5:1.2+(i%5)*.45;tone[i]=i%3===0?1:0}
 const particleGeo=new THREE.BufferGeometry();particleGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));particleGeo.setAttribute('size',new THREE.BufferAttribute(size,1));particleGeo.setAttribute('tone',new THREE.BufferAttribute(tone,1));particleGeo.setAttribute('brightness',new THREE.BufferAttribute(brightness,1));geometries.push(particleGeo)
 const particleMaterial=own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uStrength:{value:1},uRatio:{value:1}},vertexShader:`attribute float size;attribute float tone;attribute float brightness;varying float vTone;varying float vBrightness;uniform float uRatio;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vTone=tone;vBrightness=brightness;gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*uRatio*22./max(1.,-p.z),1.,16.);}`,fragmentShader:`varying float vTone;varying float vBrightness;uniform float uStrength;void main(){float r=length(gl_PointCoord-.5)*2.;float a=exp(-r*r*5.)*smoothstep(1.,.5,r)*vBrightness*uStrength;vec3 c=mix(vec3(1.,.73,.36),vec3(.78,.88,1.),vTone);gl_FragColor=vec4(c,a);}` }))
 const points=new THREE.Points(particleGeo,particleMaterial);points.frustumCulled=false;group.add(points)
 const trailPositions=new Float32Array(36*6),trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));geometries.push(trailGeo)
 const trailMaterial=own(new THREE.LineBasicMaterial({color:'#f5dfb7',transparent:true,opacity:.26,depthWrite:false,blending:THREE.AdditiveBlending}))
 const trails=new THREE.LineSegments(trailGeo,trailMaterial);trails.frustumCulled=false;group.add(trails)
 let dark=true,density=.65,orbitVisible=[true,true],coreVisible=true
 function update(time:number){
  const visibleCount=Math.round(count*density);particleGeo.setDrawRange(0,visibleCount)
  for(let i=0;i<count;i++){
   let p:THREE.Vector3
   if(i<132){const index=i%2,t=(i*.61803398875+time*(index===0?.023:-.017)+1)%1;p=path(t,index);p.add(new THREE.Vector3(Math.sin(i*4)*.08,Math.cos(i*3)*.08,Math.sin(i*2)*.08));brightness[i]=orbitVisible[index]?(i%17===0?.8:.3)+.15*Math.sin(time*1.7+i):0}
   else {p=new THREE.Vector3(Math.sin(i*15.7)*6,Math.cos(i*6.3)*3+1,Math.sin(i*4.2)*4-3);brightness[i]=.12+.09*Math.sin(time*.5+i)}
   positions.set([p.x,p.y,p.z],i*3)
  }
  for(let i=0;i<36;i++){const index=i%2,t=(i*.618+time*(index===0?.023:-.017)+1)%1;const a=path(t,index),b=path(Math.max(0,t-.013),index);if(!orbitVisible[index]||i>=Math.round(36*density))b.copy(a);trailPositions.set([a.x,a.y,a.z,b.x,b.y,b.z],i*6)}
  particleGeo.attributes.position!.needsUpdate=true;particleGeo.attributes.brightness!.needsUpdate=true;trailGeo.attributes.position!.needsUpdate=true
  haloMaterial.opacity=(dark?.26:.14)*(1+.13*Math.sin(time*1.2));halo.visible=coreVisible
 }
 function setTheme(mode:'light'|'dark',ratio:number){dark=mode==='dark';const wash=ctx.createLinearGradient(0,0,0,256);wash.addColorStop(0,dark?'#111b27':'#eeeae3');wash.addColorStop(.55,dark?'#242633':'#f4f1e9');wash.addColorStop(1,dark?'#302c30':'#dadfdd');ctx.fillStyle=wash;ctx.fillRect(0,0,32,256);background.needsUpdate=true;scene.background=background;scene.fog=new THREE.FogExp2(dark?'#222631':'#f0eee6',dark?.027:.009);particleMaterial.uniforms.uStrength!.value=dark?1.1:.75;particleMaterial.uniforms.uRatio!.value=ratio;distantMaterial.opacity=dark?.12:.035;floorMaterial.opacity=dark?.25:.12;trailMaterial.opacity=dark?.26:.18}
 return {setTheme,update,setOptions:(enabled:boolean,value:number,a:boolean,b:boolean,core:boolean)=>{group.visible=enabled||core;points.visible=trails.visible=enabled;density=Math.max(0,Math.min(1,value));orbitVisible=[a,b];coreVisible=core;haze.visible=enabled;floorGlow.visible=core},dispose:()=>{group.removeFromParent();haze.removeFromParent();floorGlow.removeFromParent();textures.forEach(value=>value.dispose());geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose())}}
}
