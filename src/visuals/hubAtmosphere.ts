import * as THREE from 'three'

/** Geometry-only optical ribbons. Kept behind the crystal, never used as UI. */
export function opticalRibbon(points: THREE.Vector3[], width: number, opacity: number) {
  const curve = new THREE.CatmullRomCurve3(points)
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  const steps = 100
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = curve.getPoint(t), tangent = curve.getTangent(t)
    const twist = t * Math.PI * 2.2
    const side = new THREE.Vector3(0, Math.cos(twist), Math.sin(twist))
    side.addScaledVector(tangent, -side.dot(tangent)).normalize()
    const taper = Math.sin(Math.PI * t) ** .6
    for (const sign of [-1, 1]) {
      positions.push(...p.clone().addScaledVector(side, sign * width * taper / 2).toArray())
      uvs.push(t, (sign + 1) / 2)
    }
    if (i < steps) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2) }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: opacity } },
    vertexShader: `varying vec2 vUv;varying vec3 vNormal;varying vec3 vEye;
      void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vEye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec2 vUv;varying vec3 vNormal;varying vec3 vEye;uniform float uOpacity;
      void main(){float edge=pow(abs(vUv.y-.5)*2.,10.);float fresnel=pow(1.-abs(dot(normalize(vNormal),normalize(vEye))),3.);
      float strand=pow(.5+.5*cos(vUv.y*36.+sin(vUv.x*9.)*2.),18.);
      float fade=smoothstep(0.,.12,vUv.x)*smoothstep(1.,.86,vUv.x);
      vec3 silver=mix(vec3(.68,.79,.87),vec3(1.,.96,.86),edge);
      gl_FragColor=vec4(silver,uOpacity*fade*(.10+edge*.9+fresnel*.65+strand*.20));
      #include <colorspace_fragment>
    }`,
  }))
}

export function createSealedVapor() {
  const group = new THREE.Group()
  for (let lane = 0; lane < 3; lane++) {
    const points = Array.from({ length: 36 }, (_, i) => {
      const t = i / 35, angle = t * 5.0 + lane * .6
      return new THREE.Vector3(.38 + Math.sin(angle) * (.30 + lane * .025), .20 + t * .80, .02 + Math.cos(angle) * .32)
    })
    group.add(opticalRibbon(points, .14 + lane * .03, .32))
    const fiber = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, .0018, 4, false), new THREE.MeshBasicMaterial({ color: '#e9f2f6', transparent: true, opacity: .38, depthWrite: false }))
    group.add(fiber)
  }
  const count = 24, positions = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particles = new THREE.Points(geometry, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(16./-p.z,1.5,4.);}`,
    fragmentShader: `void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(.86,.93,1.,pow(1.-r,2.)*.45);}`,
  }))
  group.add(particles)
  function update(time: number) {
    group.rotation.y = Math.sin(time * .18) * .035
    for (let i = 0; i < count; i++) {
      const t = (i / count + time * .012) % 1, angle = i * 2.399 + time * .10
      positions.set([.38 + Math.sin(angle) * .33, .23 + t * .73, Math.cos(angle) * .30], i * 3)
    }
    geometry.getAttribute('position').needsUpdate = true
  }
  update(0)
  return { group, update }
}

export function createHubAtmosphere() {
  const group = new THREE.Group()
  for (let lane = 0; lane < 3; lane++) {
    const y = lane * .17
    group.add(opticalRibbon([
      new THREE.Vector3(-5, 1.1 + y, -2), new THREE.Vector3(-2.9, -.55 + y, -1.7),
      new THREE.Vector3(-.5, -1.6 + y, -1.8), new THREE.Vector3(2.8, -.6 + y, -2),
      new THREE.Vector3(5, .9 + y, -3),
    ], .35 + lane * .16, .13 + lane * .035))
  }
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.4), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv;void main(){
      vec2 p=(vUv-.5)*2.;float r=length(p);
      float rings=exp(-pow((r-.48)/.018,2.))+exp(-pow((r-.68)/.009,2.))*.5+exp(-pow((r-.83)/.012,2.))*.25;
      float glow=exp(-r*r*6.)*.28;
      float rays=pow(.5+.5*sin(atan(p.y,p.x)*32.+r*11.),14.)*exp(-r*3.)*.15;
      gl_FragColor=vec4(1.,.83,.58,(rings*.35+glow+rays)*smoothstep(1.,.85,r));
      #include <colorspace_fragment>
    }`,
  }))
  halo.position.set(0, -1.83, -.35); halo.scale.y = .30; group.add(halo)
  return group
}
