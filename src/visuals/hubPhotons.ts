import * as THREE from 'three'
export const curvePhase = (seed:number,time:number,speed:number) => THREE.MathUtils.euclideanModulo(seed+time*speed,1)

/** Independent world-space optics. Density controls actual instance count. */
export function createHubPhotons(environment: THREE.Texture, density = 1.2) {
  const group = new THREE.Group(); group.name = 'ExternalPhotonSystem'
  const curves: THREE.CatmullRomCurve3[] = []
  const maxParticles = 160
  let enabled = true
  const material = new THREE.MeshPhysicalMaterial({ color: '#e8f4ff', metalness: .65, roughness: .13, envMap: environment, emissive: '#e7c89a', emissiveIntensity: .32 })
  const particles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), material, maxParticles)
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage); particles.frustumCulled = false; group.add(particles)
  for (let lane = 0; lane < 4; lane++) {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < 48; i++) {
      const a = i / 47 * Math.PI * 1.90 + (lane<2?.18:.28)
      const point=new THREE.Vector3(Math.cos(a) * (2.32 + lane * .09), Math.sin(a) * .40 + (lane<2?-.38:.42), Math.sin(a) * (1.65+lane*.04))
      // Paired coherent paths: lower warm recovery, upper cool purification.
      point.applyEuler(new THREE.Euler(lane<2?.18:.42,0,lane<2?-.12:.12));points.push(point)
    }
    const curve = new THREE.CatmullRomCurve3(points); curves.push(curve)
    // Layered optical rails complement the independently modelled wide ribbons.
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 256, [.006,.004,.006,.004][lane]!, 8, false), new THREE.MeshPhysicalMaterial({ color: lane<2 ? '#e5c28e' : '#b7d5ee', metalness: .65, roughness: .13, transparent: true, opacity: lane%2?.28:.5, depthWrite: false })))
  }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(32,32,0,32,32,30)
  gradient.addColorStop(0,'rgba(255,255,255,1)'); gradient.addColorStop(.12,'rgba(255,243,214,.7)'); gradient.addColorStop(.45,'rgba(255,230,186,.08)'); gradient.addColorStop(1,'rgba(255,230,186,0)')
  ctx.fillStyle = gradient; ctx.fillRect(0,0,64,64)
  const flareMap = new THREE.CanvasTexture(canvas)
  const flashes = Array.from({ length: 3 }, (_,i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareMap, color: i<2?'#fff5dd':'#cceaff', transparent: true, depthTest: true, depthWrite: false, opacity: 0 }))
    group.add(sprite); return sprite
  })
  const trails = flashes.map((_,i) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()])
    const line = new THREE.Line(geometry,new THREE.LineBasicMaterial({ color:i<2?'#e5cda6':'#c1ddec',transparent:true,opacity:0,depthWrite:false }))
    group.add(line);return line
  })
  // Art-directed caustic approximation on a horizontal floor, not traced light.
  const caustic = new THREE.Mesh(new THREE.PlaneGeometry(6,4),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float uTime;
      void main(){vec2 p=(vUv-.5)*2.;p.x*=1.35;float a=atan(p.y,p.x),r=length(p);
      float bend=.06*sin(a*6.+uTime*.12)+.025*sin(a*11.);
      float rings=exp(-pow((r-.44-bend)*75.,2.))+.65*exp(-pow((r-.63+bend)*90.,2.));
      float rays=pow(max(0.,sin(a*17.+r*9.)),18.)*exp(-pow((r-.55)*3.,2.));
      float fade=1.-smoothstep(.68,.95,r);float broken=.18+.82*pow(.5+.5*sin(a*3.+r*7.),3.);
      gl_FragColor=vec4(1.,.79,.48,(rings*.11*broken+rays*.04)*fade);}`,
  }))
  caustic.rotation.x=-Math.PI/2;caustic.position.y=-1.82;group.add(caustic)
  const temp = new THREE.Object3D()
  const recoveryColor=new THREE.Color('#ffe2b4'),purificationColor=new THREE.Color('#c8e9ff')
  function setDensity(value:number) { density=THREE.MathUtils.clamp(Number.isFinite(value)?value:1,0,1.6); particles.count=Math.round(100*density) }
  function setEnabled(value:boolean) { enabled=value;group.visible=value }
  function update(time:number) {
    if(!enabled)return
    for(let i=0;i<particles.count;i++) {
      const seed=((i*73)%163)/163, t=curvePhase(seed*seed,time,i%4<2?.006:-.011)
      temp.position.copy(curves[i%4]!.getPointAt(t));temp.scale.setScalar(.008+(i%13===0?.026:.006)*(.5+seed));temp.updateMatrix();particles.setMatrixAt(i,temp.matrix)
      particles.setColorAt(i,i%4<2?recoveryColor:purificationColor)
    }
    particles.instanceMatrix.needsUpdate=true
    if(particles.instanceColor)particles.instanceColor.needsUpdate=true
    flashes.forEach((flash,i)=>{
      const t=curvePhase(.19+i*.27,time,.009), pulse=Math.pow(Math.max(0,Math.sin(time*1.05+i*2.1)),14)
      flash.position.copy(curves[i]!.getPointAt(t));flash.scale.setScalar(.18+pulse*.13);(flash.material as THREE.SpriteMaterial).opacity=Math.min(1,pulse*.8*density)
      const line=trails[i]!, attr=line.geometry.getAttribute('position') as THREE.BufferAttribute
      const tail=curves[i]!.getPointAt(Math.max(0,t-.018));attr.setXYZ(0,flash.position.x,flash.position.y,flash.position.z);attr.setXYZ(1,tail.x,tail.y,tail.z);attr.needsUpdate=true;line.geometry.computeBoundingSphere();(line.material as THREE.LineBasicMaterial).opacity=pulse*.35*density
    })
    ;(caustic.material as THREE.ShaderMaterial).uniforms.uTime!.value=time
  }
  setDensity(density);update(1.2)
  return {group,update,setEnabled,setDensity,get density(){return density},dispose(){flareMap.dispose()} }
}

/** Local breakup / airborne clearing. Independent of decorative outer orbits. */
export function createCoreDissipation(environment:THREE.Texture) {
  const group=new THREE.Group();group.name='CoreDissipation'
  const path=new THREE.CatmullRomCurve3([new THREE.Vector3(.36,.29,.04),new THREE.Vector3(.51,.54,.12),new THREE.Vector3(.78,.86,.24),new THREE.Vector3(.78,1.10,.32)])
  const fragments=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:'#17191b',roughness:.68,metalness:.1}),64)
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fragments.frustumCulled=false;group.add(fragments)
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64
  const ctx=canvas.getContext('2d')!,fill=ctx.createRadialGradient(32,32,0,32,32,32)
  fill.addColorStop(0,'#fffef2');fill.addColorStop(.14,'#ffe0a8b0');fill.addColorStop(.45,'#edb16d25');fill.addColorStop(1,'#edb16d00');ctx.fillStyle=fill;ctx.fillRect(0,0,64,64)
  const texture=new THREE.CanvasTexture(canvas),warm=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,opacity:.48,color:'#fff2da'}))
  warm.position.copy(path.getPoint(0));warm.scale.setScalar(.22);group.add(warm)
  const light=new THREE.PointLight('#ffe2b2',.16,1.0,2);light.position.copy(warm.position);group.add(light)
  for(let lane=0;lane<2;lane++) {
    const points=Array.from({length:32},(_,i)=>{const t=i/31,p=path.getPoint(t);p.x+=Math.sin(t*5+lane)*.09;p.z+=Math.sin(t*7+lane)*.08;return p})
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),72,.009+lane*.002,6,false),new THREE.MeshPhysicalMaterial({color:'#e6f3ff',metalness:.28,roughness:.07,envMap:environment,transparent:true,opacity:.25,depthWrite:false,clearcoat:.7})))
  }
  const temp=new THREE.Object3D()
  function update(time:number){
    for(let i=0;i<64;i++) {
      const seed=((i*37)%67)/67,t=curvePhase(seed,time,.065),p=path.getPoint(t),spread=.018+.045*t
      p.x+=Math.sin(i*7.7+t*8)*spread;p.z+=Math.cos(i*3.3+t*5)*spread
      temp.position.copy(p);temp.rotation.set(i+time*.4,i*.7+time*.3,i*.2)
      temp.scale.setScalar((i<10?.026:.007+.010*seed)*Math.pow(1-t,1.2));temp.updateMatrix();fragments.setMatrixAt(i,temp.matrix)
    }
    fragments.instanceMatrix.needsUpdate=true;(warm.material as THREE.SpriteMaterial).opacity=.40+.06*Math.sin(time*.7)
  }
  update(1.2)
  return {group,update,dispose(){texture.dispose()}}
}
