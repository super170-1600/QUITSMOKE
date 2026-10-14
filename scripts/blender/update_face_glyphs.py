"""Update only native glyph meshes, then export using the existing asset pipeline.
Run: blender -b assets/blender/quitsmoke-seal-study.blend --python scripts/blender/update_face_glyphs.py
Reproducible from blueprint: repeated runs do not compound scaling.
"""
import bpy, json, sys, runpy
from pathlib import Path
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).parent))
from glyph_layout import centered_glyph_parts

root=Path.cwd()
data=json.loads((root/'artifacts/blender-study/blueprint.json').read_text())
for module in data['glyphs']:
    face=bpy.data.objects['Face_'+module['id']]
    source=next(f for f in data['faces'] if f['moduleId']==module['id'])
    # Blender Z-up position -> Three Y-up asset coordinates.
    center=Vector((face.location.x,face.location.z,-face.location.y))
    parts=centered_glyph_parts(module,Vector(source['center']),center,Vector(face['navigationNormal']))
    for i,points in enumerate(parts):
        obj=bpy.data.objects['Glyph_%s_%02d'%(module['id'],i)]
        assert len(obj.data.vertices)==len(points), 'Source topology mismatch'
        for vertex,p in zip(obj.data.vertices,points):
            vertex.co=Vector((p[0],-p[2],p[1]))
        obj.data.update()
        for modifier in obj.modifiers:
            if modifier.type=='BEVEL': modifier.width=.002
        for mat in obj.data.materials:
            shader=mat.node_tree.nodes.get('Principled BSDF')
            if shader and shader.inputs['Metallic'].default_value>.5:
                shader.inputs['Roughness'].default_value=.21
    print('Centered glyph:',module['id'])

assert not bpy.data.objects.get('Glyph_reserved')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/blender/quitsmoke-seal-study.blend'))
runpy.run_path(str(root/'scripts/blender/export_seal_asset.py'),run_name='__main__')
