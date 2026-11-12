"""Build the Blockchain Void kit with Blender --background --python."""
from math import atan2, cos, degrees, pi, sin
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_cartoon_kit import Model, clear_scene, export, srgb

INK = 0x1C2036
IRON = 0x353852
STEEL = 0x525979
LIP = 0x777B98
PURPLE = (0x2D1A42, 0x4C265E, 0x633274, 0x833987)
AMBER = (0xB25A22, 0xEA8F26, 0xFFBB40, 0xFFF0A2)
CYAN = (0x146878, 0x22B1BD, 0x5AEBE3, 0xB9FFF4)
GREEN = (0x268949, 0x52C836, 0xA2F746, 0xE1FF88)
PINK = (0x8D2467, 0xCB397E, 0xF55EAB, 0xFFAFDB)


class Void(Model):
    def __init__(self, name):
        super().__init__(f'void_{name}', outline=0)

    def facets(self, verts, faces, colors):
        start = len(self.verts)
        self.verts.extend(verts)
        for face, color in zip(faces, colors, strict=True):
            self.faces.append([start + i for i in face])
            self.colors.append(srgb(color))
            self.smooth.append(False)

    def beam(self, a, b, width, color, depth=None, bevel=0):
        start, end = Vector(a), Vector(b)
        axis = end - start
        rot = axis.to_track_quat('Z', 'Y').to_euler()
        return self.box(color, (width, depth or width, axis.length), (start + end) * .5,
                        rot=tuple(degrees(v) for v in rot), bevel=bevel)

    def ring(self, radius, half_width, z, height, colors, sides=12, phase=0):
        verts = []
        for h, r in [(z, radius - half_width), (z, radius + half_width),
                     (z + height, radius - half_width), (z + height, radius + half_width)]:
            verts.extend((r * cos(i * 2 * pi / sides + phase), r * sin(i * 2 * pi / sides + phase), h)
                         for i in range(sides))
        faces, palette = [], []
        for i in range(sides):
            j = (i + 1) % sides
            n = sides
            faces.extend(((i, j, j + n, i + n), (i + n, j + n, j + 3 * n, i + 3 * n),
                          (i + 2 * n, i + 3 * n, j + 3 * n, j + 2 * n), (i, i + 2 * n, j + 2 * n, j)))
            palette.extend((colors[0], colors[i % len(colors)], colors[(i + 1) % len(colors)], colors[0]))
        self.facets(verts, faces, palette)

    def jewel(self, at, r, h, colors, angle=0):
        x, y, z = at
        verts = [(x + cos(i * pi / 3 + angle) * r * .75, y + sin(i * pi / 3 + angle) * r * .75, z)
                 for i in range(6)]
        verts.extend((x + cos(i * pi / 3 + angle) * r + h * .12, y + sin(i * pi / 3 + angle) * r, z + h * .69)
                     for i in range(6))
        verts.append((x + h * .24, y - h * .07, z + h))
        faces = [tuple(reversed(range(6)))]
        palette = [colors[0]]
        for i in range(6):
            j = (i + 1) % 6
            faces.extend(((i, j, j + 6, i + 6), (i + 6, j + 6, 12)))
            palette.extend((colors[i % len(colors)], colors[(i + 1) % len(colors)]))
        self.facets(verts, faces, palette)


def deck():
    m = Void('deck')
    # The unit footprint is 2 x 2 and the walking surface is exactly one unit up.
    m.box(INK, (2, 2, .94), (0, 0, .47), bevel=.08)
    for i in range(2):
        for j in range(2):
            x, y = (i - .5) * .975, (j - .5) * .975
            m.box((STEEL, IRON, 0x464D6B)[(i * 2 + j) % 3], (.959, .959, .09), (x, y, .955), bevel=.035)
    for side in (-1, 1):
        for a in (-.69, .69):
            m.box(AMBER[1], (.22, .175, .46), (a, side * .908, .76), bevel=.036)
            m.box(AMBER[1], (.175, .22, .46), (side * .908, a, .76), bevel=.036)
        m.box(CYAN[2], (.94, .025, .1), (0, side * .977, .69), bevel=.011)
        m.box(CYAN[1], (.025, .94, .1), (side * .977, 0, .69), bevel=.011)
    return m


def bulkhead():
    m = Void('bulkhead')
    m.box(INK, (2, 1.88, 1), (0, 0, .5), bevel=.09)
    for s in (-1, 1):
        for i in range(3):
            x = (i - 1) * .65
            m.box(STEEL if i % 2 else IRON, (.62, .054, .66), (x, s * .97, .51), bevel=.023)
        for x in (-.9, .9):
            m.box(AMBER[1], (.15, .04, .87), (x, s * .97, .5), bevel=.016)
        m.box(CYAN[2], (1.57, .04, .046), (0, s * .974, .86), bevel=.012)
        m.box(LIP, (1.6, .047, .06), (0, s * .977, .13), bevel=.012)
    return m


def blast_shield():
    m = Void('shield')
    m.box(INK, (2, 1.86, .98), (0, 0, .49), bevel=.13)
    for s in (-1, 1):
        m.box(STEEL, (1.62, .06, .14), (0, s * .958, .85), bevel=.018)
        m.box(IRON, (1.6, .06, .12), (0, s * .967, .2), bevel=.018)
        for i in range(4):
            x = (i - 1.5) * .33
            a, b = x - .19, x + .19
            verts = [(a, s * .992, .3), (a + .19, s * .992, .74),
                     (b + .07, s * .992, .74), (b - .12, s * .992, .3)]
            m.facets(verts, [(0, 1, 2, 3) if s > 0 else (3, 2, 1, 0)], [AMBER[2]])
        for x in (-.86, .86):
            m.box(AMBER[1], (.24, .12, .92), (x, s * .929, .48), bevel=.045)
            m.box(LIP, (.12, .026, .14), (x, s * .997, .61), bevel=.017)
    return m


def apron():
    m = Void('apron')
    m.box(IRON, (2, 2, 1), (0, 0, .5), bevel=.05)
    for y in (-.8, .8):
        m.box(CYAN[1], (1.94, .075, .015), (0, y, 1), bevel=.003)
    for i in range(3):
        x = (i - 1) * .62
        for side in (-1, 1):
            m.beam((x - .21, side * .29, 1.004), (x + .13, 0, 1.004), .05, AMBER[2], .013)
    return m


def landing():
    m = Void('landing')
    m.cyl(INK, .83, .22, (0, 0, 0), r2=.97, seg=12, smooth=False)
    m.cyl(IRON, .97, .62, (0, 0, .22), r2=.995, seg=12, smooth=False)
    m.cyl(STEEL, .994, .16, (0, 0, .84), r2=.95, seg=12, smooth=False)
    m.ring(.817, .048, .99, .012, CYAN[1:], sides=12)
    m.ring(.375, .025, .997, .009, AMBER[1:], sides=6)
    for i in range(8):
        a = i * pi / 4
        m.box(AMBER[1], (.12, .26, .31), (.91 * cos(a), .91 * sin(a), .79),
              rot=(0, 0, degrees(a)), bevel=.035)
        m.box(CYAN[2], (.018, .13, .085), (.961 * cos(a + .22), .961 * sin(a + .22), .64),
              rot=(0, 0, degrees(a + .22)), bevel=.007)
    return m


def rockfall():
    m = Void('rockfall')
    # A tapered underside. The attachment plane is z=1.
    rng = Random(219)
    n = 9
    verts = [(.12, -.16, 0)]
    for level, radius in [(.32, .48), (.64, .77), (1, 1)]:
        for i in range(n):
            a = i * 2 * pi / n + level * .19
            r = radius * rng.uniform(.82, 1)
            verts.append((r * cos(a), r * sin(a), level if level == 1 else level + rng.uniform(-.12, .08)))
    faces = [(0, (i + 1) % n + 1, i + 1) for i in range(n)]
    for j in range(2):
        for i in range(n):
            a, b = 1 + j * n + i, 1 + j * n + (i + 1) % n
            faces.extend(((a, b, b + n), (a, b + n, a + n)))
    faces.append(tuple(range(1 + 2 * n, 1 + 3 * n)))
    m.facets(verts, faces, rng.choices(PURPLE, weights=(2, 4, 3, 1), k=len(faces)))
    return m


def asteroid():
    m = Void('asteroid')
    for i, (x, y, z, r) in enumerate([(0, 0, .64, .66), (-.36, .26, .54, .39), (.29, -.31, .57, .37)]):
        m.ico(PURPLE[i + 1], r, (x, y, z), scale=(1, .9, .78), sub=1)
    m.jewel((-.15, .11, .85), .16, .56, (0x684398, 0xA267D7, 0xC995F6), .3)
    return m


def crystal():
    m = Void('crystal')
    for x, y, r in [(-.4, -.06, .43), (.48, .06, .42), (.05, .3, .64)]:
        m.ico(PURPLE[2], r, (x, y, r * .47), scale=(1, .83, .58))
    m.jewel((-.43, -.08, .21), .21, .9, CYAN, .1)
    m.jewel((-.07, .16, .25), .34, 1.46, (0x632895, 0x9D51CF, 0xD68CF2), .45)
    m.jewel((.32, -.23, .22), .22, .83, PINK, .6)
    m.jewel((.45, .19, .18), .16, .58, CYAN, .25)
    return m


def candle(name, palette):
    m = Void(name)
    m.box(palette[0], (1.88, 1.88, 1), (0, 0, .5), bevel=.035)
    for side in (-1, 1):
        m.box(palette[1], (1.84, .035, .78), (0, side * .977, .52), bevel=.02)
        m.box(palette[2], (.033, 1.83, .78), (side * .979, 0, .52), bevel=.02)
        for offset in (-.78, .78):
            m.box(palette[3], (.055, .019, .77), (offset, side * .999, .52), bevel=.007)
            m.box(palette[1], (.019, .055, .77), (side * .999, offset, .52), bevel=.007)
    for z in (.065, .91):
        m.box(IRON, (2, 2, .1), (0, 0, z), bevel=.039)
        for side in (-1, 1):
            for x in (-.63, .63):
                m.box(STEEL, (.14, .032, .058), (x, side * .982, z), bevel=.018)
    m.box(palette[3], (1.68, 1.68, .043), (0, 0, .978), bevel=.02)
    return m


def bridge():
    m = Void('bridge')
    m.box(CYAN[0], (2, 2, .94), (0, 0, .47), bevel=.072)
    for i in range(3):
        x = (i - 1) * .64
        m.box(CYAN[(i % 2) + 1], (.618, 1.89, .15), (x, 0, .925), bevel=.041)
        m.box(CYAN[3], (.033, 1.78, .022), (x - .29, 0, .985), bevel=.006)
    for y in (-.96, .96):
        m.box(CYAN[3], (1.93, .065, .16), (0, y, .85), bevel=.012)
    return m


def cargo():
    m = Void('cargo')
    m.box(IRON, (1.87, 1.87, 1), (0, 0, .5), bevel=.09)
    for s in (-1, 1):
        m.box(AMBER[1], (1.75, .08, .68), (0, s * .944, .51), bevel=.045)
        m.box(AMBER[0], (.076, 1.75, .69), (s * .951, 0, .51), bevel=.041)
        m.beam((-.65, s * .982, .23), (.65, s * .982, .77), .12, AMBER[2], .04)
        m.beam((s * .982, -.65, .23), (s * .982, .65, .77), .12, AMBER[1], .04)
        for a in (-.855, .855):
            m.box(STEEL, (.25, .25, .963), (s * .857, a, .5), bevel=.044)
    m.box(AMBER[2], (1.35, 1.39, .06), (0, 0, .97), bevel=.027)
    return m


def server():
    m = Void('server')
    m.box(INK, (2, 1.87, 1), (0, 0, .5), bevel=.075)
    for side in (-1, 1):
        m.box(IRON, (1.67, .053, .83), (0, side * .963, .52), bevel=.042)
        for i in range(5):
            z = .22 + .129 * i
            m.box(LIP, (1.25, .056, .056), (-.09, side * .976, z), bevel=.01)
            m.box(CYAN[(i % 2) + 1], (.3, .034, .038), (.58, side * .994, z), bevel=.008)
        m.box(AMBER[2], (.36, .044, .056), (0, side * .974, .91), bevel=.014)
    return m


def shelter():
    m = Void('shelter')
    m.box(INK, (2, 1.84, .96), (0, 0, .48), bevel=.105)
    m.box(STEEL, (1.97, 1.96, .2), (0, 0, .89), bevel=.087)
    for sign in (-1, 1):
        m.box(IRON, (1.62, .063, .65), (0, sign * .966, .46), bevel=.066)
        m.box(CYAN[2], (1.21, .06, .105), (0, sign * .969, .68), bevel=.022)
        for x in (-.74, .74):
            m.box(AMBER[1], (.16, .066, .45), (x, sign * .963, .38), bevel=.034)
    return m


def ticker():
    m = Void('ticker')
    m.box(INK, (1.85, 2, 1), (0, 0, .5), bevel=.095)
    for s in (-1, 1):
        m.box(STEEL, (.075, 1.82, .8), (s * .963, 0, .53), bevel=.035)
        for i, h in enumerate((.16, .34, .26, .48, .41, .54, .64)):
            y = (i - 3) * .22
            m.box((GREEN[2], CYAN[2], PINK[2])[i % 3], (.034, .13, h), (s * .991, y, .17 + h / 2), bevel=.008)
    return m


def relay():
    m = Void('relay')
    m.cyl(INK, .98, .16, (0, 0, 0), r2=.85, seg=8, smooth=False)
    m.cyl(CYAN[1], .56, .68, (0, 0, .16), r2=.5, seg=8, smooth=False)
    for z in (.29, .49, .69):
        m.cyl(CYAN[3], .69, .058, (0, 0, z), r2=.6, seg=10, smooth=False)
    for i in range(4):
        a = (i + .5) * pi / 2
        m.beam((.78 * cos(a), .78 * sin(a), .13), (.73 * cos(a), .73 * sin(a), .92), .15, STEEL, bevel=.02)
    m.cyl(IRON, .81, .14, (0, 0, .86), r2=.72, seg=8, smooth=False)
    m.cyl(AMBER[2], .4, .026, (0, 0, .973), seg=8, smooth=False)
    return m


def pylon():
    m = Void('pylon')
    m.cyl(INK, .91, .48, (0, 0, 0), r2=.84, seg=6, smooth=False)
    m.cyl(STEEL, .72, 4.64, (0, 0, .36), r2=.64, seg=6, smooth=False)
    m.cyl(AMBER[1], .84, .25, (0, 0, 4.68), seg=6, smooth=False)
    m.jewel((0, 0, 4.94), 1.04, 2.36, AMBER[1:])
    for k in range(3):
        a = k * 2 * pi / 3 + .2
        x, y = cos(a), sin(a)
        m.beam((x * .76, y * .76, .21), (x * .57, y * .57, 4.63), .25, IRON, bevel=.045)
        m.beam((x * .65, y * .65, 1.42), (x * .66, y * .66, 3.72), .095, CYAN[2])
    return m


def terminal():
    m = Void('terminal')
    m.cyl(INK, .69, .13, (0, 0, 0), r2=.52, seg=6, smooth=False)
    m.beam((0, 0, .13), (0, .1, 1.2), .34, IRON, bevel=.043)
    m.box(STEEL, (1.2, .75, .71), (0, -.04, 1.34), rot=(17, 0, 0), bevel=.08)
    m.box(CYAN[0], (.9, .069, .45), (0, -.423, 1.35), rot=(17, 0, 0), bevel=.041)
    for i in range(3):
        m.box(CYAN[3], (.18, .04, .08), ((i - 1) * .25, -.47, 1.41), bevel=.016)
    return m


def sign():
    m = Void('sign')
    m.box(INK, (2, 1.83, 1), (0, 0, .5), bevel=.088)
    for side in (-1, 1):
        m.box(CYAN[0], (1.73, .085, .8), (0, side * .936, .53), bevel=.05)
        for x in (-.44, 0, .44):
            y = side * .99
            pts = [(x - .16, y, .26), (x + .02, y, .26), (x + .23, y, .53),
                   (x + .02, y, .8), (x - .16, y, .8), (x + .05, y, .53)]
            m.facets(pts, [(0, 1, 2, 3, 4, 5) if side < 0 else (5, 4, 3, 2, 1, 0)], [CYAN[3]])
    return m


def jetpack():
    m = Void('jetpack')
    m.box(IRON, (.68, .23, .71), (0, .06, .54), bevel=.061)
    m.box(STEEL, (.49, .14, .55), (0, -.094, .52), bevel=.046)
    m.box(CYAN[2], (.29, .05, .24), (0, -.17, .58), bevel=.028)
    for x in (-.32, .32):
        m.cyl(INK, .166, .12, (x, 0, 0), r2=.133, seg=8, smooth=False)
        m.cyl(AMBER[1], .132, .58, (x, 0, .112), r2=.143, seg=8, smooth=False)
        m.cyl(STEEL, .158, .10, (x, 0, .233), seg=8, smooth=False)
        m.cyl(CYAN[1], .134, .13, (x, 0, .683), r2=.065, seg=8, smooth=False)
        m.beam((x * .51, .157, .71), (x * .49, .258, .38), .064, INK, .071, .015)
    return m


def fuel():
    m = Void('fuel')
    m.cyl(INK, .98, .1, (0, 0, 0), r2=.91, seg=8, smooth=False)
    m.ring(.82, .08, .089, .042, CYAN[1:], sides=8)
    m.ring(.47, .038, .1, .039, AMBER[1:], sides=6)
    m.facets([(-.04, -.32, .143), (-.18, .065, .143), (.012, .018, .143), (.04, .31, .143),
              (.19, -.08, .143), (-.013, -.018, .143)], [(5, 4, 3, 2, 1, 0)], [CYAN[3]])
    return m


def vent():
    m = Void('vent')
    m.cyl(INK, .97, .77, (0, 0, 0), r2=.99, seg=12, smooth=False)
    m.cyl(IRON, .97, .18, (0, 0, .77), r2=.94, seg=12, smooth=False)
    m.ring(.86, .056, .96, .04, CYAN[1:])
    for k in range(5):
        y = (k - 2) * .26
        m.box(LIP, (1.52 - abs(k - 2) * .19, .115, .044), (0, y, .968), bevel=.02)
    return m


def rail():
    m = Void('rail')
    m.box(INK, (2, 2, .91), (0, 0, .455), bevel=.05)
    m.box(CYAN[1], (1.975, 1.38, .12), (0, 0, .935), bevel=.042)
    for x in (-.59, .59):
        m.box(AMBER[1], (.17, 1.98, .12), (x, 0, .935), bevel=.029)
    return m


def vault():
    m = Void('vault')
    # Game-facing aperture is six metres wide, with a four-metre door below the lintel.
    for s in (-1, 1):
        m.box(INK, (8.98, 1.0, 4.98), (s * 7.5, 0, 2.49), bevel=.14)
        for i in range(3):
            x = s * (4.62 + i * 2.83)
            m.box(STEEL, (2.73, .18, 4.3), (x, -.53, 2.53), bevel=.095)
            m.box(CYAN[2], (.22, .14, 2.26), (x, -.64, 2.52), bevel=.041)
        m.box(AMBER[1], (.36, .35, 4.3), (s * 3.2, -.56, 2.16), bevel=.084)
        for i in range(3):
            m.box(AMBER[2], (.59, .28, .46), (s * (4.2 + i * .91), -.61, 4.68), bevel=.057)
    m.box(IRON, (24, .86, .89), (0, -.04, 5.1), bevel=.12)
    for i in range(3):
        m.box(AMBER[2], (1.28, .13, .32), ((i - 1) * 1.57, -.52, 5.12), bevel=.058)
    return m


def ledger():
    m = Void('ledger')
    m.cyl(INK, 1, .12, (0, 0, 0), r2=.96, seg=12, smooth=False)
    m.cyl(IRON, .957, .81, (0, 0, .12), r2=.94, seg=12, smooth=False)
    m.cyl(STEEL, 1, .07, (0, 0, .93), seg=12, smooth=False)
    for i in range(12):
        a = i * 2 * pi / 12
        x, y = cos(a), sin(a)
        m.box(STEEL, (.13, .28, .79), (.91 * x, .91 * y, .524),
              rot=(0, 0, degrees(a)), bevel=.033)
        for z in (.3, .56, .77):
            m.box(CYAN[2] if i % 3 else AMBER[2], (.045, .22, .077), (.976 * x, .976 * y, z),
                  rot=(0, 0, degrees(a)), bevel=.009)
    m.ring(.82, .035, .995, .01, CYAN[1:])
    return m


def gantry():
    m = Void('gantry')
    for x in (-.83, .83):
        m.box(INK, (.34, .89, .22), (x, 0, .11), bevel=.06)
        m.beam((x, 0, .13), (x * .62, 0, .96), .24, IRON, .29, .055)
        m.beam((x, -.18, .24), (x * .65, -.18, .88), .057, AMBER[2], .07)
    m.box(STEEL, (1.28, .54, .18), (0, 0, .92), bevel=.053)
    m.box(AMBER[2], (.47, .16, .051), (0, -.274, .899), bevel=.014)
    return m


def beacon():
    m = Void('beacon')
    m.cyl(INK, .54, .26, (0, 0, 0), r2=.44, seg=6, smooth=False)
    m.cyl(STEEL, .26, .95, (0, 0, .24), r2=.23, seg=6, smooth=False)
    m.cyl(AMBER[2], .29, .23, (0, 0, 1.16), seg=6, smooth=False)
    m.cyl(INK, .35, .12, (0, 0, 1.36), r2=.24, seg=6, smooth=False)
    return m


def supply():
    m = Void('supply')
    m.box(AMBER[1], (1.67, 1.66, 1.35), (0, 0, .71), bevel=.11)
    for i in range(4):
        a = (i + .5) * pi / 2
        x, y = cos(a), sin(a)
        m.beam((x * 1.04, y * 1.04, .15), (x * 1.05, y * 1.05, 1.33), .22, STEEL, bevel=.035)
        m.beam((x * 1.06, y * 1.06, 1.36), (0, 0, 2.55), .061, LIP)
    m.box(IRON, (.33, .35, .23), (0, 0, 2.61), bevel=.058)
    m.box(AMBER[2], (.41, .39, .17), (0, 0, 2.77), bevel=.065)
    return m


def halo():
    m = Void('halo')
    m.ring(14.9, 1.02, 3, 1.48, (INK, IRON, STEEL), sides=24)
    m.ring(14.84, .34, 2.925, .12, (AMBER[1], AMBER[2], AMBER[0]), sides=24)
    m.ring(4.78, .58, 3.04, 1.19, (IRON, STEEL, LIP), sides=12)
    m.ring(4.45, .31, 2.98, .13, AMBER[1:], sides=12)
    m.cyl(AMBER[2], 1.22, 3.26, (0, 0, .18), r2=1.48, seg=10, smooth=False)
    for z in (0, .79, 2.1, 3.27):
        m.cyl(AMBER[1], 1.88, .21, (0, 0, z), r2=1.61, seg=10, smooth=False)
    for i in range(8):
        a = i * 2 * pi / 8
        x, y = cos(a), sin(a)
        m.beam((4.68 * x, 4.68 * y, 3.36), (14.49 * x, 14.49 * y, 3.77), .88, IRON, bevel=.13)
        m.box(STEEL, (1.78, 2.2, 1.7), (15.02 * x, 15.02 * y, 3.77), rot=(0, 0, degrees(a)), bevel=.17)
        m.box(CYAN[2], (.17, 1.2, .25), (15.9 * x, 15.9 * y, 3.42), rot=(0, 0, degrees(a)), bevel=.045)
    return m


def vortex():
    m = Void('vortex')
    for i in range(3):
        radius = (5.2, 8.4, 11.4)[i]
        m.ring(radius, .17 + i * .025, .28 - i * .14, .062, (CYAN[1], PURPLE[3], CYAN[2], PINK[1]), sides=20, phase=i * .12)
    m.ico(0x452275, 2.4, (0, 0, -2.8), scale=(1, 1, 1.18), sub=2)
    m.jewel((-.46, .27, -2.4), .92, 3.12, (0x7247BE, 0xA86BEE, CYAN[3]))
    return m


MAKERS = (
    deck, bulkhead, blast_shield, apron, landing, rockfall, asteroid, crystal, bridge, cargo,
    server, shelter, ticker, relay, pylon, terminal, sign, jetpack, fuel, vent, rail, vault, ledger,
    gantry, beacon, supply, halo, vortex,
    lambda: candle('candle_up', GREEN), lambda: candle('candle_down', PINK),
)


def main():
    clear_scene()
    bpy.context.preferences.filepaths.save_version = 0
    for i, make in enumerate(MAKERS):
        obj = make().build()
        export([obj], 'props', obj.name, compressed=True)
        obj.location = ((i % 6) * 9, (i // 6) * 9, 0)
        obj.scale *= min(1, 7.5 / max(obj.dimensions))
        obj.asset_mark()
    bpy.context.scene.name = 'Blockchain Void | Asset Library'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.color_type = 'VERTEX'
            region = area.spaces.active.region_3d
            region.view_location = (22, 18, 1)
            region.view_distance = 69
            region.view_rotation = Vector((-.24, 1, -.83)).to_track_quat('-Z', 'Y')
    path = Path(__file__).resolve().parents[1] / 'blockchain_void.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(path), compress=True)


if __name__ == '__main__':
    main()
