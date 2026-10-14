"""Export an artist-edited native asset without exporting the review studio.
blender -b assets/blender/quitsmoke-seal-study.blend --python scripts/blender/export_seal_asset.py
"""
import bpy
from pathlib import Path
from mathutils import Matrix
model=bpy.data.objects.get('QUITSMOKE_SealStudy')
if not model: raise RuntimeError('Missing QUITSMOKE_SealStudy root')
children=list(model.children_recursive)
faces=[o for o in children if o.get('assetRole')=='face']
ids=sorted(o.get('faceId') for o in faces)
if ids!=['achievements','checkin','profile','progress','reserved','support']:
    raise RuntimeError('Six independent navigation face IDs must be preserved')
if any(o.type!='MESH' for o in faces): raise RuntimeError('Navigation faces must be independent meshes')
pose=model.matrix_world.copy()
try:
    model.matrix_world=Matrix.Identity(4)
    bpy.ops.object.select_all(action='DESELECT')
    for o in [model]+children: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(Path.cwd()/'public/models/quitsmoke-seal-study.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_normals=True,export_texcoords=True)
finally: model.matrix_world=pose
print('Exported six independent faces and the seal; studio excluded')
