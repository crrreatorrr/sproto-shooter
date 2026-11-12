# Cartoon kit: campaign props, projectiles, pickups and effect animations.
#
# Run from the repo root:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python art/blender/scripts/build_cartoon_kit.py
#
# Writes GLBs under public/assets/models/{props,projectiles,pickups,fx}/, the
# source scene art/blender/cartoon_kit.blend, and preview sheets in
# art/blender/previews/. Models carry vertex colours only (no textures), one
# mesh each, with an inverted-hull outline baked in. Effects are separate
# objects with keyframed transforms in one clip.
#
# Axes: X is the route direction in game, Z is up, and Blender -Y becomes game +Z.
import gzip
import math
import os
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'models')
PREVIEWS = os.path.join(ROOT, 'art', 'blender', 'previews')

INK = (0.035, 0.03, 0.05)


def srgb(hexv):
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin((hexv >> 16) & 255), lin((hexv >> 8) & 255), lin(hexv & 255))


class Model:
    """Accumulates parts into one vertex-coloured mesh."""

    def __init__(self, name, outline=0.035):
        self.name = name
        self.outline = outline
        self.verts = []
        self.faces = []
        self.colors = []
        self.smooth = []

    def _emit(self, bm, color, smooth, hull=True):
        bm.normal_update()
        base = len(self.verts)
        vs = list(bm.verts)
        index = {v: i for i, v in enumerate(vs)}
        self.verts.extend([tuple(v.co) for v in vs])
        col = srgb(color) if isinstance(color, int) else color
        for f in bm.faces:
            self.faces.append([base + index[v] for v in f.verts])
            self.colors.append(col)
            self.smooth.append(smooth)
        if hull and self.outline > 0:
            base = len(self.verts)
            self.verts.extend([tuple(v.co + v.normal * self.outline) for v in vs])
            for f in bm.faces:
                self.faces.append([base + index[v] for v in reversed(f.verts)])
                self.colors.append(INK)
                self.smooth.append(True)
        bm.free()

    @staticmethod
    def _place(bm, loc, rot, scale=(1, 1, 1)):
        m = Matrix.Translation(Vector(loc)) @ Euler([math.radians(a) for a in rot]).to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1))
        bmesh.ops.transform(bm, matrix=m, verts=bm.verts)

    def box(self, color, size, loc, rot=(0, 0, 0), bevel=0.0, hull=True):
        """Box centred on loc. bevel rounds every edge for the chunky toy look."""
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
        if bevel > 0:
            bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, min(size) * 0.45), segments=1, affect='EDGES')
        self._place(bm, loc, rot)
        self._emit(bm, color, False, hull)
        return self

    def cyl(self, color, r, h, loc, rot=(0, 0, 0), r2=None, seg=10, hull=True, smooth=True):
        """Cylinder or frustum standing on loc (base at loc, +Z up before rot)."""
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
        bmesh.ops.translate(bm, vec=Vector((0, 0, h / 2)), verts=bm.verts)
        self._place(bm, loc, rot)
        self._emit(bm, color, smooth, hull)
        return self

    def ball(self, color, r, loc, scale=(1, 1, 1), seg=10, rings=6, hull=True):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
        self._place(bm, loc, (0, 0, 0), scale)
        self._emit(bm, color, True, hull)
        return self

    def ico(self, color, r, loc, scale=(1, 1, 1), sub=1, hull=True, smooth=False):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
        self._place(bm, loc, (0, 0, 0), scale)
        self._emit(bm, color, smooth, hull)
        return self

    def text(self, color, body, size, depth, loc):
        """Block letters standing upright, reading along +X and facing -Y (game +Z)."""
        curve = bpy.data.curves.new('txt', 'FONT')
        curve.body = body
        curve.size = size
        curve.extrude = depth / 2
        curve.align_x = 'CENTER'
        curve.resolution_u = 1
        obj = bpy.data.objects.new('txt', curve)
        bpy.context.scene.collection.objects.link(obj)
        bpy.context.view_layer.update()
        mesh = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        self._place(bm, loc, (90, 0, 0))
        self._emit(bm, color, False, hull=False)
        bpy.data.objects.remove(obj)
        bpy.data.curves.remove(curve)
        return self

    def wheel(self, loc, r=0.42, w=0.3, axis='y'):
        rot = (90, 0, 0) if axis == 'y' else (0, 90, 0)
        off = Vector((0, w / 2, 0)) if axis == 'y' else Vector((-w / 2, 0, 0))
        self.cyl(0x26262e, r, w, tuple(Vector(loc) + off), rot, seg=10)
        self.cyl(0xd8d8e0, r * 0.45, w + 0.04, tuple(Vector(loc) + off * 1.07), rot, seg=8, hull=False)
        return self

    def build(self):
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata(self.verts, [], self.faces)
        mesh.polygons.foreach_set('use_smooth', self.smooth)
        attr = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
        data = []
        for poly, col in zip(mesh.polygons, self.colors):
            for _ in range(poly.loop_total):
                data.extend((col[0], col[1], col[2], 1.0))
        attr.data.foreach_set('color', data)
        mesh.color_attributes.active_color = attr
        mesh.color_attributes.render_color_index = 0
        mesh.materials.append(kit_material())
        mesh.update()
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        return obj


_MAT = None


def kit_material():
    global _MAT
    if _MAT:
        return _MAT
    mat = bpy.data.materials.new('cartoon_kit')
    mat.use_nodes = True
    mat.use_backface_culling = True
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    attr = nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    mat.node_tree.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.85
    bsdf.inputs['Metallic'].default_value = 0.0
    _MAT = mat
    return mat


# ---------------------------------------------------------------- props (L01)

def food_truck():
    m = Model('food_truck')
    m.box(0xff8a3d, (3.0, 2.2, 1.7), (-0.45, 0, 1.3), bevel=0.14)          # kitchen box
    m.box(0xfff1c9, (3.02, 2.22, 0.3), (-0.45, 0, 0.75), bevel=0.05, hull=False)   # cream band
    m.box(0xffd166, (0.95, 2.1, 1.25), (1.5, 0, 1.05), bevel=0.14)          # cab
    m.box(0x7fd6ff, (0.5, 1.8, 0.5), (1.78, 0, 1.3), bevel=0.05, hull=False)  # windscreen
    m.box(0x3a2a3a, (1.7, 0.08, 0.7), (-0.5, -1.13, 1.45), hull=False)      # serving hatch
    m.box(0xff4d6d, (1.9, 0.7, 0.1), (-0.5, -1.45, 1.95), rot=(18, 0, 0), bevel=0.03)  # awning
    m.box(0xfff1c9, (1.8, 0.35, 0.08), (-0.5, -1.25, 1.05), bevel=0.02)     # counter
    # taco sign on the roof
    m.cyl(0xffc23a, 0.55, 0.22, (-0.5, 0.11, 2.2), rot=(90, 0, 0), seg=10)
    m.box(0x6fcf4a, (0.9, 0.26, 0.14), (-0.5, 0, 2.62), bevel=0.04, hull=False)
    m.box(0xff4d6d, (0.6, 0.27, 0.1), (-0.5, 0, 2.72), bevel=0.03, hull=False)
    m.box(0x55505a, (4.0, 2.0, 0.22), (0, 0, 0.42), bevel=0.05)             # chassis
    for x in (-1.3, 1.35):
        m.wheel((x, -1.2, 0.42)).wheel((x, 0.9, 0.42))
    return m


def car():
    m = Model('car')
    m.box(0x4fa8ff, (3.0, 1.5, 0.62), (0, 0, 0.56), bevel=0.2)
    m.box(0x4fa8ff, (1.5, 1.36, 0.58), (-0.15, 0, 1.08), bevel=0.2)
    m.box(0xcdf1ff, (1.52, 1.2, 0.34), (-0.15, 0, 1.1), bevel=0.06, hull=False)
    m.box(0xcdf1ff, (1.2, 1.38, 0.34), (-0.15, 0, 1.1), bevel=0.06, hull=False)
    m.box(0xfff6c2, (0.08, 0.34, 0.2), (1.5, -0.45, 0.62), bevel=0.03, hull=False)
    m.box(0xfff6c2, (0.08, 0.34, 0.2), (1.5, 0.45, 0.62), bevel=0.03, hull=False)
    m.box(0xff4d6d, (0.08, 0.3, 0.16), (-1.5, -0.45, 0.66), bevel=0.03, hull=False)
    m.box(0xff4d6d, (0.08, 0.3, 0.16), (-1.5, 0.45, 0.66), bevel=0.03, hull=False)
    m.box(0xd8d8e0, (0.14, 1.56, 0.16), (1.48, 0, 0.36), bevel=0.04)
    m.box(0xd8d8e0, (0.14, 1.56, 0.16), (-1.48, 0, 0.36), bevel=0.04)
    for x in (-0.95, 0.95):
        m.wheel((x, -0.8, 0.34), r=0.34, w=0.24).wheel((x, 0.56, 0.34), r=0.34, w=0.24)
    return m


def slide_truck():
    """Trailer on a raised bed. Fits x 4.2, depth 8.4, height 3.35; clear below 1.15 except the +Y bogie."""
    m = Model('slide_truck')
    m.box(0xe9e4f0, (4.1, 8.3, 2.05), (0, 0, 2.28), bevel=0.2)               # trailer body
    m.box(0xff5ec4, (4.14, 8.34, 0.35), (0, 0, 1.75), bevel=0.05, hull=False)   # pink stripe
    m.box(0x39ffb0, (4.14, 2.4, 0.9), (0, -1.5, 2.55), bevel=0.05, hull=False)  # logo panel
    m.box(0x55505a, (3.6, 8.2, 0.14), (0, 0, 1.2), bevel=0.03)               # bed
    m.box(0x55505a, (4.0, 1.5, 1.0), (0, 3.4, 0.55), bevel=0.12)             # bogie block (the cab primitive)
    for x in (-2.0, 1.7):
        m.wheel((x, 3.05, 0.5), r=0.5, w=0.3, axis='x')
        m.wheel((x, 3.95, 0.5), r=0.5, w=0.3, axis='x')
    for x in (-1.7, 1.7):                                                    # landing legs, behind the slide lane
        m.cyl(0x8a8590, 0.09, 1.15, (x, 0.9, 0), seg=6)
        m.box(0x8a8590, (0.34, 0.34, 0.06), (x, 0.9, 0.03), hull=False)
    return m


def dumpster():
    m = Model('dumpster')
    m.box(0x3f9a56, (2.3, 1.3, 1.0), (0, 0, 0.62), bevel=0.1)
    m.box(0x2f7a43, (2.4, 1.4, 0.16), (0, 0, 1.18), bevel=0.05)
    m.box(0x2a2a33, (2.36, 0.7, 0.1), (0, -0.2, 1.3), rot=(-12, 0, 0), bevel=0.03)
    m.box(0xfff1c9, (0.7, 0.04, 0.34), (0, -0.67, 0.7), hull=False)
    for x in (-0.9, 0.9):
        m.box(0x2f7a43, (0.16, 1.36, 0.6), (x, 0, 0.62), bevel=0.03, hull=False)
        m.cyl(0x26262e, 0.12, 0.12, (x, -0.5, 0.0), seg=6)
        m.cyl(0x26262e, 0.12, 0.12, (x, 0.5, 0.0), seg=6)
    return m


def barricade():
    """Jersey barrier, long along Y. Fits 1.2 x 4 x 2.2."""
    m = Model('barricade')
    m.box(0xb9b3ad, (1.15, 3.9, 0.5), (0, 0, 0.25), bevel=0.08)
    m.box(0xd9d3cd, (0.7, 3.8, 1.2), (0, 0, 1.0), bevel=0.12)
    for i, y in enumerate((-1.45, -0.5, 0.5, 1.45)):
        m.box(0xffc23a if i % 2 == 0 else 0x26262e, (0.74, 0.7, 0.42), (0, y, 1.1), rot=(0, 0, 0), bevel=0.02, hull=False)
    for y in (-1.5, 1.5):
        m.cyl(0x55505a, 0.06, 0.55, (0, y, 1.6), seg=6)
        m.ball(0xff5a3d, 0.17, (0, y, 2.05), seg=8, rings=5)
    return m


def toll_booth():
    """Fits 1 x 4 x 2.4."""
    m = Model('toll_booth')
    m.box(0xf2d24a, (0.95, 1.5, 1.9), (0, 0, 0.95), bevel=0.1)
    m.box(0x7fd6ff, (0.97, 1.1, 0.6), (0, 0, 1.3), bevel=0.04, hull=False)
    m.box(0xff4d6d, (1.0, 1.9, 0.2), (0, 0, 2.05), bevel=0.06)
    m.box(0x39ffb0, (0.3, 0.8, 0.3), (0, 0, 2.25), bevel=0.05, hull=False)
    for y in (-1.6, 1.6):
        m.box(0xd9d3cd, (0.9, 0.7, 0.8), (0, y, 0.4), bevel=0.1)
        for i in range(2):
            m.box(0xff4d6d if i == 0 else 0xfff1c9, (0.92, 0.72, 0.18), (0, y, 0.3 + i * 0.26), hull=False)
    return m


def kiosk():
    m = Model('kiosk')
    m.box(0xff5ec4, (2.6, 2.6, 0.9), (0, 0, 0.45), bevel=0.14)
    m.box(0xfff1c9, (2.8, 2.8, 0.12), (0, 0, 0.95), bevel=0.04)
    for x, y in ((-1.2, -1.2), (1.2, -1.2), (-1.2, 1.2), (1.2, 1.2)):
        m.cyl(0xd8d8e0, 0.07, 0.8, (x, y, 1.0), seg=6)
    m.cyl(0x39ffb0, 2.0, 0.25, (0, 0, 1.75), r2=0.6, seg=8, smooth=False)
    m.ball(0xffd166, 0.22, (0, 0, 2.02), seg=8, rings=5)
    m.ball(0x4fe3ff, 0.26, (-0.6, -0.5, 1.22), seg=8, rings=5, hull=False)
    m.ball(0xffd166, 0.22, (0.5, 0.3, 1.2), seg=8, rings=5, hull=False)
    return m


def water_tank():
    m = Model('water_tank')
    m.cyl(0x8fb7c9, 1.35, 1.5, (0, 0, 0.7), seg=12)
    m.cyl(0x5f8597, 1.42, 0.14, (0, 0, 1.0), seg=12, hull=False)
    m.cyl(0x5f8597, 1.42, 0.14, (0, 0, 1.75), seg=12, hull=False)
    m.cyl(0x6f6a75, 1.45, 0.3, (0, 0, 2.1), r2=0.3, seg=12)
    for x, y in ((-1.1, -1.1), (1.1, -1.1), (-1.1, 1.1), (1.1, 1.1)):
        m.box(0x6f6a75, (0.2, 0.2, 0.8), (x, y, 0.4), bevel=0.03)
    m.box(0x6f6a75, (2.5, 2.5, 0.12), (0, 0, 0.72), bevel=0.03, hull=False)
    return m


def machine():
    """Generator core. Fits 4 x 4 x 3."""
    m = Model('machine')
    m.box(0x6d6f86, (3.8, 3.8, 2.3), (0, 0, 1.15), bevel=0.25)
    m.box(0x26262e, (3.84, 2.2, 0.9), (0, 0, 1.3), bevel=0.05, hull=False)
    m.box(0x26262e, (2.2, 3.84, 0.9), (0, 0, 1.3), bevel=0.05, hull=False)
    for i in range(3):
        m.box(0x39ffb0, (3.9, 0.3, 0.14), (0, -0.7 + i * 0.7, 1.05 + i * 0.22), hull=False)
        m.box(0x39ffb0, (0.3, 3.9, 0.14), (-0.7 + i * 0.7, 0, 1.05 + i * 0.22), hull=False)
    m.cyl(0x8a8ca6, 0.9, 0.5, (0, 0, 2.3), seg=10)
    m.cyl(0xffd166, 0.5, 0.25, (0, 0, 2.75), seg=10, hull=False)
    return m


def fountain():
    """Fits 4 x 4 x 2."""
    m = Model('fountain')
    m.cyl(0xb9b3ad, 1.95, 0.6, (0, 0, 0), seg=14)
    m.cyl(0x4fc3ff, 1.7, 0.08, (0, 0, 0.56), seg=14, hull=False)
    m.cyl(0xd9d3cd, 0.4, 1.0, (0, 0, 0.5), seg=8)
    m.cyl(0xb9b3ad, 0.95, 0.22, (0, 0, 1.4), r2=1.1, seg=12)
    m.cyl(0x4fc3ff, 0.95, 0.05, (0, 0, 1.6), seg=12, hull=False)
    m.ball(0x9fe3ff, 0.3, (0, 0, 1.78), seg=8, rings=5, hull=False)
    return m


def barrel(name, body, band, icon):
    m = Model(name, outline=0.03)
    m.cyl(body, 0.42, 1.0, (0, 0, 0.05), seg=10)
    m.cyl(band, 0.46, 0.1, (0, 0, 0.22), seg=10, hull=False)
    m.cyl(band, 0.46, 0.1, (0, 0, 0.78), seg=10, hull=False)
    m.cyl(0x55505a, 0.44, 0.06, (0, 0, 1.02), seg=10)
    for a in range(4):                                     # warning plate on four sides
        ang = math.radians(a * 90 + 45)
        x, y = math.cos(ang) * 0.43, math.sin(ang) * 0.43
        m.box(icon, (0.26, 0.05, 0.3), (x, y, 0.5), rot=(0, 0, a * 90 + 135), bevel=0.02, hull=False)
    return m


def chest():
    m = Model('chest', outline=0.03)
    m.box(0x8d5e34, (1.1, 0.75, 0.5), (0, 0, 0.27), bevel=0.06)
    m.cyl(0xa56e3c, 0.38, 1.1, (-0.55, 0, 0.52), rot=(0, 90, 0), seg=10)
    for x in (-0.38, 0.38):
        m.box(0xffd166, (0.12, 0.8, 0.54), (x, 0, 0.28), bevel=0.02, hull=False)
        m.cyl(0xffd166, 0.4, 0.12, (x - 0.06, 0, 0.52), rot=(0, 90, 0), seg=10, hull=False)
    m.box(0xffd166, (0.22, 0.1, 0.26), (0, -0.4, 0.48), bevel=0.03)
    return m


def switch():
    m = Model('switch', outline=0.025)
    m.box(0x55505a, (0.6, 0.6, 0.16), (0, 0, 0.08), bevel=0.04)
    m.box(0xffc23a, (0.42, 0.42, 0.7), (0, 0, 0.5), bevel=0.06)
    m.box(0x26262e, (0.1, 0.44, 0.4), (0, 0, 0.55), hull=False)
    m.cyl(0xd8d8e0, 0.045, 0.55, (0, -0.1, 0.7), rot=(35, 0, 0), seg=6)
    m.ball(0xff4d6d, 0.13, (0, -0.42, 1.15), seg=8, rings=5)
    return m


def shrine():
    m = Model('shrine')
    m.cyl(0x8a8590, 0.9, 0.25, (0, 0, 0), seg=8, smooth=False)
    m.cyl(0xa9a3ad, 0.65, 0.25, (0, 0, 0.25), seg=8, smooth=False)
    m.cyl(0xc9c3cd, 0.28, 1.0, (0, 0, 0.5), r2=0.2, seg=8)
    m.cyl(0xa9a3ad, 0.45, 0.14, (0, 0, 1.5), seg=8, smooth=False)
    m.ico(0x7cff4a, 0.36, (0, 0, 2.05), scale=(1, 1, 1.35))
    return m


def weapon_rack():
    m = Model('weapon_rack', outline=0.03)
    m.box(0x6d4b2c, (1.5, 0.5, 0.14), (0, 0, 0.07), bevel=0.04)
    for x in (-0.65, 0.65):
        m.box(0x8d5e34, (0.14, 0.14, 1.3), (x, 0.1, 0.75), bevel=0.03)
    m.box(0x8d5e34, (1.5, 0.12, 0.14), (0, 0.1, 1.35), bevel=0.03)
    m.box(0x7fd34e, (1.3, 0.06, 0.6), (0, 0.14, 0.85), bevel=0.02, hull=False)
    for x in (-0.3, 0.3):
        m.box(0x26262e, (0.1, 0.2, 0.08), (x, 0.0, 0.75), hull=False)
    return m


def secret():
    """Golden gift box that marks a secret."""
    m = Model('secret', outline=0.025)
    m.box(0xffd166, (0.5, 0.5, 0.42), (0, 0, 0.21), bevel=0.05)
    m.box(0xffe9a8, (0.56, 0.56, 0.12), (0, 0, 0.46), bevel=0.03)
    m.box(0xff4d6d, (0.12, 0.58, 0.54), (0, 0, 0.27), hull=False)
    m.box(0xff4d6d, (0.58, 0.12, 0.54), (0, 0, 0.27), hull=False)
    m.ball(0xff4d6d, 0.11, (-0.1, 0, 0.6), scale=(1.3, 0.7, 1), seg=6, rings=4)
    m.ball(0xff4d6d, 0.11, (0.1, 0, 0.6), scale=(1.3, 0.7, 1), seg=6, rings=4)
    return m


def street_lamp():
    m = Model('street_lamp')
    m.cyl(0x3a3a46, 0.22, 0.4, (0, 0, 0), r2=0.12, seg=8)
    m.cyl(0x3a3a46, 0.09, 5.2, (0, 0, 0.4), seg=6)
    m.box(0x3a3a46, (0.12, 1.4, 0.12), (0, -0.6, 5.6), bevel=0.03)
    m.box(0x3a3a46, (0.36, 0.7, 0.16), (0, -1.2, 5.52), bevel=0.05)
    m.box(0xfff1a8, (0.26, 0.56, 0.1), (0, -1.2, 5.42), bevel=0.03, hull=False)
    return m


def palm_tree():
    m = Model('palm_tree', outline=0.05)
    z, x = 0.0, 0.0
    for i in range(6):                                     # leaning ringed trunk
        r = 0.3 - i * 0.025
        m.cyl(0xa9794a if i % 2 == 0 else 0x8d6238, r, 1.25, (x, 0, z), rot=(0, 4 + i * 1.5, 0), r2=r - 0.02, seg=6)
        x += math.sin(math.radians(4 + i * 1.5)) * 1.2
        z += 1.2
    m.ball(0x6d4b2c, 0.28, (x, 0.2, z - 0.1), seg=6, rings=4)
    m.ball(0x6d4b2c, 0.28, (x - 0.2, -0.15, z - 0.12), seg=6, rings=4)
    for a in range(6):                                     # fronds: no outline hull, there are many palms
        ang = a * 60
        ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        m.box(0x4fbf4a, (1.8, 0.6, 0.1), (x + ca * 0.9, sa * 0.9, z + 0.05), rot=(0, 18, ang), bevel=0.04, hull=False)
        m.box(0x3f9a3f, (1.4, 0.45, 0.1), (x + ca * 2.2, sa * 2.2, z - 0.55), rot=(0, 42, ang), hull=False)
    return m


def traffic_cone():
    m = Model('traffic_cone', outline=0.02)
    m.box(0xff7a1a, (0.5, 0.5, 0.06), (0, 0, 0.03), bevel=0.02)
    m.cyl(0xff7a1a, 0.19, 0.66, (0, 0, 0.06), r2=0.05, seg=8)
    m.cyl(0xffffff, 0.15, 0.14, (0, 0, 0.24), r2=0.12, seg=8, hull=False)
    return m


def bench():
    m = Model('bench', outline=0.025)
    m.box(0xa56e3c, (1.8, 0.5, 0.1), (0, 0, 0.48), bevel=0.03)
    m.box(0xa56e3c, (1.8, 0.1, 0.5), (0, 0.24, 0.85), rot=(-8, 0, 0), bevel=0.03)
    for x in (-0.75, 0.75):
        m.box(0x3a3a46, (0.1, 0.5, 0.46), (x, 0, 0.23), bevel=0.02)
        m.box(0x3a3a46, (0.1, 0.1, 0.6), (x, 0.26, 0.75), bevel=0.02)
    return m


def hydrant():
    m = Model('hydrant', outline=0.02)
    m.cyl(0xff4d4d, 0.2, 0.1, (0, 0, 0), seg=8)
    m.cyl(0xff4d4d, 0.14, 0.55, (0, 0, 0.1), seg=8)
    m.ball(0xff4d4d, 0.16, (0, 0, 0.68), seg=8, rings=5)
    m.cyl(0xffd166, 0.05, 0.1, (0, 0, 0.82), seg=6, hull=False)
    m.cyl(0xffd166, 0.07, 0.42, (0, 0.21, 0.42), rot=(90, 0, 0), seg=6)
    return m


def building(name, w, d, h, wall, trim, glass, neon, roof):
    """Backdrop block. Windows face -Y and +Y so one model serves both sides of the street."""
    m = Model(name, outline=0.08)
    m.box(wall, (w, d, h), (0, 0, h / 2), bevel=0.25)
    m.box(trim, (w + 0.3, d + 0.3, 0.5), (0, 0, h + 0.1), bevel=0.12)
    m.box(trim, (w + 0.2, d + 0.2, 0.4), (0, 0, 3.6), bevel=0.1, hull=False)
    cols = max(2, int(w // 2.6))
    rows = max(2, int((h - 5) // 2.6))
    for sy in (-1, 1):
        y = sy * (d / 2 + 0.02)
        for c in range(cols):
            x = -w / 2 + (c + 0.5) * (w / cols)
            for r in range(rows):
                lit = (c * 7 + r * 3 + int(w)) % 3 == 0
                m.box(0xffe9a8 if lit else glass, (w / cols * 0.55, 0.08, 1.5), (x, y, 5.2 + r * 2.6), hull=False)
        m.box(0x26262e, (w * 0.75, 0.1, 2.6), (0, y, 1.5), hull=False)       # shopfront
        m.box(neon, (w * 0.6, 0.14, 0.5), (0, y * 1.01, 3.1), bevel=0.05, hull=False)  # neon sign
        m.box(roof, (w * 0.8, 1.0, 0.12), (0, sy * (d / 2 + 0.5), 2.85), rot=(sy * -14, 0, 0), bevel=0.03, hull=False)
    m.box(0x6f6a75, (1.6, 1.6, 1.0), (w * 0.2, 0, h + 0.8), bevel=0.1)       # roof unit
    return m


def billboard():
    m = Model('billboard', outline=0.06)
    for x in (-2.4, 2.4):
        m.cyl(0x55505a, 0.18, 6.0, (x, 0, 0), seg=6)
    m.box(0x2a2a33, (7.6, 0.4, 3.4), (0, 0, 7.4), bevel=0.1)
    m.box(0xff5ec4, (7.0, 0.44, 2.8), (0, 0, 7.4), hull=False)
    m.ball(0xffd166, 0.9, (-1.6, -0.2, 7.4), scale=(1, 0.2, 1), seg=10, rings=6, hull=False)
    m.box(0x39ffb0, (2.6, 0.5, 0.5), (1.4, 0, 7.9), bevel=0.05, hull=False)
    m.box(0xffffff, (2.0, 0.5, 0.36), (1.1, 0, 7.0), bevel=0.05, hull=False)
    return m


# ---------------------------------------------------------------- street surface and backdrop
# Flat pieces lie a few centimetres over the collision floor. Far pieces have no outline: nobody gets close.

def sidewalk():
    m = Model('sidewalk', outline=0.0)
    m.box(0xc9c3cd, (12.0, 2.4, 0.05), (0, 0, 0.025))
    m.box(0x8a8590, (12.0, 0.22, 0.07), (0, -1.1, 0.035))                    # kerb
    for x in (-4, 0, 4):
        m.box(0xa9a3ad, (0.06, 2.2, 0.055), (x, 0.1, 0.0275))                # paving joints
    return m


def road_dash():
    m = Model('road_dash', outline=0.0)
    m.box(0xffd166, (2.6, 0.26, 0.03), (0, 0, 0.015))
    return m


def crosswalk():
    m = Model('crosswalk', outline=0.0)
    for i in range(9):
        m.box(0xf2f2f7, (3.0, 1.1, 0.03), (0, -8.8 + i * 2.2, 0.015))
    return m


def guard_rail():
    m = Model('guard_rail', outline=0.03)
    m.box(0xd9d3cd, (6.0, 0.4, 0.5), (0, 0, 0.25), bevel=0.06)
    m.box(0xd8d8e0, (6.0, 0.1, 0.22), (0, 0, 0.95), bevel=0.03)
    for x in (-2.4, 0, 2.4):
        m.box(0x8a8590, (0.14, 0.14, 0.6), (x, 0, 0.75))
    return m


def planter():
    m = Model('planter', outline=0.03)
    m.box(0xd9b0e6, (1.4, 1.4, 0.6), (0, 0, 0.3), bevel=0.08)
    m.ico(0x4fbf4a, 0.7, (0, 0, 1.0), scale=(1, 1, 0.8))
    m.ico(0x3f9a3f, 0.42, (0.3, -0.25, 1.45))
    return m


def skyline(name, w, d, h, wall, lit, crown):
    """Far tower. Lit windows on all four sides so it reads from anywhere on the route."""
    m = Model(name, outline=0.0)
    m.box(wall, (w, d, h), (0, 0, h / 2))
    m.box(wall, (w * 0.6, d * 0.6, h * 0.18), (0, 0, h * 1.09))
    m.box(crown, (w * 0.64, d * 0.64, 0.8), (0, 0, h * 1.18))
    m.cyl(crown, 0.3, h * 0.16, (0, 0, h * 1.18), seg=4)
    cols, rows = 3, max(4, int(h // 9))
    for side in range(4):
        for c in range(cols):
            for r in range(rows):
                if (c * 5 + r * 7 + side * 3 + int(h)) % 3 == 0:
                    continue
                u = (c + 0.5) / cols - 0.5
                z = 5 + r * ((h - 8) / rows)
                if side % 2 == 0:
                    m.box(lit, (w / cols * 0.5, 0.2, 3.0), (u * w, (1 if side else -1) * (d / 2 + 0.05), z), hull=False)
                else:
                    m.box(lit, (0.2, d / cols * 0.5, 3.0), ((1 if side == 1 else -1) * (w / 2 + 0.05), u * d, z), hull=False)
    return m


def hill_sign():
    """The SPROTOWOOD hill from the level's vista."""
    m = Model('hill_sign', outline=0.0)
    m.ico(0x5a4a6a, 60, (0, 30, -8), scale=(1.5, 0.7, 0.55), sub=2, smooth=False)
    m.ico(0x4a3d5c, 40, (-70, 36, -8), scale=(1.3, 0.7, 0.5), sub=2, smooth=False)
    m.ico(0x4a3d5c, 44, (78, 38, -10), scale=(1.3, 0.7, 0.5), sub=2, smooth=False)
    m.text(0xfff6e6, 'SPROTOWOOD', 11.0, 1.2, (0, -8.5, 17))
    for i in range(10):
        m.box(0x8a8590, (0.5, 0.5, 5), (-40.5 + i * 9, -8.2, 14.5))
    return m


# ---------------------------------------------------------------- desert bazaar (L02)
SAND, SAND_D, SAND_L = 0xe2b877, 0xc4955a, 0xf3d9a4


def sandstone_house():
    """Flat-roofed block, stretched over the level's stone masses. Doors and awnings on all four sides."""
    m = Model('sandstone_house', outline=0.07)
    m.box(SAND, (10, 10, 6), (0, 0, 3), bevel=0.3)
    m.box(SAND_L, (10.4, 10.4, 0.5), (0, 0, 6.0), bevel=0.12)                 # parapet
    for sx, sy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        m.box(SAND_L, (1.2, 1.2, 0.8), (sx * 4.5, sy * 4.5, 6.5), bevel=0.1)  # corner merlons
    awn = (0xd9483b, 0x2f9e8f, 0xf2b632, 0x7a4fd1)
    for i in range(4):
        ang = i * 90
        c, sn = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        fx, fy = -sn * 5.03, c * 5.03                                         # face centre
        m.box(0x5a3a22, (2.0, 0.12, 3.0), (fx, fy, 1.5), rot=(0, 0, ang), bevel=0.04, hull=False)       # door
        m.box(0x3a2a3a, (1.3, 0.12, 1.3), (fx + c * 3.0, fy + sn * 3.0, 4.0), rot=(0, 0, ang), hull=False)
        m.box(0x3a2a3a, (1.3, 0.12, 1.3), (fx - c * 3.0, fy - sn * 3.0, 4.0), rot=(0, 0, ang), hull=False)
        m.box(awn[i], (3.4, 1.4, 0.14), (-sn * 5.6, c * 5.6, 3.5), rot=(-16, 0, ang), bevel=0.04, hull=False)
    m.cyl(SAND_L, 2.2, 1.2, (2.2, 2.0, 6.0), r2=0.3, seg=8)                   # roof dome
    return m


def bazaar_wall():
    """Souk wall, long along X, with crenellations and a blind arch."""
    m = Model('bazaar_wall', outline=0.06)
    m.box(SAND, (12, 2, 6.2), (0, 0, 3.1), bevel=0.15)
    m.box(SAND_D, (12.1, 2.1, 0.6), (0, 0, 0.3), hull=False)
    for i in range(6):
        m.box(SAND_L, (1.1, 2.1, 0.8), (-5.0 + i * 2.0, 0, 6.6), bevel=0.08)
    for sy in (-1, 1):
        for x in (-3.5, 3.5):
            m.box(SAND_D, (2.2, 0.14, 3.0), (x, sy * 1.02, 2.2), bevel=0.05, hull=False)
            m.cyl(SAND_D, 1.1, 0.14, (x, sy * 1.02 - 0.07 * sy, 3.7), rot=(90, 0, 0), seg=10, hull=False)
        m.box(0xd9483b, (2.0, 0.1, 1.4), (0, sy * 1.03, 4.2), hull=False)     # hanging rug
        m.box(0xf2b632, (1.4, 0.12, 0.8), (0, sy * 1.04, 4.2), hull=False)
    return m


def low_wall():
    m = Model('low_wall', outline=0.04)
    m.box(SAND, (6, 1, 1.0), (0, 0, 0.5), bevel=0.1)
    m.box(SAND_L, (6.2, 1.15, 0.22), (0, 0, 1.1), bevel=0.06)
    return m


def bazaar_tent():
    m = Model('bazaar_tent', outline=0.05)
    for sx, sy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        m.cyl(0x8d5e34, 0.1, 2.0, (sx * 2.3, sy * 2.3, 0), seg=6)
    m.cyl(0xd9483b, 3.5, 1.1, (0, 0, 1.9), rot=(0, 0, 45), r2=0.25, seg=4, smooth=False)
    for i in range(4):                                                         # cream stripes on the roof faces
        ang = i * 90
        c, sn = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        m.box(0xfff1c9, (0.9, 1.9, 0.06), (-sn * 1.25, c * 1.25, 2.5), rot=(-27, 0, ang), hull=False)
    m.box(0xfff1c9, (5.0, 5.0, 0.3), (0, 0, 1.85), bevel=0.05, hull=False)
    m.ball(0xf2b632, 0.22, (0, 0, 3.05), seg=6, rings=4)
    m.box(0x7a4fd1, (3.4, 2.4, 0.08), (0, 0, 0.04), hull=False)                # rug
    m.box(0x8d5e34, (2.2, 0.9, 0.7), (0, 1.2, 0.35), bevel=0.06)               # counter
    return m


def cart():
    m = Model('cart', outline=0.03)
    m.box(0xa56e3c, (2.4, 1.4, 0.5), (-0.2, 0, 0.75), bevel=0.06)
    m.box(0x8d5e34, (2.6, 1.5, 0.12), (-0.2, 0, 0.5), bevel=0.03)
    m.wheel((-0.2, -0.85, 0.42), r=0.42, w=0.14).wheel((-0.2, 0.71, 0.42), r=0.42, w=0.14)
    m.box(0x8d5e34, (0.9, 0.1, 0.1), (1.35, -0.5, 0.55), bevel=0.02)
    m.box(0x8d5e34, (0.9, 0.1, 0.1), (1.35, 0.5, 0.55), bevel=0.02)
    for i, col in enumerate((0xd9483b, 0x2f9e8f, 0xf2b632)):                   # rolled rugs
        m.cyl(col, 0.2, 2.0, (-1.2, -0.4 + i * 0.4, 1.2), rot=(0, 90, 0), seg=7)
    return m


def dye_vat(name, dye):
    m = Model(name, outline=0.05)
    m.cyl(0xc9a27a, 2.0, 1.2, (0, 0, 0), r2=1.9, seg=12)
    m.cyl(0xa9794a, 2.05, 0.2, (0, 0, 1.0), seg=12, hull=False)
    m.cyl(dye, 1.7, 0.06, (0, 0, 1.17), seg=12, hull=False)
    return m


def well():
    m = Model('well', outline=0.04)
    m.cyl(0xb9a48a, 1.5, 1.2, (0, 0, 0), seg=10)
    m.cyl(0x3a7ca5, 1.2, 0.05, (0, 0, 1.18), seg=10, hull=False)
    for sx in (-1, 1):
        m.box(0x8d5e34, (0.2, 0.2, 2.4), (sx * 1.3, 0, 1.2), bevel=0.04)
    m.box(0xd9483b, (3.2, 2.0, 0.14), (0, 0.45, 2.75), rot=(22, 0, 0), bevel=0.04)
    m.box(0xd9483b, (3.2, 2.0, 0.14), (0, -0.45, 2.75), rot=(-22, 0, 0), bevel=0.04)
    m.cyl(0x8d5e34, 0.1, 2.6, (-1.3, 0, 2.0), rot=(0, 90, 0), seg=6)
    return m


def onion_dome():
    m = Model('onion_dome', outline=0.07)
    m.cyl(SAND_L, 3.4, 0.6, (0, 0, 0), seg=10)
    m.ball(0xf2b632, 3.2, (0, 0, 2.3), scale=(1, 1, 0.8), seg=12, rings=8)
    m.cyl(0xf2b632, 1.6, 1.6, (0, 0, 3.8), r2=0.1, seg=10)
    m.cyl(0xfff1c9, 0.08, 0.9, (0, 0, 5.2), seg=5)
    m.ball(0xfff1c9, 0.22, (0, 0, 6.1), seg=6, rings=4)
    return m


def drying_rack():
    m = Model('drying_rack', outline=0.03)
    for x in (-2.8, 2.8):
        m.box(0x8d5e34, (0.16, 0.5, 0.1), (x, 0, 0.05))
        m.box(0x8d5e34, (0.14, 0.14, 2.0), (x, 0, 1.0), bevel=0.03)
    m.box(0x8d5e34, (5.9, 0.1, 0.1), (0, 0, 1.95), bevel=0.02)
    for i, col in enumerate((0xd9483b, 0x2f9e8f, 0xf2b632, 0x7a4fd1, 0xff7aa8)):
        m.box(col, (0.95, 0.08, 1.3), (-2.2 + i * 1.1, 0, 1.25), bevel=0.02)
    return m


def clay_pots():
    m = Model('clay_pots', outline=0.03)
    for x, y, k in ((0, 0, 1.0), (0.75, 0.3, 0.7), (-0.5, 0.6, 0.55)):
        m.ball(0xc9743f, 0.42 * k, (x, y, 0.4 * k), scale=(1, 1, 1.15), seg=8, rings=6)
        m.cyl(0xa85a2c, 0.2 * k, 0.22 * k, (x, y, 0.78 * k), r2=0.27 * k, seg=8)
    return m


def lantern_post():
    m = Model('lantern_post', outline=0.03)
    m.cyl(0x5a3a22, 0.12, 3.4, (0, 0, 0), seg=6)
    m.box(0x5a3a22, (0.9, 0.1, 0.1), (0.4, 0, 3.3), bevel=0.02)
    m.box(0xf2b632, (0.34, 0.34, 0.5), (0.8, 0, 2.85), bevel=0.06)
    m.box(0xfff6c2, (0.36, 0.2, 0.3), (0.8, 0, 2.85), hull=False)
    m.box(0xfff6c2, (0.2, 0.36, 0.3), (0.8, 0, 2.85), hull=False)
    return m


def mesa(name, w, h, top):
    """Far red rock table. No outline."""
    m = Model(name, outline=0.0)
    m.cyl(0xb5563a, w, h * 0.45, (0, 0, 0), r2=w * 0.8, seg=9, smooth=False)
    m.cyl(0xc96a45, w * 0.78, h * 0.4, (0, 0, h * 0.45), r2=w * 0.66, seg=9, smooth=False)
    m.cyl(top, w * 0.64, h * 0.15, (0, 0, h * 0.85), r2=w * 0.6, seg=9, smooth=False)
    m.cyl(0xb5563a, w * 0.25, h * 0.7, (w * 0.95, w * 0.2, 0), r2=w * 0.14, seg=6, smooth=False)   # split-off spire
    return m


def dune():
    m = Model('dune', outline=0.0)
    m.ico(0xe9c98a, 30, (0, 0, -4), scale=(1.6, 0.9, 0.34), sub=2, smooth=True)
    m.ico(0xdcb673, 20, (24, 10, -4), scale=(1.4, 0.9, 0.3), sub=2, smooth=True)
    return m


def far_bazaar():
    """Skyline of the old city: flat roofs, domes and minarets. Seen only from a distance."""
    m = Model('far_bazaar', outline=0.0)
    cols = (0xd9a86a, 0xc9955a, 0xe6bd80)
    for i in range(9):
        w = 7 + (i * 5) % 6
        h = 8 + (i * 7) % 12
        x = -40 + i * 10
        m.box(cols[i % 3], (w, 9, h), (x, (i % 3) * 2 - 2, h / 2))
        for r in range(int(h // 4)):
            m.box(0x4a3320, (1.2, 9.1, 1.4), (x - 1.5 + (r % 2) * 3, (i % 3) * 2 - 2, 3 + r * 3.6), hull=False)
        if i % 3 == 0:
            m.ball(0xf2b632, w * 0.4, (x, (i % 3) * 2 - 2, h), scale=(1, 1, 0.8), seg=8, rings=5)
    for x, h in ((-22, 34), (18, 42)):
        m.cyl(0xe6bd80, 1.8, h, (x, 3, 0), r2=1.4, seg=7)
        m.cyl(0xc9955a, 2.4, 1.0, (x, 3, h * 0.78), seg=7)
        m.ball(0xf2b632, 2.0, (x, 3, h + 1), scale=(1, 1, 1.3), seg=7, rings=5)
    return m


# ---------------------------------------------------------------- projectiles
# Nose points along -Y in Blender, which is +Z in game.

def bullet():
    """The common round. Up to 600 fly at once, so it stays under 70 triangles."""
    m = Model('bullet', outline=0.0)
    m.cyl(0xe2a93a, 0.5, 1.3, (0, 0.9, 0), rot=(90, 0, 0), seg=6)
    m.cyl(0xb97f24, 0.58, 0.2, (0, 0.95, 0), rot=(90, 0, 0), seg=6)
    m.cyl(0xffd98a, 0.5, 1.0, (0, -0.4, 0), rot=(90, 0, 0), r2=0.1, seg=6)
    return m


def slug():
    """Big Bullets round: fat and stubby."""
    m = Model('slug', outline=0.0)
    m.cyl(0xff9a1f, 0.8, 1.2, (0, 1.0, 0), rot=(90, 0, 0), seg=10)
    m.cyl(0x8a4a10, 0.86, 0.26, (0, 1.05, 0), rot=(90, 0, 0), seg=10)
    m.ball(0xffd27a, 0.8, (0, -0.2, 0), scale=(1, 1.25, 1), seg=10, rings=6)
    m.box(0xffffff, (0.3, 0.3, 0.12), (0.3, -0.6, 0.62), bevel=0.05)
    return m


def rocket():
    m = Model('rocket', outline=0.0)
    m.cyl(0xf2f2f7, 0.45, 1.7, (0, 1.0, 0), rot=(90, 0, 0), seg=8)
    m.cyl(0xff4d4d, 0.45, 0.9, (0, -0.7, 0), rot=(90, 0, 0), r2=0.08, seg=8)
    m.cyl(0xff4d4d, 0.48, 0.2, (0, 0.5, 0), rot=(90, 0, 0), seg=8)
    m.cyl(0x3a3a46, 0.34, 0.3, (0, 1.25, 0), rot=(90, 0, 0), r2=0.44, seg=8)
    for a in range(4):
        ang = math.radians(a * 90)
        m.box(0xff4d4d, (0.08, 0.7, 0.55), (math.sin(ang) * 0.6, 0.8, math.cos(ang) * 0.6), rot=(0, a * 90, 0), bevel=0.02)
    m.ball(0xffc23a, 0.36, (0, 1.5, 0), scale=(1, 1.6, 1), seg=6, rings=4)
    return m


def duck():
    m = Model('duck', outline=0.0)
    m.ball(0xffe14a, 0.6, (0, 0.15, 0), scale=(1, 1.3, 0.9), seg=8, rings=6)
    m.ball(0xffe14a, 0.42, (0, -0.5, 0.55), seg=8, rings=6)
    m.box(0xff8a1a, (0.36, 0.4, 0.14), (0, -0.98, 0.5), bevel=0.05)
    m.box(0xffe14a, (0.2, 0.4, 0.4), (0, 0.9, 0.25), rot=(-30, 0, 0), bevel=0.06)
    for x in (-0.2, 0.2):
        m.ball(0x16161c, 0.08, (x, -0.82, 0.7), seg=6, rings=4)
    return m


def bomb():
    m = Model('bomb', outline=0.05)
    m.ball(0x2a2a36, 1.0, (0, 0, 0), seg=12, rings=8)
    m.ball(0x6a6a80, 0.28, (-0.4, -0.5, 0.5), scale=(1, 0.6, 1), seg=6, rings=4, hull=False)
    m.cyl(0x55505a, 0.3, 0.3, (0, 0, 0.92), seg=8)
    m.cyl(0xd9b48a, 0.07, 0.5, (0, 0, 1.2), rot=(0, 25, 0), seg=5)
    m.ico(0xffc23a, 0.26, (0.24, 0, 1.72), hull=False)
    m.ico(0xff5a1a, 0.16, (0.24, 0, 1.72), scale=(1.6, 1.6, 1.6), hull=False)
    return m


# ---------------------------------------------------------------- pickups
# Light, near-white colours: the renderer tints each instance.

def heart():
    m = Model('heart', outline=0.06)
    for sx in (-1, 1):
        m.ball(0xffffff, 0.5, (sx * 0.4, 0, 0.32), scale=(1, 0.8, 1), seg=8, rings=6)
    m.box(0xffffff, (0.98, 0.72, 0.98), (0, 0, -0.08), rot=(0, 45, 0), bevel=0.12)   # the point
    m.ball(0xffffff, 0.14, (-0.5, -0.4, 0.5), seg=6, rings=4, hull=False)
    return m


def potion():
    m = Model('potion', outline=0.05)
    m.ball(0xffffff, 0.75, (0, 0, -0.2), seg=10, rings=7)
    m.cyl(0xf2f2f7, 0.26, 0.5, (0, 0, 0.4), seg=8)
    m.cyl(0xc9c3cd, 0.34, 0.14, (0, 0, 0.82), seg=8)
    m.cyl(0x8d6238, 0.22, 0.26, (0, 0, 0.94), seg=6)
    m.ball(0xffffff, 0.16, (-0.35, -0.5, 0.05), seg=6, rings=4, hull=False)
    return m


def ammo_box():
    m = Model('ammo_box', outline=0.05)
    m.box(0xf2f2f7, (1.6, 1.0, 0.95), (0, 0, 0), bevel=0.1)
    m.box(0xc9c3cd, (1.68, 1.08, 0.2), (0, 0, 0.45), bevel=0.05)
    m.box(0x55505a, (0.5, 0.16, 0.14), (0, 0, 0.66), bevel=0.04)
    for i in range(3):                                       # bullet icons on the front
        m.cyl(0x55505a, 0.09, 0.4, (-0.4 + i * 0.4, -0.53, -0.3), seg=6, hull=False)
    return m


def gem():
    m = Model('gem', outline=0.05)
    m.cyl(0xffffff, 0.8, 0.45, (0, 0, 0.1), r2=0.5, seg=6, smooth=False)
    m.cyl(0xe6e6f0, 0.8, 0.95, (0, 0, 0.1), rot=(180, 0, 0), r2=0.02, seg=6, smooth=False)
    return m


def ticket():
    m = Model('ticket', outline=0.05)
    m.cyl(0xffffff, 0.9, 0.22, (0, 0.11, 0), rot=(90, 0, 0), seg=14)
    m.cyl(0xd9d3cd, 0.66, 0.26, (0, 0.13, 0), rot=(90, 0, 0), seg=14, hull=False)
    m.box(0xffffff, (0.2, 0.3, 0.8), (0, 0, 0), bevel=0.04, hull=False)
    m.box(0xffffff, (0.6, 0.3, 0.2), (0, 0, 0.2), bevel=0.04, hull=False)
    return m


PROPS = [
    # food_truck, car and dumpster are not built: the game uses Sproto Duel's own models for those.
    slide_truck, barricade, toll_booth, kiosk, water_tank, machine, fountain,
    lambda: barrel('barrel_fire', 0xff4d3d, 0xffc23a, 0xffe14a),
    lambda: barrel('barrel_shock', 0x3d8bff, 0x9fe3ff, 0xfff6c2),
    chest, switch, shrine, weapon_rack, secret,
    street_lamp, palm_tree, traffic_cone, bench, hydrant, billboard,
    sidewalk, road_dash, crosswalk, guard_rail, planter, hill_sign,
    lambda: skyline('skyline_a', 18, 18, 56, 0x3a2f5c, 0xffd98a, 0xff5ec4),
    lambda: skyline('skyline_b', 26, 18, 38, 0x4a3566, 0xffb37a, 0x39ffb0),
    lambda: skyline('skyline_c', 14, 14, 74, 0x2f2a55, 0x9fe3ff, 0xffd166),
    sandstone_house, bazaar_wall, low_wall, bazaar_tent, cart, well, onion_dome, drying_rack, clay_pots, lantern_post,
    lambda: dye_vat('dye_vat_red', 0xd9483b), lambda: dye_vat('dye_vat_teal', 0x2f9e8f), lambda: dye_vat('dye_vat_gold', 0xf2b632),
    lambda: mesa('mesa_a', 26, 44, 0xd98a5a), lambda: mesa('mesa_b', 38, 30, 0xe09a66),
    dune, far_bazaar,
    lambda: building('building_a', 13, 9, 15, 0xe88a5a, 0xfff1c9, 0x3a3f66, 0xff5ec4, 0xff4d6d),
    lambda: building('building_b', 10, 9, 21, 0x6f7fc9, 0xd9e3ff, 0x2a2f55, 0x39ffb0, 0x4fe3ff),
    lambda: building('building_c', 15, 9, 11, 0xd9b0e6, 0xfff1c9, 0x4a3f66, 0xffd166, 0xffa21f),
]
PROJECTILES = [bullet, slug, rocket, duck, bomb]
PICKUPS = [heart, potion, ammo_box, gem, ticket]


# ---------------------------------------------------------------- effects

def fx_part(name, color, kind, r, sub=1):
    m = Model(name, outline=0.0)
    if kind == 'star':
        # spiky burst: a ball with cones on it
        m.ico(color, r * 0.55, (0, 0, 0), sub=1)
        for i in range(10):
            a = i * 2.39996
            zz = 1 - (i + 0.5) * 2 / 10
            rr = math.sqrt(max(0, 1 - zz * zz))
            d = Vector((math.cos(a) * rr, math.sin(a) * rr, zz))
            rot = d.to_track_quat('Z', 'Y').to_euler()
            m.cyl(color, r * 0.3, r * (0.75 + (i % 3) * 0.18), tuple(d * r * 0.3), rot=tuple(math.degrees(v) for v in rot), r2=0.0, seg=4, smooth=False)
    elif kind == 'ring':
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, segments=20, radius=1.0)
        outer = list(bm.verts)
        ret = bmesh.ops.extrude_edge_only(bm, edges=list(bm.edges))
        inner = [v for v in ret['geom'] if isinstance(v, bmesh.types.BMVert)]
        for v in inner:
            v.co *= 0.8
        for v in outer + inner:
            v.co.z = 0
        m._emit(bm, color, False, hull=False)
        # double sided
        n = len(m.faces)
        for i in range(n):
            m.faces.append(list(reversed(m.faces[i])))
            m.colors.append(m.colors[i])
            m.smooth.append(False)
    elif kind == 'shard':
        m.box(color, (r, r * 0.5, r * 0.3), (0, 0, 0), rot=(20, 30, 10))
    else:
        m.ico(color, r, (0, 0, 0), sub=sub, smooth=True)
    return m.build()


def key(obj, frame, loc=None, scale=None, rot=None):
    if loc is not None:
        obj.location = loc
        obj.keyframe_insert('location', frame=frame)
    if scale is not None:
        obj.scale = (scale, scale, scale) if isinstance(scale, (int, float)) else scale
        obj.keyframe_insert('scale', frame=frame)
    if rot is not None:
        obj.rotation_euler = rot
        obj.keyframe_insert('rotation_euler', frame=frame)


def build_explosion():
    """Unit-radius cartoon blast, 18 frames at 24 fps. The renderer scales it to the blast radius."""
    objs = []
    flash = fx_part('fx_flash', 0xfffbe0, 'ball', 0.5)
    key(flash, 0, scale=0.2); key(flash, 2, scale=1.5); key(flash, 5, scale=0.0); key(flash, 18, scale=0.0)
    objs.append(flash)
    star = fx_part('fx_star', 0xffc23a, 'star', 0.9)
    key(star, 0, scale=0.1, rot=(0, 0, 0)); key(star, 3, scale=1.25, rot=(0, 0, 0.4)); key(star, 7, scale=0.9, rot=(0, 0, 0.6))
    key(star, 11, scale=0.0, rot=(0, 0, 0.8)); key(star, 18, scale=0.0)
    objs.append(star)
    star2 = fx_part('fx_star_hot', 0xff5a1a, 'star', 1.05)
    key(star2, 0, scale=0.0, rot=(0.5, 0.3, 0)); key(star2, 1, scale=0.1); key(star2, 5, scale=1.15, rot=(0.5, 0.3, -0.5))
    key(star2, 9, scale=0.85); key(star2, 13, scale=0.0, rot=(0.5, 0.3, -0.9)); key(star2, 18, scale=0.0)
    objs.append(star2)
    ring = fx_part('fx_ring', 0xfff1c9, 'ring', 1.0)
    key(ring, 0, scale=0.1); key(ring, 2, scale=0.3); key(ring, 9, scale=1.7); key(ring, 12, scale=(1.9, 1.9, 0.0)); key(ring, 13, scale=0.0); key(ring, 18, scale=0.0)
    objs.append(ring)
    smoke = [0x6f6a75, 0x8a8590, 0x55505a]
    for i in range(7):
        a = i * (2 * math.pi / 7)
        d = Vector((math.cos(a), math.sin(a), 0.25 + (i % 3) * 0.3)).normalized()
        puff = fx_part(f'fx_puff_{i}', smoke[i % 3], 'ball', 0.42 + (i % 2) * 0.1)
        key(puff, 0, loc=(0, 0, 0), scale=0.0); key(puff, 3, loc=tuple(d * 0.25), scale=0.0)
        key(puff, 8, loc=tuple(d * 0.85), scale=1.0); key(puff, 13, loc=tuple(d * 1.05 + Vector((0, 0, 0.2))), scale=0.8)
        key(puff, 18, loc=tuple(d * 1.15 + Vector((0, 0, 0.45))), scale=0.0)
        objs.append(puff)
    for i in range(6):
        a = i * (2 * math.pi / 6) + 0.4
        d = Vector((math.cos(a), math.sin(a), 0.5 + (i % 2) * 0.5)).normalized()
        shard = fx_part(f'fx_shard_{i}', 0xffe14a if i % 2 else 0xff8a1a, 'shard', 0.22)
        key(shard, 0, loc=(0, 0, 0), scale=0.0, rot=(0, 0, 0)); key(shard, 1, loc=tuple(d * 0.2), scale=1.0)
        key(shard, 8, loc=tuple(d * 1.5), scale=1.0, rot=(3, 2, 1)); key(shard, 14, loc=tuple(d * 1.9 - Vector((0, 0, 0.5))), scale=0.0, rot=(6, 4, 2))
        key(shard, 18, scale=0.0)
        objs.append(shard)
    return objs


def build_poof():
    """Small hit puff, 12 frames."""
    objs = []
    star = fx_part('fx_pop', 0xffffff, 'star', 0.8)
    key(star, 0, scale=0.2, rot=(0, 0, 0)); key(star, 2, scale=1.1, rot=(0, 0, 0.5)); key(star, 6, scale=0.0, rot=(0, 0, 0.9)); key(star, 12, scale=0.0)
    objs.append(star)
    for i in range(5):
        a = i * (2 * math.pi / 5)
        d = Vector((math.cos(a), math.sin(a), 0.5)).normalized()
        puff = fx_part(f'fx_poof_{i}', 0xfff1c9 if i % 2 else 0xffffff, 'ball', 0.34)
        key(puff, 0, loc=(0, 0, 0), scale=0.0); key(puff, 4, loc=tuple(d * 0.7), scale=1.0); key(puff, 12, loc=tuple(d * 1.0 + Vector((0, 0, 0.2))), scale=0.0)
        objs.append(puff)
    return objs


# ---------------------------------------------------------------- export

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    global _MAT
    _MAT = None


def select_only(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


# Losslessly pack the largest legacy props so the expanded environment kit fits the static budget.
COMPRESSED_PROPS = {
    'bazaar_wall', 'building_a', 'building_b', 'building_c', 'drying_rack', 'far_bazaar',
    'hill_sign', 'palm_tree', 'sandstone_house', 'skyline_a', 'skyline_c', 'slide_truck',
}


def export(objs, folder, name, animated=False, compressed=False):
    os.makedirs(os.path.join(OUT, folder), exist_ok=True)
    path = os.path.join(OUT, folder, name + '.glb')
    select_only(objs)
    kwargs = dict(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
        export_texcoords=False, export_normals=True, export_materials='EXPORT', export_vertex_color='MATERIAL',
        export_animations=animated, export_cameras=False, export_lights=False,
    )
    if animated:
        kwargs.update(export_animation_mode='SCENE', export_frame_range=True, export_force_sampling=True, export_optimize_animation_size=True)
    bpy.ops.export_scene.gltf(**kwargs)
    compact_glb(path)
    if compressed:
        glb = Path(path)
        packed = glb.with_suffix('.glb.gz')
        packed.write_bytes(gzip.compress(glb.read_bytes(), compresslevel=9, mtime=0))
        glb.unlink()
        return packed.stat().st_size
    return os.path.getsize(path)


def compact_glb(path):
    """Rewrite float normals and colours as normalised bytes. About 44% off the vertex data.

    Positions stay float. Normals become int8 x3 (+1 pad), colours uint8 RGBA, both normalised, which
    needs KHR_mesh_quantization. Flat cartoon colours lose nothing at 8 bits.
    """
    import json
    import struct
    raw = open(path, 'rb').read()
    jlen = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20 + jlen])
    boff = 20 + jlen
    blen = struct.unpack_from('<I', raw, boff)[0]
    bin_ = raw[boff + 8:boff + 8 + blen]
    targets = {}
    for mesh in gltf.get('meshes', []):
        for prim in mesh['primitives']:
            for key in ('NORMAL', 'COLOR_0'):
                if key in prim['attributes']:
                    targets[prim['attributes'][key]] = key
    views = gltf['bufferViews']
    out = bytearray()
    new_views = []
    view_of = {}                                     # old view index -> new index, for untouched views

    def add_view(data, target=None, stride=None):
        while len(out) % 4:
            out.append(0)
        v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
        if target:
            v['target'] = target
        if stride:
            v['byteStride'] = stride
        out.extend(data)
        new_views.append(v)
        return len(new_views) - 1

    for i, acc in enumerate(gltf['accessors']):
        v = views[acc['bufferView']]
        start = v.get('byteOffset', 0) + acc.get('byteOffset', 0)
        kind = targets.get(i)
        if kind and acc['componentType'] == 5126:
            n = acc['count']
            comps = 3 if acc['type'] == 'VEC3' else 4
            stride = v.get('byteStride', comps * 4)
            data = bytearray()
            for k in range(n):
                vals = struct.unpack_from('<%df' % comps, bin_, start + k * stride)
                if kind == 'NORMAL':
                    data.extend(struct.pack('<3bx', *[max(-127, min(127, round(c * 127))) for c in vals[:3]]))
                else:
                    rgb = [max(0, min(255, round(c * 255))) for c in vals[:3]]
                    data.extend(struct.pack('<4B', rgb[0], rgb[1], rgb[2], 255))
            acc['bufferView'] = add_view(bytes(data), 34962, 4)
            acc.pop('byteOffset', None)
            acc['normalized'] = True
            acc['componentType'] = 5120 if kind == 'NORMAL' else 5121
            acc['type'] = 'VEC3' if kind == 'NORMAL' else 'VEC4'
            acc.pop('min', None)
            acc.pop('max', None)
        else:
            old = acc['bufferView']
            if old not in view_of:
                view_of[old] = add_view(bin_[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']], v.get('target'), v.get('byteStride'))
            acc['bufferView'] = view_of[old]
    gltf['bufferViews'] = new_views
    while len(out) % 4:
        out.append(0)
    gltf['buffers'] = [{'byteLength': len(out)}]
    for key in ('extensionsUsed', 'extensionsRequired'):
        ext = set(gltf.get(key, []))
        ext.add('KHR_mesh_quantization')
        gltf[key] = sorted(ext)
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(out)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<I4s', len(js), b'JSON'))
        f.write(js)
        f.write(struct.pack('<I4s', len(out), b'BIN\x00'))
        f.write(out)


def render_sheet(objs, name, cols=9, cell=5.0):
    """Workbench contact sheet so the kit can be checked without opening Blender."""
    scene = bpy.context.scene
    rows = math.ceil(len(objs) / cols)
    for i, o in enumerate(objs):
        dims = o.dimensions
        k = (cell * 0.72) / max(dims.x, dims.y, dims.z, 0.01)
        o.scale = (k, k, k)
        o.rotation_euler = (0, 0, math.radians(-35))
        o.location = ((i % cols) * cell, 0, -(i // cols) * cell)
    bpy.context.view_layer.update()
    for o in objs:                                             # sit each on its cell centre
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        c = sum(bb, Vector()) / 8
        o.location += Vector(((objs.index(o) % cols) * cell, 0, -(objs.index(o) // cols) * cell)) - c
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = max(cols * cell, rows * cell * 1.55)
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    centre = Vector(((cols - 1) * cell / 2, 0, -(rows - 1) * cell / 2))
    cam.location = centre + Vector((0, -60, 22))
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    scene.render.engine = 'BLENDER_WORKBENCH'
    sh = scene.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'VERTEX'
    sh.show_backface_culling = True
    sh.show_shadows = False
    scene.world = bpy.data.worlds.new('w')
    scene.world.color = (0.55, 0.57, 0.62)
    scene.render.film_transparent = False
    scene.render.resolution_x = 1800
    scene.render.resolution_y = int(1800 * rows / cols * 0.95) + 120
    os.makedirs(PREVIEWS, exist_ok=True)
    scene.render.filepath = os.path.join(PREVIEWS, name + '.png')
    bpy.ops.render.render(write_still=True)


def main():
    report = []
    clear_scene()
    preview = []
    for folder, makers in (('props', PROPS), ('projectiles', PROJECTILES), ('pickups', PICKUPS)):
        for make in makers:
            obj = make().build()
            size = export([obj], folder, obj.name, compressed=folder == 'props' and obj.name in COMPRESSED_PROPS)
            report.append((folder, obj.name, len(obj.data.polygons), size))
            preview.append(obj)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'art', 'blender', 'cartoon_kit.blend'))
    render_sheet(preview, 'cartoon_kit_sheet')

    for name, build, end in (('explosion', build_explosion, 18), ('poof', build_poof, 12)):
        clear_scene()
        scene = bpy.context.scene
        scene.render.fps = 24
        scene.frame_start, scene.frame_end = 0, end
        objs = build()
        size = export(objs, 'fx', name, animated=True)
        report.append(('fx', name, sum(len(o.data.polygons) for o in objs), size))
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'art', 'blender', f'fx_{name}.blend'))
        for f in (2, 5, 9, 13):
            scene.frame_set(f)
            cam_data = bpy.data.cameras.new('cam')
            cam_data.type = 'ORTHO'
            cam_data.ortho_scale = 5.5
            cam = bpy.data.objects.new('cam', cam_data)
            scene.collection.objects.link(cam)
            cam.location = (0, -20, 6)
            cam.rotation_euler = (Vector((0, 0, 0.2)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
            scene.camera = cam
            scene.render.engine = 'BLENDER_WORKBENCH'
            scene.display.shading.light = 'FLAT'
            scene.display.shading.color_type = 'VERTEX'
            scene.world = bpy.data.worlds.new('w')
            scene.world.color = (0.55, 0.57, 0.62)
            scene.render.resolution_x = scene.render.resolution_y = 420
            scene.render.filepath = os.path.join(PREVIEWS, f'fx_{name}_f{f:02d}.png')
            bpy.ops.render.render(write_still=True)
            bpy.data.objects.remove(cam)

    print('\nCARTOON KIT')
    for folder, name, polys, size in report:
        print(f'  {folder}/{name}.glb  {polys} faces  {size} bytes')
    print(f'  total {sum(r[3] for r in report)} bytes in {len(report)} files')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        import traceback
        traceback.print_exc()
        sys.exit(1)
