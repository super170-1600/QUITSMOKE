"""Editable S1 optical sculpture; no people, cigarette or business records baked in.
Run with the existing Blender runtime from project root.
"""
import bpy, math
from pathlib import Path

ROOT=Path.cwd()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name,color,metal=0,rough=.09,transmission=0):
    result=bpy.data.materials.new(name);result.use_nodes=True
    node=result.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value=(*color,1)
    node.inputs['Metallic'].default_value=metal
    node.inputs['Roughness'].default_value=rough
    node.inputs['Transmission Weight'].default_value=transmission
    node.inputs['IOR'].default_value=1.46
    return result

glass=material('Optical Glass',(0.94,.97,.98),0,.055,1)
silver=material('Breathing Silver',(.68,.77,.80),.72,.2)
gold=material('Champagne',(.76,.61,.38),.7,.23)

def mesh(name,vertices,faces,mat,parent=None):
    data=bpy.data.meshes.new(name)
    # Input uses Three.js Y-up. glTF exporter performs the inverse conversion.
    data.from_pydata([(x,-z,y) for x,y,z in vertices],[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for polygon in data.polygons:polygon.use_smooth=True
    if parent:obj.parent=parent
    return obj

def group(name):
    obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);return obj

def ribbon(name,curve,width,mat,parent,segments=180):
    vertices=[];faces=[]
    for i in range(segments+1):
        t=i/segments;p=curve(t)
        w=width*(.25+.75*math.sin(math.pi*t)**.6)
        twist=t*math.pi*2.4
        for thickness in [-.009,.009]:
            for side in [-1,1]:vertices.append((p[0]+side*w*math.cos(twist),p[1]+side*w*math.sin(twist),p[2]+thickness))
        if i<segments:
            n=i*4
            faces.extend([(n,n+4,n+5,n+1),(n+2,n+3,n+7,n+6),(n,n+2,n+6,n+4),(n+1,n+5,n+7,n+3)])
    faces.extend([(0,1,3,2),(segments*4,segments*4+2,segments*4+3,segments*4+1)])
    return mesh(name,vertices,faces,mat,parent)

core=group('LifeCore')
core['assetRole']='core'
for petal in range(8):
    vertices=[];faces=[];rows=40;cols=16
    for thickness in [0,.028]:
        for i in range(rows+1):
            polar=.08+(math.pi-.16)*i/rows
            for j in range(cols+1):
                azimuth=petal*math.pi/4+.04+(math.pi/4-.08)*j/cols+.075*math.sin(polar*2)
                radius=1.04+thickness+.035*math.sin(polar*3+petal*.45)
                vertices.append((radius*math.sin(polar)*math.cos(azimuth),1.30+radius*math.cos(polar),radius*math.sin(polar)*math.sin(azimuth)))
    count=(rows+1)*(cols+1)
    for offset in [0,count]:
        for i in range(rows):
            for j in range(cols):
                n=offset+i*(cols+1)+j;quad=(n,n+1,n+cols+2,n+cols+1)
                faces.append(quad if offset else tuple(reversed(quad)))
    for i in range(rows):
        for j in [0,cols]:
            n=i*(cols+1)+j;faces.append((n,n+cols+1,n+cols+1+count,n+count))
    for j in range(cols):
        for i in [0,rows]:
            n=i*(cols+1)+j;faces.append((n,n+count,n+count+1,n+1))
    mesh('CorePetal_%02d'%petal,vertices,faces,glass,core)

for index in range(3):
    def inner(t,index=index):
        angle=-.8+t*math.pi*2.0+index*2.09
        radius=.55+.12*math.sin(t*math.pi)
        return (radius*math.cos(angle),.58+t*1.45,radius*math.sin(angle))
    ribbon('BreathingRibbon_%d'%index,inner,.058,silver if index!=1 else gold,core,120)

for name,tilt,phase,depth in [('OrbitA',.44,-.5,.25),('OrbitB',-.70,.65,-.4)]:
    orbit=group(name);orbit['assetRole']='orbit'
    def curve(t,tilt=tilt,phase=phase,depth=depth):
        a=phase+t*math.pi*1.73;x=3.05*math.cos(a);y=.12*math.sin(a*2);z=1.9*math.sin(a)
        roll=.62 if tilt>0 else -.50
        raised=x*math.sin(tilt)+y*math.cos(tilt)
        return (x*math.cos(tilt)-y*math.sin(tilt),1.3+raised*math.cos(roll)-z*math.sin(roll),raised*math.sin(roll)+z*math.cos(roll)+depth)
    ribbon(name+'_Optic',curve,.13,glass,orbit)
    ribbon(name+'_Silver',curve,.009,silver,orbit)

native=ROOT/'assets/blender/nico-constellation.blend';native.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(native))
out=ROOT/'public/models/nico-constellation.glb';out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_extras=True,export_yup=True)
print('CONSTELLATION_ASSET',out.stat().st_size,'bytes')
