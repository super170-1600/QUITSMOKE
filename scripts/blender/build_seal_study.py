"""Blender 4.5 LTS: editable art study, GLB export and a Cycles reference render.
Run from project root: blender -b --python scripts/blender/build_seal_study.py
This is a starting art asset, not a claim of final production art quality.
"""
import bpy, json, math, random, itertools
import sys
from pathlib import Path
from mathutils import Vector, Matrix
sys.path.insert(0, str(Path(__file__).parent))
from glyph_layout import centered_glyph_parts

ROOT = Path.cwd()
OUT = ROOT / 'artifacts/blender-study'
MODELS = ROOT / 'public/models'
NATIVE = ROOT / 'assets/blender'
OUT.mkdir(parents=True, exist_ok=True)
MODELS.mkdir(parents=True, exist_ok=True)
NATIVE.mkdir(parents=True, exist_ok=True)
data = json.loads((OUT / 'blueprint.json').read_text())
# Re-cut the source hull in Blender. Keep the six navigation normals and IDs,
# but make the optical bevels deeper and deliberately unequal.
old_centers={f['moduleId']:Vector(f['center']) for f in data['faces'] if f['moduleId']}
planes=[]
for i,f in enumerate(data['faces']):
    n=Vector(f['normal']); d=n.dot(Vector(f['center']))
    if not f['moduleId']: d-=.12+.12*(.5+.5*math.sin(i*2.37))
    planes.append(dict(f, distance=d))
points=[]
for a,b,c in itertools.combinations(planes,3):
    M=Matrix([a['normal'],b['normal'],c['normal']])
    if abs(M.determinant())<1e-7: continue
    p=M.inverted()@Vector((a['distance'],b['distance'],c['distance']))
    if all(Vector(f['normal']).dot(p)<=f['distance']+1e-6 for f in planes) and not any((q-p).length<1e-5 for q in points): points.append(p)
recut=[]
for f in planes:
    n=Vector(f['normal']); polygon=[p for p in points if abs(n.dot(p)-f['distance'])<1e-5]
    if len(polygon)<3: continue
    center=sum(polygon,Vector())/len(polygon)
    u=n.cross(Vector((0,1,0)) if abs(n.y)<.9 else Vector((1,0,0))).normalized(); v=n.cross(u)
    polygon.sort(key=lambda p:math.atan2((p-center).dot(v),(p-center).dot(u)))
    area=sum((polygon[j]-center).cross(polygon[(j+1)%len(polygon)]-center).length/2 for j in range(len(polygon)))
    if f['moduleId'] and area<1.5: raise RuntimeError('Navigation area too small: '+f['moduleId'])
    recut.append(dict(f,center=list(center),vertices=[list(p) for p in polygon],area=area))
data['faces']=recut
new_centers={f['moduleId']:Vector(f['center']) for f in recut if f['moduleId']}
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(47)

def xyz(p): return Vector((p[0], -p[2], p[1]))
def group(name, parent=None, role=None):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    o.parent = parent
    if role: o['assetRole'] = role
    return o

model = group('QUITSMOKE_SealStudy')
model['assetVersion'] = 'seal-study-02'
nav = group('NavigationShell', model, 'navigation')
core = group('CigaretteCore', model, 'core')
core.scale=(1.17,1.17,1.17)
core.rotation_euler.y=-.16 # Positive Three Z tilt after coordinate conversion
seal = group('OpticalSeal', model, 'seal')
glyphs = group('ModuleGlyphs', model, 'glyphs')
external = group('ExternalOptics', model, 'external')

def material(name, color, metal=0, rough=.2, transmission=0, ior=1.46):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Transmission Weight'].default_value = transmission
    p.inputs['IOR'].default_value = ior
    return m

glass = material('OpticalGlass', (1,1,1), rough=.012, transmission=1)
cutglass = material('CutGlass', (1,1,1), rough=.018, transmission=1, ior=1.50)
ribbonmat = material('SilverGlassRibbon', (.94,.97,1), metal=.22, rough=.028, transmission=.65)
shardmat = material('SealCrystal', (1,1,1), rough=.014, transmission=1)
char = material('DependencyCarbon', (.008,.007,.006), rough=.78)

def mesh(name, vertices, faces, parent, mat, bevel=0, smooth=False):
    g = bpy.data.meshes.new(name); g.from_pydata([xyz(p) for p in vertices], [], faces); g.update()
    o = bpy.data.objects.new(name, g); bpy.context.collection.objects.link(o)
    o.parent = parent; o.data.materials.append(mat)
    for p in g.polygons: p.use_smooth = smooth
    if bevel:
        mod = o.modifiers.new('Precision bevel', 'BEVEL'); mod.width=bevel; mod.segments=3
        mod.affect='EDGES'; mod.harden_normals=True
        mod = o.modifiers.new('Optical weighted normals', 'WEIGHTED_NORMAL'); mod.keep_sharp=True
    return o

def prism(name, polygon, normal, depth, parent, mat, bevel=.004):
    n=len(polygon); normal=Vector(normal)
    vertices=polygon+[list(Vector(p)-normal*depth) for p in polygon]
    faces=[tuple(range(n)), tuple(range(n,2*n))[::-1]]
    faces += [(i, i+n, (i+1)%n+n, (i+1)%n) for i in range(n)]
    return mesh(name, vertices, faces, parent, mat, bevel)

for face in data['faces']:
    main=bool(face['moduleId'])
    o=prism('Face_'+face['moduleId'] if main else 'Cut_'+face['id'], face['vertices'], face['normal'], .025 if main else .032, nav, glass if main else cutglass)
    o['assetRole']='face' if main else 'cut'
    o['faceId']=face['moduleId'] or face['id']
    o['selectable']=main and face['moduleId']!='reserved'
    o['navigationNormal']=face['normal']
    o['navigationArea']=face['area']
    o['opticalOutline']=[list(Vector(p)-Vector(face['center'])) for p in face['vertices']]
    # Local pivots enable later separation without baking all faces together.
    center=xyz(face['center'])
    for v in o.data.vertices: v.co-=center
    o.location=center

cache={}
def source_material(part):
    key=part['color']
    if key not in cache:
        rgb=tuple(int(key[i:i+2],16)/255 for i in (0,2,4))
        # Hex blueprint colors are sRGB; Blender Principled expects linear RGB.
        rgb=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb)
        cache[key]=material('Source_'+key, rgb, part['metalness'], part['roughness'])
    return cache[key]

speckles=[]
for i, part in enumerate(data['core']):
    if i>=6: speckles.append(part); continue
    idx=part['indices']; triangles=[tuple(idx[j:j+3]) for j in range(0,len(idx),3)]
    name=['Filter','Paper','BandWide','BandFine','BrokenEnd','PaperSeam'][i]
    if name=='BrokenEnd': continue # scattered carbon replaces the intact circular cap
    o=mesh('Core_'+name,part['points'],triangles,core,source_material(part), .0015 if i<5 else 0, i<5)
    o['assetRole']='core'

def combine_sources(name, parts, parent):
    points=[]; triangles=[]
    for part in parts:
        start=len(points); points+=part['points']; idx=part['indices']
        triangles += [tuple(start+x for x in idx[j:j+3]) for j in range(0,len(idx),3)]
    return mesh(name,points,triangles,parent,source_material(parts[0]),smooth=True)
combine_sources('Core_FilterPores',speckles,core)

# A baked tangent normal texture travels to glTF; procedural Blender nodes do not.
paper_mat=cache['faf9f4']; nodes=paper_mat.node_tree.nodes
image=bpy.data.images.new('PaperFiberNormal',width=128,height=256,alpha=True)
pixels=[]
for y in range(256):
    for x in range(128):
        fiber=math.sin(y*.7+x*.11)*.045+random.uniform(-.025,.025)
        pixels.extend((.5+fiber,.5+random.uniform(-.02,.02),1,1))
image.pixels=pixels; image.colorspace_settings.name='Non-Color'; image.pack()
tex=nodes.new('ShaderNodeTexImage'); tex.image=image
normal=nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value=.16
paper_mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color'])
paper_mat.node_tree.links.new(normal.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
# Source geometry has cylindrical positions; assign reproducible cylinder UVs.
paper=bpy.data.objects['Core_Paper']
uv=paper.data.uv_layers.new(name='PaperUV')
for loop in paper.data.loops:
    p=paper.data.vertices[loop.vertex_index].co
    uv.data[loop.index].uv=(math.atan2(p.z,p.y)/(2*math.pi)+.5,p.x+.5)

# Closed, tapered ribbon cross sections: actual depth, highlights and silhouette.
for lane in range(3):
    vertices=[]; faces=[]; steps=100; section=12
    def base_center(t):
        a=-1.40+t*4.50+lane*.60; r=.76+lane*.05-.10*t
        return Vector((math.sin(a)*r, -.87+t*1.90+lane*.035, -.10+math.cos(a)*(.47+lane*.025)))
    desired=base_center(1); desired.y=1.5
    candidates=[]
    for f in data['faces']:
        n=Vector(f['normal']); projection=n.dot(desired)
        if projection>0: candidates.append((n.dot(Vector(f['center']))/projection,f))
    factor,anchor_face=min(candidates,key=lambda item:item[0])
    anchor=desired*factor*.98
    delta=anchor-base_center(1)
    def center(t):
        blend=max(0,min(1,(t-.65)/.35)); blend=blend*blend*(3-2*blend)
        return base_center(t)+delta*blend
    for i in range(steps+1):
        t=i/steps; p=center(t)
        tangent=(center(min(1,t+.002))-center(max(0,t-.002))).normalized()
        radial=Vector((p.x,0,p.z+.1)).normalized()
        side=(radial-tangent*radial.dot(tangent)).normalized()
        # Gentle twist gives exposed alternating silver and clear ribbon surfaces.
        side=Matrix.Rotation(.35*math.sin(t*5+lane),3,tangent)@side
        up=tangent.cross(side).normalized()
        width=(.18-lane*.035)*(.04+.96*math.sin(math.pi*t)**.45)
        front=.5+.5*math.tanh((p.z-.12)*8)
        width*=1-.55*front*math.exp(-(p.y/.23)**4) # smooth window, no width discontinuity
        thick=.009+lane*.001
        # Rounded lens cross-section avoids beveling every longitudinal quad joint.
        for j in range(section):
            a=j*2*math.pi/section
            vertices.append(list(p+side*math.cos(a)*width/2+up*math.sin(a)*thick/2))
        if i<steps:
            for j in range(section):
                a=i*section+j; b=i*section+(j+1)%section
                faces.append((a,b,b+section,a+section))
    faces += [tuple(range(section))[::-1],tuple(range(steps*section,(steps+1)*section))]
    o=mesh('Seal_Ribbon_%02d'%(lane+1),vertices,faces,seal,ribbonmat,0,True)
    o['assetRole']='ribbon'; o['closedSection']=True
    o['anchorFaceId']=anchor_face['moduleId'] or anchor_face['id']
    o['anchorPosition']=list(anchor)

for i,(polygon,normal) in enumerate([
    ([[-.88,-.72,-.22],[-1.06,-.08,-.16],[-.57,-.32,-.22]],[0,0,1]),
    ([[.40,.96,-.25],[.99,.58,-.23],[.81,1.16,-.30]],[0,0,1]),
]):
    o=prism('Seal_Shard_%02d'%(i+1),polygon,normal,.028,seal,shardmat,.006)
    o['assetRole']='sealShard'

# Carbon follows the open rising spiral instead of occupying a dust ball.
vertices=[]; faces=[]
for i in range(230):
    coarse=i<20; medium=i<75
    t=random.random()**(2.5 if coarse else 1.05)
    center=Vector((.37+.35*t+math.sin(t*3.8)*.15,.29+.77*t,.04+math.sin(t*4.6)*.30))
    spread=.025+.09*t
    center+=Vector(tuple(random.uniform(-spread,spread) for _ in range(3)))
    size=random.uniform(.018,.035) if coarse else random.uniform(.007,.015) if medium else random.uniform(.0015,.006)
    # An asymmetric octahedron, with an individual orientation and silhouette.
    rot=Matrix.Rotation(random.random()*6,3,Vector((.3,.8,.4)))
    start=len(vertices)
    for p in [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]:
        vertices.append(list(center+rot@Vector(p)*size))
    faces += [tuple(start+j for j in f) for f in [(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)]]
o=mesh('Core_CarbonFlow',vertices,faces,core,char)
o['assetRole']='carbon'; o['particleCount']=230

for module in data['glyphs']:
    g=group('Glyph_'+module['id'],glyphs,'glyph'); g['faceId']=module['id']
    n=Vector(next(f['normal'] for f in data['faces'] if f['moduleId']==module['id']))
    parts=centered_glyph_parts(module,old_centers[module['id']],new_centers[module['id']],n)
    for i,part in enumerate(module['meshes']):
        idx=part['indices']; triangles=[tuple(idx[j:j+3]) for j in range(0,len(idx),3)]
        mat=source_material(part)
        if part['metalness']>.5:
            mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.21
        mesh('Glyph_%s_%02d'%(module['id'],i),parts[i],triangles,g,mat,.002,True)

# External ribbons are separate optical sculpture assets, never part of the seal.
outermat=material('ExteriorSilverOptic',(.94,.97,1),metal=.22,rough=.026,transmission=.7)
outerwarm=material('ExteriorChampagneOptic',(.99,.95,.89),metal=.25,rough=.026,transmission=.7)
for lane in range(3):
    verts=[]; quads=[]; steps=160; section=12
    def center(t):
        a=-.55+t*math.pi*1.76+lane*.17
        return Vector((math.cos(a)*(2.10+lane*.13),-.34+math.sin(a)*(.72+lane*.035),math.sin(a)*(1.42+lane*.10)))
    for i in range(steps+1):
        t=i/steps;p=center(t); tangent=(center(min(1,t+.001))-center(max(0,t-.001))).normalized()
        side=tangent.cross(Vector((0,1,0))).normalized()
        side=Matrix.Rotation(.50+1.45*math.sin(t*5.4+lane),3,tangent)@side
        up=tangent.cross(side).normalized(); width=(.24+lane*.045)*(.02+.98*math.sin(math.pi*t)**.65)
        for j in range(section):
            a=j*math.pi*2/section;verts.append(list(p+side*math.cos(a)*width/2+up*math.sin(a)*.009))
        if i<steps:
            for j in range(section):
                a=i*section+j;b=i*section+(j+1)%section;quads.append((a,b,b+section,a+section))
    quads += [tuple(range(section))[::-1],tuple(range(steps*section,(steps+1)*section))]
    o=mesh('External_Ribbon_%02d'%(lane+1),verts,quads,external,outermat if lane==0 else outerwarm,smooth=True)
    o['assetRole']='externalRibbon';o['closedSection']=True
    uv=o.data.uv_layers.new(name='RibbonFade')
    for loop in o.data.loops:
        idx=loop.vertex_index;uv.data[loop.index].uv=(idx//section/steps,idx%section/section)

# Export unposed, editable hierarchy. Browser applies the review pose.
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(MODELS/'quitsmoke-seal-study.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_normals=True,export_texcoords=True)

# Separate Cycles art reference: it is not a screenshot of the browser.
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=True
scene.cycles.max_bounces=12; scene.cycles.transmission_bounces=12
scene.render.resolution_x=1440; scene.render.resolution_y=900; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('Studio HDR'); scene.world=world; world.use_nodes=True
nodes=world.node_tree.nodes; nodes.clear()
env=nodes.new('ShaderNodeTexEnvironment'); env.image=bpy.data.images.load(str(ROOT/'public/environments/studio_small_09_1k.hdr'))
bg=nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value=.65
world.node_tree.links.new(env.outputs['Color'],bg.inputs['Color'])
out=nodes.new('ShaderNodeOutputWorld'); world.node_tree.links.new(bg.outputs['Background'],out.inputs['Surface'])
floor_mat=material('WarmWhiteFloor',(.82,.79,.73),metal=.08,rough=.20)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-1.90))
floor=bpy.context.object; floor.name='StudioFloor'; floor.data.materials.append(floor_mat)
for name,location,power,color,size in [('WarmKey',(-3,-4,5),650,(1,.83,.64),4),('SilverFill',(4,-1,3),400,(.78,.88,1),3)]:
    light=bpy.data.lights.new(name,'AREA'); light.energy=power; light.color=color; light.shape='DISK'; light.size=size
    o=bpy.data.objects.new(name,light); bpy.context.collection.objects.link(o); o.location=location
    o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
T=Matrix(((1,0,0),(0,0,-1),(0,1,0)))
R=Matrix.Rotation(.47,3,'X')@Matrix.Rotation(-.66,3,'Y')@Matrix.Rotation(-.08,3,'Z')
model.matrix_world=(T@R@T.inverted()).to_4x4()
# Review-only photon orbits: deliberately outside the exportable model tree.
ref_photons=group('StudioPhotons')
photonmat=material('StudioPhoton',(.85,.92,1),metal=.6,rough=.12)
p=photonmat.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.82,.55,1);p.inputs['Emission Strength'].default_value=.32
curves=[]
for lane in range(4):
    points=[]
    rot=Matrix.Rotation(.18 if lane<2 else .42,3,'X')@Matrix.Rotation(-.12 if lane<2 else .12,3,'Z')
    for i in range(48):
        a=i/47*math.pi*1.90+(.18 if lane<2 else .28)
        points.append(rot@Vector((math.cos(a)*(2.32+lane*.09),math.sin(a)*.40+(-.38 if lane<2 else .42),math.sin(a)*(1.65+lane*.04))))
    curves.append(points)
    if lane<4:
        c=bpy.data.curves.new('StudioOrbit','CURVE');c.dimensions='3D';c.bevel_depth=[.006,.004,.006,.004][lane];c.bevel_resolution=2
        spline=c.splines.new('POLY');spline.points.add(len(points)-1)
        for item,point in zip(spline.points,points):item.co=(*xyz(point),1)
        o=bpy.data.objects.new('StudioOrbit_%d'%lane,c);bpy.context.collection.objects.link(o);o.parent=ref_photons;c.materials.append(photonmat)
for i in range(120):
    seed=((i*73)%163)/163;lane=i%4;t=(seed*seed+1.2*(.006 if lane<2 else -.011)+10)%1
    sample=t*47;lo=int(sample);p=curves[i%4][lo].lerp(curves[i%4][min(47,lo+1)],sample-lo)
    size=.008+(.026 if i%13==0 else .006)*(.5+seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=size,location=xyz(p));o=bpy.context.object;o.name='StudioPhoton_%03d'%i;o.parent=ref_photons;o.data.materials.append(photonmat)
camera=bpy.data.cameras.new('ReviewCamera'); camera.lens=50; camera.sensor_fit='VERTICAL'; camera.sensor_height=2*50*math.tan(math.radians(16))
o=bpy.data.objects.new('ReviewCamera',camera); bpy.context.collection.objects.link(o); o.location=xyz((0,.9,8.7))
o.rotation_euler=(xyz((0,-.05,0))-o.location).to_track_quat('-Z','Y').to_euler(); scene.camera=o
scene.render.filepath=str(OUT/'cycles-reference.png')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE/'quitsmoke-seal-study.blend'))
manifest={'asset':'quitsmoke-seal-study.glb','source':'quitsmoke-seal-study.blend','blender':bpy.app.version_string,'navigationFaces':[f['moduleId'] for f in data['faces'] if f['moduleId']], 'ribbons':3,'carbonParticles':230,'purpose':'editable Blender art study; not approved production art'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
bpy.ops.render.render(write_still=True)
print('QUITSMOKE Blender study exported and rendered')
