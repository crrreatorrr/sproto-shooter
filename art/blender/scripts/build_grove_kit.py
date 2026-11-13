"""Build the Vegetable Grove kit from the repo root with Blender --background --python."""
from math import cos, degrees, pi, sin
from pathlib import Path
from random import Random
import sys

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_cartoon_kit import Model, clear_scene, export, srgb

BARK = (0x533249, 0x784534, 0xA96039, 0xC87D49)
LEAF = (0x1B563E, 0x36754A, 0x62963C, 0x8EB644, 0xB7CD4E)
STONE = (0x514762, 0x726778, 0x9B8790)
TEAL = (0x285B62, 0x39857C, 0x69AD91)
ORANGE = (0x9F492A, 0xD96D2C, 0xF4A53E, 0xFFD077)
CYAN = (0x168991, 0x42D3CD, 0xC5FFF0)
PINK = (0x8D2E69, 0xE45B9F, 0xFFA2CA)
CREAM = 0xF3D69E


class Grove(Model):
    def __init__(self, name):
        super().__init__(f'grove_{name}', outline=0)

    def facets(self, verts, faces, colors):
        start = len(self.verts)
        self.verts.extend([tuple(v) for v in verts])
        for face, color in zip(faces, colors, strict=True):
            self.faces.append([start + i for i in face])
            self.colors.append(srgb(color))
            self.smooth.append(False)

    def rock(self, at, scale, colors, seed, detail=1):
        rng = Random(seed)
        mesh = bmesh.new()
        bmesh.ops.create_icosphere(mesh, subdivisions=detail, radius=1)
        for v in mesh.verts:
            v.co *= rng.uniform(0.82, 1.14)
        mesh.verts.index_update()
        verts = [tuple(p + s * n for p, s, n in zip(at, scale, v.co)) for v in mesh.verts]
        faces = [[v.index for v in f.verts] for f in mesh.faces]
        self.facets(verts, faces, rng.choices(colors, k=len(faces)))
        mesh.free()

    def tube(self, path, colors, sides=6):
        verts = []
        faces = []
        palette = []
        for i, (xyz, radius) in enumerate(path):
            tangent = Vector(path[min(i + 1, len(path) - 1)][0]) - Vector(path[max(0, i - 1)][0])
            tangent.normalize()
            u = tangent.cross(Vector((0, 1, 0)))
            if u.length < 0.1:
                u = tangent.cross(Vector((1, 0, 0)))
            u.normalize()
            v = tangent.cross(u)
            for k in range(sides):
                theta = 2 * pi * k / sides
                verts.append(Vector(xyz) + radius * (u * cos(theta) + v * sin(theta)))
        faces.append(tuple(reversed(range(sides))))
        palette.append(colors[0])
        for i in range(len(path) - 1):
            for k in range(sides):
                a, b = i * sides + k, i * sides + (k + 1) % sides
                faces.append((a, b, b + sides, a + sides))
                palette.append(colors[(k + (i // 3)) % len(colors)])
        faces.append(tuple(range(len(verts) - sides, len(verts))))
        palette.append(colors[-1])
        self.facets(verts, faces, palette)

    def beam(self, a, b, radius, colors=BARK):
        self.tube([(a, radius), (b, radius * 0.9)], colors, sides=5)

    def leaf(self, start, angle, length, width, lift, colors=LEAF[1:]):
        x, y, z = start
        c, s = cos(angle), sin(angle)
        profile = [(0, 0, 0), (.28, -.38, .32), (.64, -.5, .77), (1, 0, .55),
                   (.64, .5, .77), (.28, .38, .32), (.52, 0, 1)]
        verts = [(x + c * a * length - s * b * width, y + s * a * length + c * b * width,
                  z + h * lift) for a, b, h in profile]
        faces = [(i, (i + 1) % 6, 6) for i in range(6)]
        self.facets(verts, faces + [tuple(reversed(range(6)))],
                    [colors[(i + 1) % len(colors)] for i in range(6)] + [colors[0]])

    def gem(self, at, r, h, palette, sides=5):
        x, y, z = at
        self.cyl(palette[0], r * 0.55, h * .17, at, r2=r, seg=sides, smooth=False)
        verts = [(x + r * cos(k * 2 * pi / sides), y + r * sin(k * 2 * pi / sides), z + h * .17)
                 for k in range(sides)] + [(x + r * .1, y, z + h)]
        self.facets(verts, [(k, (k + 1) % sides, sides) for k in range(sides)],
                    [palette[k % len(palette)] for k in range(sides)])


def pumpkin(m, x, y, z, r):
    for k in range(7):
        theta = k * 2 * pi / 7
        m.rock((x + cos(theta) * r * .29, y + sin(theta) * r * .29, z + r * .52),
               (r * .67, r * .67, r * .57), ORANGE[1:], k)
    m.beam((x, y, z + r * .94), (x + .22 * r, y, z + 1.26 * r), .11 * r, LEAF[:3])


def mushroom(m, x, y, h, r, seed, red=True):
    m.tube([((x, y, 0), r * .21), ((x - r * .15, y, h * .62), r * .15),
            ((x, y, h * .88), r * .24)], (0xA97560, CREAM, 0xFFE5BA))
    cap = (0x963E42, 0xD45B47, 0xF28658) if red else ORANGE[:3]
    m.cyl(0xC58F61, r * .4, h * .16, (x, y, h * .73), r2=r, seg=8, smooth=False)
    m.rock((x, y, h * .96), (r, r, r * .43), cap, seed, 2)
    for k in range(4):
        a = k * 2.4
        m.rock((x + cos(a) * r * .49, y + sin(a) * r * .49, h * .96 + r * .32),
               (r * .15, r * .13, r * .045), (CREAM, 0xFFE8C2), seed + k)


def foliage(m, at, width, depth, height, seed, dark=False):
    rng = Random(seed)
    palette = LEAF[:3] if dark else LEAF[1:]
    for i, (dx, dy, dz) in enumerate([(-.28, .1, -.12), (.24, .1, -.02), (0, -.18, .08), (.02, .15, .33)]):
        m.rock((at[0] + width * dx, at[1] + depth * dy, at[2] + height * dz),
               (width * .39, depth * .51, height * .56), palette, rng.randint(0, 500), 2)


def tree():
    m = Grove('tree')
    m.tube([((0, 0, 0), .78), ((-.25, .15, 3.6), .61), ((.18, 0, 7.5), .31)], BARK, 7)
    for k in range(4):
        a = k * pi / 2 + .30
        x, y = cos(a), sin(a)
        m.beam((0, 0, 4.3), (x * 1.82, y * 1.82, 6.85), .29)
        m.rock((x * 1.75, y * 1.75, 7.5 + .27 * (k % 2)), (2.1, 2.0, 1.58), LEAF[1:], k + 31, 2)
        for j in range(2):
            angle = a + .3 - .6 * j
            m.rock((cos(angle) * 2.94, sin(angle) * 2.94, 7.3 + .48 * j), (.28, .27, .30), ORANGE[1:], 81 + k + j)
    m.rock((.1, 0, 8.82), (2.25, 2.17, 1.64), LEAF[1:], 26, 2)
    return m

def pines():
    m = Grove('pines')
    for i, (x, y, h) in enumerate([(-5, 1, 18), (1, 3, 23), (6, -2, 15), (-1, -3, 13)]):
        m.cyl(BARK[0], h * .038, h * .6, (x, y, 0), r2=h * .015, seg=6, smooth=False)
        for j in range(4):
            r = h * (.19 - .032 * j)
            m.cyl(LEAF[i % 2 + j % 2], r, h * .36, (x, y, h * (.24 + j * .14)), r2=.04,
                  seg=6, smooth=False)
    return m


def hedge():
    m = Grove('hedge')
    m.box(LEAF[0], (2, 1.92, 1.62), (0, 0, .81))
    for k, x in enumerate((-.65, 0, .65)):
        m.rock((x, 0, 1.48 + .09 * (k % 2)), (.48, 1.0, .44), LEAF[1:], 23 + k)
    for side in (-1, 1):
        for k in range(2):
            m.leaf((-.43 + k * .84, side * .966, .63 + .25 * k), side * pi / 2, .12, .33, .41, LEAF[1:])
    return m

def orchard_rise():
    m = Grove('orchard_rise')
    # A distant grass bank with three silhouettes and alternating meadow strata.
    for k, (x, y, h) in enumerate(((-18, 2, 6), (0, 5, 8), (18, 1, 4.9))):
        m.rock((x, y, -1), (15, 10, h), (0x567E63, 0x74905B, 0x9AA763), k + 54, 2)
        for j in range(4):
            tx = x + (j - 1.5) * 4.7
            ty = y + (j % 2) * 2.1
            tree_h = 3.8 + ((k + j) % 3) * .7
            m.cyl(BARK[1], .28, tree_h, (tx, ty, h - 4.4), seg=5, smooth=False)
            m.rock((tx, ty, h + tree_h - 3.8), (1.9, 1.8, 1.7), (0x466F55, 0x648447, 0x88A05C), 42 + j + k)
    return m

def orchard_barn():
    m = Grove('orchard_barn')
    m.box(0xB07A49, (7.8, 6.4, 4.7), (0, 0, 2.35), bevel=.08)
    for sign in (-1, 1):
        m.box(0x556D4D, (7.9, 3.8, .34), (0, sign*1.55, 5.34), rot=(-sign * 30, 0, 0))
        m.box(BARK[0], (2.15, .11, 2.8), (0, sign * 3.23, 1.40))
        for x in (-2.45, 2.45):
            m.box(CREAM, (.95, .11, .82), (x, sign * 3.23, 2.94))
        for x in (-3.65, 3.65):
            m.box(CREAM, (.18, .10, 4.5), (x, sign * 3.23, 2.25))
    return m

def orchard_windmill():
    m = Grove('orchard_windmill')
    m.cyl(0xBA905C, 2.9, 9.6, (0, 0, 0), r2=2.14, seg=8, smooth=False)
    m.cyl(0x637E57, 2.65, 2.65, (0, 0, 9.56), r2=.33, seg=8, smooth=False)
    m.box(BARK[0], (1.21, .15, 2.1), (0, -2.73, 1.12))
    for i in range(4):
        a = i * pi / 2 + .37
        x, z = cos(a), sin(a)
        m.beam((0, -2.36, 7.85), (6.4*x, -2.36, 7.85 + 6.4*z), .128)
        m.box(CREAM, (3.7, .11, 1.12), (4.36*x, -2.38, 7.85 + 4.36*z), rot=(0, -degrees(a), 0))
    return m

def vehicle(name, tractor=False):
    m = Grove(name)
    # Truck faces game +Z. The tractor faces +X like its authored cover.
    paint = ORANGE[1:3] if tractor else TEAL[1:]
    front, rear = (-1.3, 1.03) if tractor else (-1.56, 1.47)
    span = 1.03 if tractor else 1.2
    for axle, y in enumerate((front, rear)):
        r = (.56, .89)[axle] if tractor else .64
        for sign in (-1, 1):
            x = sign * span
            m.cyl(0x322C3A, r, .4, (x - .2, y, r), rot=(0, 90, 0), seg=10, smooth=False)
            m.cyl(paint[0], r * .51, .46, (x - .23, y, r), rot=(0, 90, 0), seg=8, smooth=False)
            m.cyl(STONE[2], r * .23, .5, (x - .25, y, r), rot=(0, 90, 0), seg=6, smooth=False)
            for k in range(10):
                a = 2 * pi * k / 10
                m.box(0x48404A, (.39, .22, .085), (x, y + r * sin(a), r + r * cos(a)),
                      rot=(-a * 180 / pi, 0, 0))
    m.box(BARK[0], (1.75, 4.2, .32), (0, 0, .7), bevel=.08)
    m.box(paint[0], (1.66, 1.44, .8), (0, -1.48, 1.23), bevel=.18)
    m.box(paint[1], (1.6, 1.26, .22), (0, -1.41, 1.64), bevel=.09)
    m.box(STONE[0], (1.17, .14, .57), (0, -2.18, 1.28), bevel=.05)
    m.box(STONE[2], (2.22, .17, .19), (0, -2.24, .67), bevel=.04)
    for k in range(6):
        m.box(0xC8AF9D, (.065, .08, .49), ((k - 2.5) * .17, -2.27, 1.28), bevel=.01)
    for x in (-.78, .78):
        m.cyl(CREAM, .18, .13, (x, -2.13, 1.28), rot=(90, 0, 0), seg=8, smooth=False)
    if tractor:
        m.box(ORANGE[1], (1.73, .76, .72), (0, .6, 1.27), bevel=.15)
        m.box(0x433443, (.65, .59, .15), (0, .7, 1.72), bevel=.07)
        m.box(0x433443, (.65, .14, .46), (0, .94, 1.91), bevel=.07)
        m.cyl(STONE[0], .1, .91, (.52, -1.23, 1.65), seg=7, smooth=False)
        m.beam((0, -.5, 1.5), (0, -.16, 2.1), .066, STONE)
        m.cyl(STONE[0], .26, .08, (0, -.16, 2.1), rot=(30, 0, 0), seg=8, smooth=False)
        for x in (-span, span):
            m.box(ORANGE[1], (.58, 1.31, .18), (x, 1.03, 1.84), bevel=.09)
        m.verts = [(y * -1, x, z) for x, y, z in m.verts]
    else:
        m.box(paint[0], (1.85, 1.35, 1.45), (0, -.54, 1.52), bevel=.14)
        m.box(0x3E5566, (1.53, .08, .53), (0, -1.22, 1.88), rot=(9, 0, 0), bevel=.06)
        m.box(paint[1], (1.99, 1.49, .19), (0, -.53, 2.28), bevel=.09)
        for x in (-.925, .925):
            m.box(0x3E5566, (.05, .85, .52), (x, -.54, 1.88), bevel=.05)
            m.box(CREAM, (.09, .21, .07), (x * 1.03, -.32, 1.51))
            for row in range(3):
                m.box(BARK[1 + row % 3], (.13, 2.22, .19), (x, 1.08, 1.13 + row * .25), bevel=.035)
            for y in (.05, 2.13):
                m.box(BARK[2], (.19, .19, 1.02), (x, y, 1.29), bevel=.035)
        for k in range(7):
            m.box(BARK[1 + k % 3], (.245, 2.22, .11), ((k - 3) * .26, 1.08, .97), bevel=.02)
    return m


def scarecrow():
    m = Grove('scarecrow')
    m.beam((0, 0, 0), (0, 0, 2.24), .17)
    m.beam((-.91, 0, 1.6), (.91, 0, 1.6), .15)
    for s in (-1, 1):
        for k in range(4):
            m.beam((s * .69, -.07 + .04 * k, 1.6), (s * (1.03 + .03 * k), -.12 + .07 * k, 1.45 + .11 * k),
                   .03, ORANGE[2:])
    m.rock((0, 0, 1.36), (.72, .33, .59), TEAL, 17, 2)
    pumpkin(m, 0, 0, 1.93, .4)
    for x in (-.13, .13):
        m.rock((x, -.32, 2.2), (.075, .03, .063), (BARK[0],), 3)
    m.cyl(0xD4724C, .47, .23, (0, 0, 2.34), r2=.13, seg=8, smooth=False)
    m.cyl(0xA34E4E, .53, .08, (0, 0, 2.31), seg=8, smooth=False)
    m.box(CREAM, (.22, .065, .055), (0, -.315, 1.4), rot=(0, 39, 0))
    m.box(CREAM, (.22, .065, .055), (0, -.316, 1.4), rot=(0, -39, 0))
    return m


def shed():
    m = Grove('shed')
    for i in range(12):
        x = (i - 5.5) * .49
        m.box(BARK[1 + i % 3], (.475, .42, 2.99), (x, 2.47, 1.5), bevel=.025)
    for side in (-1, 1):
        for i in range(10):
            y = (i - 4.5) * .49
            m.box(BARK[1 + (i + 1) % 3], (.46, .47, 2.99), (side * 2.75, y, 1.5), bevel=.025)
        for i in range(4):
            m.box(BARK[1 + i % 3], (.42, .45, 2.99), (side * (1.37 + i * .44), -2.23, 1.5), bevel=.025)
        for y in (-2.45, 2.45):
            m.box(BARK[0], (.2, .22, 3.08), (side * 2.77, y, 1.54), bevel=.035)
        for i in range(8):
            y = (i - 3.5) * .7
            m.box(TEAL[i % 3], (3.43, .71, .21), (side * 1.65, y, 3.22), rot=(0, side * 10, 0), bevel=.045)
    m.box(BARK[2], (.23, 5.7, .21), (0, 0, 3.58), bevel=.04)
    return m


def beanstalk():
    m = Grove('beanstalk')
    # The stepping leaves are separate meshes, fitted to the existing platforms.
    m.tube([((0, 0, 0), 1.62), ((.2, .21, 3), 1.53), ((-.22, .14, 6), 1.52),
            ((-.26, -.26, 10), 1.38), ((.27, -.06, 14), 1.33), ((.23, .22, 18), 1.24),
            ((-.22, -.1, 21), 1.1), ((-.35, -.1, 24), .78), ((.2, -.08, 25.5), .61),
            ((1.23, -.03, 26.5), .48), ((2.24, 0, 26.13), .32), ((2.47, 0, 25.15), .21),
            ((1.84, 0, 24.7), .08)], LEAF[:4], 9)
    vine = []
    for i in range(33):
        a = i * .34
        r = 1.48 - i * .017
        vine.append(((r * cos(a), r * sin(a), i * .742), .39 - .007 * i))
    m.tube(vine, (LEAF[1], LEAF[3], LEAF[4]))
    for k, (a, h) in enumerate([(pi, 2.5), (0, 7), (pi / 2, 12), (-pi / 2, 18), (.9, 23)]):
        m.leaf((0, 0, h), a, 2.4 + .16 * k, 1.6, .76)
    return m


def leaf_step():
    m = Grove('leaf_step')
    m.box(LEAF[2], (3.95, 3.91, .4), (0, 0, .2), bevel=.23)
    m.leaf((0, 1.98, .36), -pi / 2, 3.96, 4.0, .16)
    m.beam((0, 1.88, .515), (0, -1.66, .51), .04, LEAF[3:])
    return m


def gazebo():
    m = Grove('gazebo')
    m.cyl(STONE[1], 5, .49, (0, 0, 0), seg=12, smooth=False)
    m.cyl(STONE[2], 4.86, .095, (0, 0, .43), seg=12, smooth=False)
    for k in range(6):
        a = pi / 2 + k * pi / 3
        x, y = 4.5 * cos(a), 4.5 * sin(a)
        m.box(STONE[k % 2], (.89, .88, .31), (x, y, .69), bevel=.06)
        m.beam((x, y, .82), (x, y, 4.25), .37)
        for side in (-1, 1):
            b = a + side * .24
            m.beam((x, y, 3.19), (4.5 * cos(b), 4.5 * sin(b), 4.28), .16)
    for j, (r, z, h) in enumerate(((5.48, 4.12, .84), (4.58, 4.78, .71), (3.21, 5.34, .63), (1.9, 5.82, .67))):
        m.cyl(LEAF[j + 1], r, h, (0, 0, z), r2=r * .55, seg=12, smooth=False)
        for k in range(12):
            a = k * pi / 6
            m.leaf((cos(a) * r * .52, sin(a) * r * .52, z + h - .13), a,
                   r * .49, r * .25, -.5 * h, LEAF[max(0, j - 1):])
    m.cyl(ORANGE[1], .33, .34, (0, 0, 6.34), r2=.08, seg=6, smooth=False)
    return m


def arch():
    m = Grove('arch')
    for k, (offset, depth) in enumerate([(0, -.09), (.15, -.53), (-.19, .52)]):
        path = [((x, depth + .18 * sin(i * 1.5 + k), z), r)
                for i, (x, z, r) in enumerate([(-2.55, .05, .60), (-2.56, 2.12, .56), (-2.52, 4.34, .58),
                                              (-1.65, 5.26, .52), (0, 5.52, .45), (1.65, 5.27, .51),
                                              (2.55, 4.3, .57), (2.56, 2.02, .54), (2.57, .07, .54)])]
        m.tube([((x + offset * sin(i), y, z + .1 * k), r / (1 + .4 * k)) for i, ((x, y, z), r) in enumerate(path)], BARK)
    for k in range(7):
        x = (k - 3) * .74
        m.leaf((x, .1, 5.5 - .07 * x * x), pi / 2 + k * 2.4, 1.15, .87, .34)
    return m


def wide_root_arch():
    m = Grove('wide_root_arch')
    span = 7.3
    for side in (-1, 1):
        x = side * span
        m.tube([((x, 0, 0), .55), ((x + side * .13, .1, 2.3), .46),
                ((x, -.02, 4.8), .51), ((x - side * .47, .08, 5.48), .42)], BARK, 7)
        m.tube([((x + side * .33, -.39, 0), .22), ((x + side * .47, -.28, 2.5), .25),
                ((x + side * .18, -.37, 4.8), .27)], BARK[1:], 5)
    for y in (-.34, .36):
        m.tube([((x, y + .12 * sin(i * 1.7), 5.49 + .11 * sin(i)), .36)
                for i, x in enumerate((-7.2, -4.8, -2.4, 0, 2.4, 4.8, 7.2))], BARK, 7)
    for i in range(9):
        x = (i - 4) * 1.67
        m.leaf((x, .06, 5.77), i * 2.41, 1.17, .8, .46, LEAF[1:])
    return m


def totem():
    m = Grove('totem')
    m.tube([((0, 0, 0), .79), ((.08, 0, .51), .8), ((-.05, .02, 1.87), .61),
            ((.06, -.04, 3.4), .7), ((0, 0, 4), .79)], (BARK[0], STONE[0], BARK[1]), 7)
    m.gem((0, 0, 3.72), .68, 1.34, CYAN, 6)
    for k in range(5):
        a = k * 2 * pi / 5
        x, y = cos(a), sin(a)
        m.beam((x * .7, y * .7, .25), (x * .34, y * .34, 1.3), .1, (CYAN[0], CYAN[1]))
        m.beam((x * .54, y * .54, 3.77), (x * .63, y * .63, 4.54), .11, STONE)
    return m


def bloom():
    m = Grove('bloom')
    m.cyl(TEAL[0], .84, .1, (0, 0, 0), r2=.67, seg=9, smooth=False)
    for k in range(7):
        a = k * 2 * pi / 7
        m.leaf((0, 0, .14), a, .99, .62, .37 + .1 * (k % 3))
        m.gem((cos(a) * .3, sin(a) * .3, .35), .24, .68, CYAN[:2])
    m.gem((0, 0, .38), .43, 1.15, CYAN, 6)
    return m


def pod():
    m = Grove('pod')
    m.tube([((0, 0, 0), .57), ((-.07, .04, .31), .53), ((.01, 0, .8), .49)], BARK, 8)
    m.rock((0, 0, 1.12), (.43, .42, .47), LEAF[2:], 20, 2)
    for k in range(6):
        a = k * pi / 3
        m.leaf((0, 0, .64), a, .51, .29, .49, LEAF[:3])
    return m


def patch():
    m = Grove('patch')
    pumpkin(m, .8, .13, 0, .8)
    pumpkin(m, -.16, -.55, 0, .48)
    for x, y, h, r in [(-.65, .32, 1.55, .68), (.27, .65, 1.1, .52), (-.93, -.28, .72, .42)]:
        mushroom(m, x, y, h, r, 13 + int(10 * h))
    for k in range(5):
        m.leaf((0, 0, .02), k * 2.4, 1.44, .65, .33)
    return m


def crops():
    m = Grove('crops')
    for i in range(3):
        x = (i - 1) * 1.42
        m.rock((x, 0, .05), (.71, .85, .2), (0x653D38, 0x946149, 0x744633), i, 2)
        for j in range(3):
            y = (j - 1) * .48
            m.rock((x, y, .26), (.29, .29, .31), ORANGE[1:], 10 * i + j)
            for k in range(4):
                m.leaf((x, y, .34), k * 1.57 + j, .42, .34, .25 + .08 * (k % 2))
    return m


def planter():
    m = Grove('planter')
    m.box(BARK[0], (8, 1.6, 1.15), (0, 0, .575), bevel=.1)
    for side in (-1, 1):
        for row in range(3):
            m.box(BARK[row + 1], (7.92, .11, .26), (0, side * .753, .3 + row * .33), bevel=.035)
        for x in (-3.85, 0, 3.85):
            m.box(TEAL[0], (.22, .15, 1.12), (x, side * .76, .58), bevel=.025)
    for i in range(8):
        x = i - 3.5
        for k in range(4):
            m.leaf((x, 0, 1.08), k * 1.57 + i, .58, .46, .14)
    return m


def lantern():
    m = Grove('lantern')
    m.beam((0, 0, 0), (0, 0, 2.68), .18)
    m.beam((0, 0, 2.6), (.78, 0, 2.6), .12)
    m.beam((0, 0, 2.18), (.42, 0, 2.58), .08)
    m.box(ORANGE[0], (.44, .42, .12), (.72, 0, 2.04), bevel=.035)
    m.box(0xFFCC72, (.35, .34, .35), (.72, 0, 2.23), bevel=.035)
    m.cyl(ORANGE[1], .3, .22, (.72, 0, 2.39), r2=.07, seg=4, smooth=False)
    for dx in (-.17, .17):
        for y in (-.17, .17):
            m.beam((.72 + dx, y, 2.04), (.72 + dx, y, 2.42), .036, BARK)
    return m


def reeds():
    m = Grove('reeds')
    rng = Random(17)
    for i in range(12):
        x, y = rng.uniform(-1.15, 1.15), rng.uniform(-.8, .8)
        h = rng.uniform(.44, 1.3)
        m.leaf((x, y, 0), rng.uniform(0, 2 * pi), rng.uniform(.18, .57), .27, h, LEAF)
        if i % 3 == 0:
            m.beam((x, y, 0), (x + .12, y, h + .38), .045, LEAF[:3])
            m.rock((x + .12, y, h + .39), (.11, .11, .25), ORANGE[:2], i)
    return m


def stones():
    m = Grove('stones')
    for i, (x, y, w) in enumerate([(-1.38, -.18, .65), (0, .32, .85), (1.45, -.18, .72)]):
        m.rock((x, y, .03), (w, .56, .11), STONE[1:] + (0x9A7158,), i + 38, 2)
    return m


def nest():
    m = Grove('nest')
    # Discarded nest husk, outside the route. Live nests use the existing enemy rig.
    for i in range(5):
        phase = i * 1.22
        path = []
        for k in range(10):
            a = phase + k * .47
            r = .63 + .064 * k
            path.append(((r * cos(a), r * sin(a), .18 + .11 * k + .22 * sin(k * .44 + phase)), .12))
        m.tube(path, (BARK[1], BARK[3], LEAF[1]), 5)
        x, y, z = path[-1][0]
        m.beam((x * .85, y * .85, z - .27), (x * 1.19, y * 1.19, z + .42), .105, ORANGE[:3])
    for i in range(3):
        m.gem((cos(i * 2.1) * .38, sin(i * 2.1) * .38, .17), .23, .51, PINK)
    return m


def greenhouse_frame():
    m = Grove('greenhouse_frame')
    for x in (-1.98, 0, 1.98):
        m.box(BARK[0], (.17, .19, 8), (x, 0, 4))
    for z in (.30, .72, 3.76, 6.65, 7.85):
        m.box(BARK[2], (4, .2, .19), (0, 0, z))
    for x in (-1.44, -.48, .48, 1.44):
        m.box(STONE[1], (.94, .35, .53), (x, 0, .27))
    return m

ROOF_PROFILE = [(-22.5, 0), (-18.5, 2.8), (-12, 5.6), (-5, 7.2), (0, 7.5),
                (5, 7.2), (12, 5.6), (18.5, 2.8), (22.5, 0)]

def greenhouse_roof():
    m = Grove('greenhouse_roof')
    # One bowed rib spanning the existing roof from eave to eave.
    m.tube([((0, y, z), .19) for y, z in ROOF_PROFILE], BARK, 5)
    for y, z in ROOF_PROFILE[1:-1]:
        m.box(BARK[2], (4.2, .19, .17), (0, y, z), bevel=.025)
    return m


def greenhouse_glass():
    m = Grove('greenhouse_glass')
    # Panes sit between ribs. The renderer draws both sides as translucent glass.
    for i, ((y, z), (ny, nz)) in enumerate(zip(ROOF_PROFILE, ROOF_PROFILE[1:])):
        verts = [(-2.06, y, z), (2.06, y, z), (2.06, ny, nz), (-2.06, ny, nz)]
        m.facets(verts, [(0, 1, 2, 3)], [ORANGE[1 + i % 3]])
    return m


def bridge():
    m = Grove('bridge')
    for i in range(18):
        x = (i - 8.5) * .49
        m.box(BARK[1 + (i * 7) % 3], (.475, 3.98, .24), (x, .025 * (i % 3 - 1), .31), bevel=.035)
    for y in (-1.58, 1.58):
        m.box(BARK[0], (8.84, .29, .2), (0, y, .1), bevel=.035)
        for i in range(6):
            x = (i - 2.5) * 1.46
            m.cyl(STONE[0], .074, .036, (x, y, .414), seg=5, smooth=False)
    return m


def timber_ramp():
    m = Grove('timber_ramp')
    verts = [(-.5, .5, 0), (.5, .5, 0), (.5, -.5, 0),
             (-.5, -.5, 0), (.5, -.5, 1), (-.5, -.5, 1)]
    m.facets(verts, [(1, 2, 3, 0), (2, 4, 5, 3), (3, 5, 0), (4, 2, 1), (5, 4, 1, 0)],
             [BARK[0], BARK[1], BARK[1], BARK[2], BARK[0]])
    for k in range(16):
        y = .5 - (k + .5) / 16
        m.box(BARK[1 + k % 3], (.986, .083, .022), (0, y, .509 - y), rot=(-45, 0, 0))
    return m


def barn_roof():
    m = Grove('barn_roof')
    for side in (-1, 1):
        for i in range(12):
            x = (i - 5.5) * 1.63
            m.box(TEAL[i % 3], (1.64, 6.75, .32), (x, side * 3.12, 1.42),
                  rot=(-side * 19, 0, 0), bevel=.08)
    for x in (-9.68, 9.68):
        for side in (-1, 1):
            m.beam((x, 0, 2.56), (x, side * 6.34, .43), .18)
    m.box(BARK[2], (19.75, .38, .24), (0, 0, 2.56), bevel=.07)
    return m


def crate():
    m = Grove('crate')
    m.box(BARK[0], (1.97, 1.97, 1.13), (0, 0, .565), bevel=.06)
    for i in range(5):
        v = (i - 2) * .38
        m.box(BARK[1 + i % 3], (.36, 1.85, .08), (v, 0, 1.135), bevel=.025)
        for s in (-1, 1):
            m.box(BARK[1 + i % 3], (.36, .066, 1.0), (v, s * .957, .55), bevel=.018)
            m.box(BARK[1 + (i + 1) % 3], (.066, .36, 1.0), (s * .957, v, .55), bevel=.018)
    for s in (-1, 1):
        m.box(BARK[3], (1.87, .14, .13), (0, s * .91, 1.125), bevel=.027)
        m.box(BARK[3], (.14, 1.87, .13), (s * .91, 0, 1.125), bevel=.027)
        m.box(BARK[3], (1.91, .09, .11), (0, s * .972, .13), bevel=.023)
    return m


def hay():
    m = Grove('hay')
    for i in range(7):
        m.box(ORANGE[2 + i % 2], (.288, 1.14, 1.14), ((i - 3) * .274, 0, .59), bevel=.115)
    for x in (-.58, .58):
        m.box(BARK[2], (.058, 1.16, 1.16), (x, 0, .59), bevel=.13)
    return m


def topiary():
    m = Grove('topiary')
    m.cyl(STONE[1], .62, .62, (0, 0, 0), r2=.8, seg=8, smooth=False)
    m.cyl(STONE[2], .85, .14, (0, 0, .53), seg=8, smooth=False)
    m.beam((0, 0, .61), (0, 0, 2.43), .35)
    foliage(m, (0, 0, 2.34), 2.83, 2.68, 1.7, 42)
    return m


def tower():
    m = Grove('tower')
    for x in (-2.2, 2.2):
        for y in (-2.2, 2.2):
            m.box(BARK[1], (.47, .47, 5.15), (x, y, 2.575), bevel=.045)
            m.box(STONE[0], (.62, .62, .33), (x, y, .165), bevel=.05)
        m.beam((x, -2.2, .9), (x, 2.2, 4.93), .13)
        m.beam((x, 2.2, .9), (x, -2.2, 4.93), .13)
    for i in range(10):
        m.box(BARK[1 + i % 3], (.48, 4.98, .49), ((i - 4.5) * .5, 0, 5.25), bevel=.035)
    for k in range(3):
        z = 5.7 + .4 * k
        m.box(BARK[2], (4.95, .48, .34), (0, 2.25, z), bevel=.035)
        for x in (-2.25, 2.25):
            m.box(BARK[1 + k % 3], (.47, 4.97, .34), (x, 0, z), bevel=.032)
    crow = scarecrow()
    offset = len(m.verts)
    m.verts.extend((x, y, z + 5.5) for x, y, z in crow.verts)
    m.faces.extend([offset + vertex for vertex in face] for face in crow.faces)
    m.colors.extend(crow.colors)
    m.smooth.extend(crow.smooth)
    return m


def silo():
    m = Grove('silo')
    m.cyl(TEAL[0], 3.95, 14, (0, 0, 0), seg=14, smooth=False)
    for i in range(14):
        a = i * 2 * pi / 14
        x, y = cos(a) * 3.87, sin(a) * 3.87
        m.box(TEAL[i % 3], (.18, 1.75, 13.68), (x, y, 7), rot=(0, 0, a * 180 / pi), bevel=.045)
    for z in (.3, 3.9, 7.45, 11, 13.7):
        m.cyl(BARK[1], 4.05, .21, (0, 0, z), seg=14, smooth=False)
    m.cyl(ORANGE[0], 4.36, 2.7, (0, 0, 14), r2=.58, seg=14, smooth=False)
    m.cyl(ORANGE[2], .53, .32, (0, 0, 16.63), r2=.26, seg=8, smooth=False)
    return m


def stockade():
    m = Grove('stockade')
    for i in range(6):
        x = (i - 2.5) * .58
        h = (2.79, 2.97, 2.87)[i % 3]
        m.box(BARK[1 + i % 3], (.56, 1.82, h), (x, 0, h / 2), bevel=.12)
    for side in (-1, 1):
        for z in (.64, 2.1):
            m.box(BARK[0], (3.5, .2, .24), (0, side * .87, z), bevel=.05)
            for x in (-1.3, 0, 1.3):
                m.box(STONE[1], (.14, .15, .15), (x, side * .95, z), bevel=.042)
    return m


def boulder():
    m = Grove('boulder')
    m.rock((0, 0, .77), (.96, .82, 1), STONE, 220, 2)
    m.rock((-.54, .31, .29), (.43, .51, .36), STONE[:2], 77)
    m.rock((.45, -.53, .22), (.52, .29, .33), STONE[:2], 14)
    for i in range(5):
        x = (i - 2) * .29
        m.leaf((x, .05, 1.37 - .62 * abs(x)), 1.25 * i, .4, .3, .25, LEAF[:3])
    return m


def giant_pumpkin():
    m = Grove('pumpkin')
    pumpkin(m, 0, 0, -.03, 1)
    return m


def cabbage():
    m = Grove('cabbage')
    m.rock((0, 0, .68), (.72, .71, .72), LEAF[1:], 32, 2)
    for i in range(7):
        angle = i * 2 * pi / 7
        m.leaf((cos(angle) * .42, sin(angle) * .42, .08), angle + pi, .84, .64,
               1.04 + .09 * (i % 3), LEAF)
        m.leaf((0, 0, .12), angle, .97, .55, .4)
    return m


def root_wall():
    m = Grove('root_wall')
    m.box(BARK[0], (3, 1.95, 4.9), (0, 0, 2.45))
    for k, x in enumerate((-.76, .55)):
        for side in (-1, 1):
            m.tube([((x - .17, side * .79, 0), .33), ((x + .25, side * .91, 2.35), .29),
                    ((x - .13, side * .71, 4.62), .28), ((x + .20, side * .42, 5.02), .17)], BARK, 5)
        m.leaf((x, 0, 4.74), k * 2.4, 1.05, .69, .38, LEAF[:4])
    return m

def water_tower():
    m = Grove('water_tower')
    # The existing tower support fills a six-metre-square collision footprint.
    m.box(BARK[0], (5.93, 5.93, 17.48), (0, 0, 8.74), bevel=.33)
    for i in range(8):
        x = (i - 3.5) * .72
        for side in (-1, 1):
            color = BARK[1 + (i + side) % 3]
            m.box(color, (.7, .19, 16.9), (x, side * 2.88, 8.57), bevel=.035)
            m.box(color, (.19, .7, 16.9), (side * 2.88, x, 8.57), bevel=.035)
    for z in (.5, 5.68, 11.25, 16.15):
        m.box(TEAL[0], (5.96, 5.96, .22), (0, 0, z), bevel=.11)
    for k in range(4):
        a = k * pi / 2 + pi / 4
        x, y = cos(a), sin(a)
        m.beam((x * 2.9, y * 2.9, 0), (x * 2.2, y * 2.2, 17.7), .43)
        b = a + pi / 2
        m.beam((x * 2.72, y * 2.72, 4), (cos(b) * 2.28, sin(b) * 2.28, 16.6), .23)
    m.cyl(TEAL[0], 4.35, 2.5, (0, 0, 16.5), r2=5.32, seg=10, smooth=False)
    m.cyl(TEAL[1], 5.36, 6.3, (0, 0, 18.9), seg=10, smooth=False)
    for z in (19.0, 22.1, 24.9):
        m.cyl(BARK[1], 5.48, .31, (0, 0, z), seg=10, smooth=False)
    m.cyl(ORANGE[1], 5.7, 2.98, (0, 0, 25.2), r2=.7, seg=10, smooth=False)
    for i in range(8):
        a = i * pi / 4
        m.leaf((cos(a) * 2.4, sin(a) * 2.4, 27), a, 3.64, 2.15, .56)
    return m


MAKERS = (
    tree, pines, hedge, orchard_rise, orchard_barn, orchard_windmill, lambda: vehicle('truck'), lambda: vehicle('tractor', tractor=True), scarecrow,
    tower, shed, hay, silo, beanstalk, leaf_step, gazebo, topiary, bridge, crate, greenhouse_frame,
    greenhouse_roof, greenhouse_glass, planter, nest, arch, wide_root_arch, totem, bloom, pod, patch, crops, lantern, reeds, stones,
    water_tower, giant_pumpkin, cabbage, root_wall, timber_ramp, barn_roof, stockade, boulder,
)


def main():
    # Preserve the separate campaign polish GLBs when rebuilding only the expansion.
    expansion = {tree, hedge, orchard_rise, orchard_barn, orchard_windmill, greenhouse_frame, root_wall, wide_root_arch}
    expansion_only = '--expansion-only' in sys.argv
    clear_scene()
    bpy.context.preferences.filepaths.save_version = 0
    for i, make in enumerate(MAKERS):
        obj = make().build()
        if not expansion_only or make in expansion:
            export([obj], 'props', obj.name, compressed=True)
        obj.location = ((i % 6) * 13, (i // 6) * 13, 0)
        # Keep very large landmarks readable beside the rest of the source kit.
        obj.scale *= min(1.0, 10.0 / max(obj.dimensions))
        obj.asset_mark()
    scene = bpy.context.scene
    scene.name = 'Vegetable Grove | Asset Library'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            region = area.spaces.active.region_3d
            region.view_location = (32, 26, 2)
            region.view_distance = 95
            region.view_rotation = Vector((-0.2, 1, -.82)).to_track_quat('-Z', 'Y')
            area.spaces.active.shading.color_type = 'VERTEX'
    root = Path(__file__).resolve().parents[1]
    bpy.ops.wm.save_as_mainfile(filepath=str(root / 'vegetable_grove.blend'), compress=True)


if __name__ == '__main__':
    main()
