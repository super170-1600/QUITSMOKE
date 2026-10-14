"""Center and deepen blueprint glyphs in their navigation face's local frame."""
from mathutils import Vector

def centered_glyph_parts(module, source_center, target_center, normal):
    rotation = Vector((0, 0, 1)).rotation_difference(normal)
    inverse = rotation.inverted()
    local = [[inverse @ (Vector(p) - source_center) for p in part['points']]
             for part in module['meshes']]
    points = [p for part in local for p in part]
    cx = (min(p.x for p in points) + max(p.x for p in points)) / 2
    cy = (min(p.y for p in points) + max(p.y for p in points)) / 2
    # Larger face-plane footprint; independently deepen the actual metal relief.
    # Preserve a small embedded portion rather than floating the whole symbol.
    return [[list(target_center + rotation @ Vector(((p.x-cx)*1.65,
                 (p.y-cy)*1.65, (p.z+.015)*2.3-.012))) for p in part]
            for part in local]
