"""Bake the Level 1–3 art upgrades into the campaign prop GLBs and an editable Blender library."""
from math import cos, degrees, pi, sin
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_cartoon_kit as city
import build_grove_kit as grove

DARK = 0x252737
STEEL = 0x6E7894
CREAM = 0xFFE7B2
COPPER = 0xAC603B
AMBER = 0xFFD16F
MINT = 0x41FFBE
AQUA = 0x57E7F1
SCENE_END = 97
MATERIALS = {}


def luminous(obj, model, palette):
    for material_name, parts, tint, strength in palette:
        if material_name not in MATERIALS:
            mat = city.kit_material().copy()
            mat.name = f'campaign_glow_{material_name}'
            shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
            shader.inputs['Emission Color'].default_value = (*city.srgb(tint), 1.0)
            shader.inputs['Emission Strength'].default_value = strength
            MATERIALS[material_name] = mat
        index = len(obj.data.materials)
        obj.data.materials.append(MATERIALS[material_name])
        colors = {city.srgb(color) for color in parts}
        for face, color in zip(obj.data.polygons, model.colors, strict=True):
            if color in colors:
                face.material_index = index
    return obj


WARM = ('warm', (AMBER,), 0xFFB44B, 1.05)
COOL = ('aqua', (AQUA,), 0x42D9FF, 1.15)
SIGNAL = ('signal', (MINT,), 0x46FFB1, 1.3)


def bake(model, *palette):
    return luminous(model.build(), model, palette)


def beam(model, color, a, b, width, depth=None):
    start, end = Vector(a), Vector(b)
    axis = end - start
    rot = axis.to_track_quat('Z', 'Y').to_euler()
    model.box(color, (width, depth or width, axis.length), (start + end) * .5,
              rot=tuple(degrees(v) for v in rot), bevel=min(width * .18, .05), hull=False)


def ring(model, color, r, width, z, segments=24, depth=.025):
    """A flat annular surface with a narrow wall. Its centre is open."""
    start = len(model.verts)
    for height in (z - depth / 2, z + depth / 2):
        for radius in (r - width / 2, r + width / 2):
            for i in range(segments):
                angle = 2 * pi * i / segments
                model.verts.append((radius * cos(angle), radius * sin(angle), height))
    n = segments
    for i in range(n):
        j = (i + 1) % n
        for face in ((i, j, j+n, i+n), (i+n, j+n, j+3*n, i+3*n),
                     (i+2*n, i+3*n, j+3*n, j+2*n), (i, i+2*n, j+2*n, j)):
            model.faces.append([start + index for index in face])
            model.colors.append(city.srgb(color))
            model.smooth.append(False)


def bob(obj, z, amplitude, phase=0, turn=0):
    for i in range(9):
        a = i * pi / 4
        city.key(obj, 1 + i * 12, loc=(0, 0, z + amplitude * sin(a + phase)),
                 scale=1 + .07 * sin(a + phase), rot=(0, 0, turn * a))
    return obj


def motor():
    m = city.Model('machine')
    m.box(0x434960, (3.78, 3.78, 1.96), (0, 0, .98), bevel=.22)
    m.box(STEEL, (3.84, 3.84, .2), (0, 0, .22), bevel=.062)
    m.box(DARK, (3.32, 3.32, .2), (0, 0, 2), bevel=.065)
    m.cyl(0x858EA9, 1.03, .36, (0, 0, 1.98), seg=18, smooth=False)
    ring(m, MINT, .86, .075, 2.342, 18)
    for s in (-1, 1):
        m.box(DARK, (2.58, .07, .82), (0, s * 1.894, 1.06), bevel=.07, hull=False)
        for x in (-.94, -.47, 0, .47, .94):
            m.box(STEEL, (.31, .09, .48), (x, s * 1.944, 1.06), rot=(0, -20, 0), bevel=.025, hull=False)
        m.box(MINT, (.83, .054, .09), (0, s * 1.926, 1.61), bevel=.016, hull=False)
        for y in (-1.26, 1.26):
            m.box(0xE1A244, (.081, .56, .54), (s * 1.91, y, .75), rot=(20, 0, 0), bevel=.034, hull=False)
    core = city.Model('generator_rotor', outline=0)
    core.cyl(DARK, .57, .12, (0, 0, 0), seg=16, smooth=False)
    core.ico(MINT, .31, (0, 0, .23), scale=(1, 1, 1.27), sub=2, hull=False)
    for a in (0, pi / 2, pi, pi * 1.5):
        x, y = cos(a), sin(a)
        beam(core, AMBER, (.49 * x, .49 * y, .13), (.84 * x, .84 * y, .43), .12)
    return [bake(m, SIGNAL), bob(bake(core, SIGNAL, WARM), 2.39, .075, turn=1)]


def fountain():
    m = city.Model('fountain')
    m.cyl(0xA7A6BA, 1.95, .39, (0, 0, 0), r2=1.88, seg=24)
    m.cyl(0x516F9B, 1.72, .035, (0, 0, .4), seg=24, hull=False)
    ring(m, 0xD3D1E2, 1.82, .24, .459, 24, .2)
    ring(m, 0x516783, 1.9, .071, .31, 24, .065)
    m.cyl(0xC7C4D6, .37, 1.12, (0, 0, .34), r2=.27, seg=16)
    m.cyl(0xA8ACCA, .93, .2, (0, 0, 1.33), r2=1.04, seg=20)
    m.cyl(0x62BCDA, .95, .047, (0, 0, 1.53), seg=20, hull=False)
    ring(m, 0xD3D1E2, 1.02, .105, 1.58, 20, .11)
    for j in range(8):
        a = j * pi / 4
        m.box(0x8D8DAB, (.18, .18, .18), (1.65 * cos(a), 1.65 * sin(a), .16), bevel=.028, hull=False)
    splash = city.Model('fountain_water', outline=0)
    splash.cyl(0x78D0EC, .11, .3, (0, 0, -.12), r2=.07, seg=10, hull=False)
    splash.ball(0xC0F6F9, .108, (0, 0, .21), scale=(1, 1, 1.48), seg=12, rings=7, hull=False)
    for i in range(5):
        a = i * 2 * pi / 5
        x, y = cos(a), sin(a)
        beam(splash, 0x78D0EC, (.15 * x, .15 * y, .14), (.48 * x, .48 * y, -.04), .045)
        splash.ball(0xB0F0F7, .052, (.54 * x, .54 * y, -.11), seg=7, rings=5, hull=False)
    return [bake(m), bob(bake(splash), 1.66, .075, turn=.8)]


def water_tank():
    m = city.Model('water_tank')
    m.cyl(0x8FB7C9, 1.35, 1.46, (0, 0, .69), seg=20)
    m.cyl(0x7899AB, 1.43, .34, (0, 0, 2.04), r2=.45, seg=20)
    for z in (.86, 1.48, 1.96):
        m.cyl(0x5F738F, 1.401, .086, (0, 0, z), seg=20, hull=False)
    m.cyl(STEEL, .51, .095, (0, 0, 2.32), seg=14)
    for x, y in ((-1.1, -1.1), (1.1, -1.1), (-1.1, 1.1), (1.1, 1.1)):
        m.box(DARK, (.23, .23, .76), (x, y, .38), bevel=.036)
        beam(m, STEEL, (x, y, .17), (x * .56, y * .56, .79), .1)
    for z in (.39, .72, 1.05, 1.38, 1.71, 2.04):
        m.box(STEEL, (.39, .047, .05), (0, -1.375, z), bevel=.012, hull=False)
    for x in (-.194, .194):
        m.box(DARK, (.049, .069, 1.84), (x, -1.386, 1.12), bevel=.01, hull=False)
    return [bake(m)]


def street_lamp():
    m = city.street_lamp()
    m.cyl(0x65667E, .15, .39, (0, 0, .37), seg=12, hull=False)
    m.cyl(DARK, .135, .16, (0, 0, 4.96), seg=12, hull=False)
    beam(m, STEEL, (0, -.04, 5.1), (0, -.68, 5.58), .07)
    m.box(AMBER, (.27, .55, .045), (0, -1.2, 5.346), bevel=.018, hull=False)
    return [bake(m, WARM)]


def billboard():
    m = city.billboard()
    for x in (-3.57, 3.57):
        m.box(DARK, (.27, .47, 3.12), (x, 0, 7.4), bevel=.055, hull=False)
        for z in (6.1, 8.66):
            m.cyl(STEEL, .082, .056, (x, -.227, z), rot=(90, 0, 0), seg=8, hull=False)
    for y in (-.259, .259):
        for z in (6.06, 8.73):
            m.box(AMBER, (6.85, .025, .055), (0, y, z), bevel=.012, hull=False)
    for x in (-2.4, 2.4):
        beam(m, STEEL, (x, .05, 4.42), (x, .4, 5.84), .12)
    return [bake(m, WARM)]


def kiosk():
    m = city.kiosk()
    for i in range(8):
        a = i * pi / 4
        m.box(0xD36CA4 if i % 2 else 0xFFDEAE, (.47, .13, .12),
              (1.68 * cos(a), 1.68 * sin(a), 1.75), rot=(0, 0, degrees(a) + 90),
              bevel=.025, hull=False)
    for x in (-1.06, 1.06):
        m.box(0x685074, (.23, .059, .66), (x, -1.316, .45), bevel=.036, hull=False)
    m.box(DARK, (1.27, .057, .45), (0, -1.317, .48), bevel=.04, hull=False)
    for i in range(3):
        m.box((MINT, AMBER, MINT)[i], (.22, .02, .045), ((i - 1) * .32, -1.353, .51), hull=False)
    return [bake(m, WARM, SIGNAL)]


def barricade():
    m = city.barricade()
    for side in (-1, 1):
        for y in (-1.52, -.47, .47, 1.52):
            m.box(0x8D7C80, (.08, .16, .16), (side * .37, y, .81), bevel=.027, hull=False)
            m.box(AMBER, (.028, .12, .077), (side * .416, y, .82), bevel=.012, hull=False)
    for y in (-1.5, 1.5):
        m.cyl(DARK, .147, .1, (0, y, 1.88), seg=10, hull=False)
    return [bake(m, WARM, ('hazard', (0xFF5A3D,), 0xFF5B30, .85))]


def toll_booth():
    m = city.toll_booth()
    for s in (-1, 1):
        m.box(DARK, (.065, .09, .62), (.493 * s, 0, 1.31), bevel=.018, hull=False)
        m.box(DARK, (.063, .91, .28), (.5 * s, 0, .57), bevel=.039, hull=False)
        for y in (-.23, 0, .23):
            m.box(AMBER, (.018, .13, .05), (.539 * s, y, .6), bevel=.011, hull=False)
    return [bake(m, WARM, ('toll', (0x39FFB0,), 0x43FFBD, .9))]


def building(name, w, d, h, wall, trim, glass, neon, roof):
    m = city.building(name, w, d, h, wall, trim, glass, neon, roof)
    for s in (-1, 1):
        y = s * (d / 2 + .089)
        for x in (-w * .41, -w * .18, w * .18, w * .41):
            m.box(trim, (.12, .07, 2.49), (x, y, 1.52), bevel=.021, hull=False)
        for x in (-w * .31, w * .31):
            m.box(0x4C526F, (w * .21, .063, .95), (x, y, 1.72), bevel=.028, hull=False)
            m.box(AMBER, (w * .18, .07, .061), (x, y + s * .043, 1.54), hull=False)
        for col in range(max(2, int(w // 2.6))):
            cx = -w / 2 + (col + .5) * w / max(2, int(w // 2.6))
            m.box(trim, (.12, .071, 1.56), (cx, y, 5.2), bevel=.017, hull=False)
    m.box(STEEL, (1.1, 1.4, .14), (w * .2, 0, h + 1.34), bevel=.03, hull=False)
    return [bake(m, WARM, ('store_' + name, (neon,), neon, .85))]


def slide_truck():
    m = city.slide_truck()
    for s in (-1, 1):
        for y in (-3.58, -2.74, 0, .92, 1.9, 2.87, 3.67):
            m.box(0xA8A4B8, (.05, .07, 1.36), (s * 2.075, y, 2.34), bevel=.014, hull=False)
        for y in (-3.92, 3.92):
            m.box(AMBER, (.06, .21, .11), (s * 2.086, y, 1.61), bevel=.02, hull=False)
    return [bake(m, WARM)]


def tent():
    m = city.bazaar_tent()
    for s in (-1, 1):
        for i in range(7):
            x = (i - 3) * .67
            color = 0xB73942 if i % 2 == 0 else 0xE88455
            m.cyl(color, .22, .072, (x, s * 2.54, 1.71), rot=(90, 0, 0), seg=8, hull=False)
            m.cyl(color, .22, .065, (s * 2.57, x, 1.71), rot=(0, 90, 0), seg=8, hull=False)
        for x in (-2.3, 2.3):
            m.cyl(COPPER, .14, .12, (x, s * 2.3, .13), seg=10, hull=False)
    for x in (-1.22, -1.07, 1.07, 1.22):
        m.box(CREAM, (.047, 2.22, .028), (x, 0, .093), hull=False)
    return [bake(m)]


def house():
    m = city.sandstone_house()
    for i in range(4):
        a = i * pi / 2
        c, s = cos(a), sin(a)
        normal = (-s, c)
        for x in (-3, 3):
            for dx in (-.32, 0, .32):
                u = x + dx
                m.box(0xAC7955, (.064, .092, 1.23),
                      (normal[0] * 5.109 + c * u, normal[1] * 5.109 + s * u, 4),
                      rot=(0, 0, degrees(a)), hull=False)
            m.box(0xEFC087, (1.65, .22, .17), (normal[0] * 5.083 + c * x, normal[1] * 5.083 + s * x, 3.27),
                  rot=(0, 0, degrees(a)), bevel=.033, hull=False)
        for z in (.73, 2.89, 5.24):
            for x in (-3.68, 3.68):
                m.box(0xCE9F68, (1.73, .046, .11), (normal[0] * 5.011 + c * x, normal[1] * 5.011 + s * x, z),
                      rot=(0, 0, degrees(a)), hull=False)
    return [bake(m)]


def souk_wall():
    m = city.bazaar_wall()
    for s in (-1, 1):
        for x0 in (-3.5, 3.5):
            for i in range(7):
                a = i * pi / 6
                m.box(0xE9BF86, (.43, .15, .29), (x0 + 1.18 * cos(a), s * 1.098, 3.7 + 1.15 * sin(a)),
                      rot=(0, -degrees(a), 0), bevel=.035, hull=False)
        for x in (-5.69, -1.75, 1.75, 5.69):
            m.box(0xCE9F68, (.9, .084, .14), (x, s * 1.024, 1.19), bevel=.019, hull=False)
    return [bake(m)]


def cart():
    m = city.cart()
    for s in (-1, 1):
        for x in (-.99, -.2, .62):
            m.box(0x78472F, (.12, .054, .47), (x, s * .724, .75), bevel=.024, hull=False)
        for j in range(3):
            m.cyl(0xCAAB76, .051, .035, (-.99 + .8 * j, s * .755, .83),
                  rot=(90 * -s, 0, 0), seg=7, hull=False)
    for i in range(3):
        m.cyl(0xFFD78A, .198, .036, (.78, -.4 + i * .4, 1.2), rot=(0, 90, 0), seg=10, hull=False)
        m.cyl(0x78472F, .073, .041, (.798, -.4 + i * .4, 1.2), rot=(0, 90, 0), seg=8, hull=False)
    return [bake(m)]


def pots():
    m = city.Model('clay_pots', outline=.023)
    for j, (x, y, k) in enumerate(((0, 0, 1), (.75, .3, .7), (-.5, .6, .55))):
        m.ball(0xC9743F, .4 * k, (x, y, .39 * k), scale=(1, 1, 1.12), seg=16, rings=9)
        m.cyl(0xA85A2C, .17 * k, .19 * k, (x, y, .74 * k), r2=.23 * k, seg=16)
        m.cyl(0x693E32, .166 * k, .017 * k, (x, y, .931 * k), seg=12, hull=False)
        m.cyl((0xE9C184, 0x418C83, 0xC85840)[j], .405 * k, .064 * k, (x, y, .38 * k), seg=16, hull=False)
    return [bake(m)]


def bazaar_lantern():
    m = city.Model('lantern_post')
    m.cyl(0x784E37, .132, 3.37, (0, 0, 0), seg=10)
    m.cyl(COPPER, .158, .4, (0, 0, .04), seg=10, hull=False)
    m.box(0x784E37, (.91, .115, .12), (.4, 0, 3.3), bevel=.031)
    beam(m, 0x784E37, (.05, 0, 2.91), (.55, 0, 3.3), .08)
    m.cyl(COPPER, .244, .16, (.77, 0, 2.95), r2=.087, seg=8)
    m.cyl(COPPER, .23, .1, (.77, 0, 2.57), r2=.24, seg=8)
    m.cyl(AMBER, .173, .35, (.77, 0, 2.65), seg=8, hull=False)
    for i in range(4):
        a = i * pi / 2
        x, y = .77 + .19 * cos(a), .19 * sin(a)
        beam(m, 0x7A4931, (x, y, 2.64), (x, y, 3.02), .047)
    return [bake(m, WARM)]


def vat(name, dye):
    m = city.Model(name, outline=.042)
    m.cyl(0xC09468, 1.99, 1.05, (0, 0, 0), r2=2.01, seg=22)
    m.cyl(0x825541, 2.035, .115, (0, 0, .14), seg=22, hull=False)
    m.cyl(dye, 1.86, .062, (0, 0, 1.02), seg=22, hull=False)
    ring(m, 0xDBAE7D, 1.92, .2, 1.115, 22, .18)
    for j in range(16):
        a = j * pi / 8
        x, y = cos(a), sin(a)
        m.box(0xAC7954, (.05, .081, .79), (2.002 * x, 2.002 * y, .63),
              rot=(0, 0, degrees(a)), hull=False)
    bubbles = city.Model(f'{name}_surface', outline=0)
    for i, (x, y, r) in enumerate(((-.75, .23, .112), (.64, -.43, .086), (.16, .69, .143))):
        bubbles.ball(dye, r, (x, y, .049), scale=(1, 1, .8), seg=10, rings=6, hull=False)
        bubbles.ball(CREAM, .029 + i * .008, (x - .023, y + .012, r * .79), seg=7, rings=4, hull=False)
    return [bake(m), bob(bake(bubbles), 1.105, .055, turn=1)]


def well():
    m = city.Model('well', outline=.04)
    m.cyl(0xAF967E, 1.51, 1.14, (0, 0, 0), seg=18)
    m.cyl(0x417C9D, 1.23, .046, (0, 0, 1.135), seg=18, hull=False)
    ring(m, 0xD9B988, 1.41, .28, 1.18, 18, .23)
    for j in range(12):
        a = j * pi / 6
        m.box(0xD1B28E if j % 3 else 0x9D806F, (.08, .53, .41), (1.492 * cos(a), 1.492 * sin(a), .48 + .29 * (j % 2)),
              rot=(0, 0, degrees(a)), bevel=.035, hull=False)
    for x in (-1.32, 1.32):
        m.box(0x78472F, (.21, .23, 2.65), (x, 0, 1.325), bevel=.049)
        beam(m, 0x9F673E, (x, 0, 2.08), (x, .81, 2.5), .105)
    for s in (-1, 1):
        for j in range(8):
            m.box((0xBA4B45, 0xD5684B)[j % 2], (.392, 1.49, .13), ((j - 3.5) * .4, s * .54, 2.73),
                  rot=(-s * 24, 0, 0), bevel=.038)
    m.cyl(0x744832, .11, 2.72, (-1.36, 0, 2.04), rot=(0, 90, 0), seg=10)
    m.cyl(0x634531, .026, .69, (.1, 0, 1.32), seg=6, hull=False)
    ripple = city.Model('well_water_ripple', outline=0)
    ring(ripple, 0x8CC6D3, .62, .023, 0, 18, .009)
    ring(ripple, 0x67A8C7, .84, .02, 0, 18, .008)
    r = bake(ripple)
    for frame, k in ((1, .77), (49, 1.19), (97, .77)):
        city.key(r, frame, loc=(0, 0, 1.187), scale=(k, k, 1))
    return [bake(m), r]


def grove_lantern():
    m = grove.lantern()
    for z in (.26, 2.51):
        m.box(COPPER, (.28, .28, .076), (0, 0, z), bevel=.03)
    for x, y in ((.54, -.177), (.9, -.177), (.54, .177), (.9, .177)):
        m.beam((x, y, 2.066), (1.44 - x, y, 2.389), .027, (COPPER, 0xDD9C60))
    m.cyl(AMBER, .166, .307, (.72, 0, 2.077), seg=8, smooth=False)
    return [bake(m, ('grove_glass', (0xFFCC72, AMBER), 0xFFAB55, 1.35))]


def bloom():
    m = grove.Grove('bloom')
    m.cyl(grove.TEAL[0], .84, .103, (0, 0, 0), r2=.67, seg=13, smooth=False)
    for i in range(7):
        a = i * 2 * pi / 7
        x, y = cos(a), sin(a)
        m.leaf((0, 0, .14), a, .99, .62, .36 + .1 * (i % 3))
        m.beam((x * .24, y * .24, .25), (x * .79, y * .79, .34), .031, grove.LEAF[3:])
        m.gem((x * .3, y * .3, .35), .22, .63, grove.CYAN[:2], 6)
    crystal = grove.Grove('bloom_crystal')
    crystal.gem((0, 0, 0), .42, .97, (0x2394AA, AQUA, 0xB9FFF8), 7)
    for i in range(3):
        a = i * 2 * pi / 3
        crystal.gem((.42 * cos(a), .42 * sin(a), .48 + .11 * i), .051, .137, (0x2394AA, AQUA, 0xB9FFF8), 4)
    return [bake(m), bob(bake(crystal, COOL), .47, .095, turn=1)]


def totem():
    m = grove.Grove('totem')
    m.tube([((0, 0, 0), .78), ((.08, 0, .49), .79), ((-.04, .03, 1.51), .64),
            ((-.04, -.02, 2.66), .63), ((.04, -.04, 3.42), .7), ((0, 0, 3.96), .77)],
           (grove.BARK[0], grove.STONE[0], grove.BARK[1], grove.STONE[1]), 9)
    for k in range(5):
        a = k * 2 * pi / 5
        x, y = cos(a), sin(a)
        m.beam((x * .66, y * .66, .59), (x * .67, y * .67, 1.18), .062, (0x278D9F, AQUA))
        m.beam((x * .57, y * .57, 3.65), (x * .63, y * .63, 4.52), .13, grove.STONE)
        m.rock((x * .67, y * .67, .27), (.23, .21, .25), grove.STONE, k + 72)
    crystal = grove.Grove('totem_crystal')
    crystal.gem((0, 0, 0), .62, 1.26, (0x158996, AQUA, 0xB9FFF8), 7)
    return [bake(m, COOL), bob(bake(crystal, COOL), 3.78, .081, turn=1)]


def leaf_step():
    m = grove.leaf_step()
    for s in (-1, 1):
        for y in (-.92, -.29, .34, .91):
            m.beam((0, y, .525), (s * 1.22, y - .35, .477), .038, grove.LEAF[3:])
    return [bake(m)]


def beanstalk():
    m = grove.beanstalk()
    for k in range(5):
        a = k * 2 * pi / 5 + .27
        points = []
        for j in range(12):
            angle = a + j * .39
            r = 1.46 - .054 * j
            points.append(((r * cos(angle), r * sin(angle), j * 1.84), .087 - .004 * j))
        m.tube(points, (grove.LEAF[1], grove.LEAF[2], grove.LEAF[3]), 5)
    return [bake(m)]


def arch():
    m = grove.arch()
    for s in (-1, 1):
        for k in range(3):
            x, y = s * (2.45 + .16 * k), (k - 1) * .39
            m.leaf((x, y, .19 + k * .13), k * 2.4, 1.11, .78, .42)
        m.tube([((s * 2.66, -.31, .19), .17), ((s * 2.89, -.53, 1.91), .143),
                ((s * 2.42, -.49, 3.87), .11), ((s * 1.84, -.57, 4.99), .076)],
               grove.BARK[1:], 5)
    return [bake(m)]


def greenhouse():
    m = grove.greenhouse_frame()
    for x in (-1.94, 0, 1.94):
        for z in (.81, 3.77, 6.64, 7.72):
            for s in (-1, 1):
                m.box(COPPER, (.187, .044, .17), (x, s * .116, z), bevel=.025, hull=False)
    return [bake(m)]


def gazebo():
    m = grove.gazebo()
    for i in range(6):
        a = i * pi / 3
        x, y = 3.84 * cos(a), 3.84 * sin(a)
        m.cyl(COPPER, .063, .37, (x, y, 3.76), seg=8, smooth=False)
        m.cyl(COPPER, .29, .15, (x, y, 3.68), r2=.093, seg=8, smooth=False)
        m.cyl(AMBER, .186, .3, (x, y, 3.41), seg=8, smooth=False)
        m.cyl(COPPER, .25, .09, (x, y, 3.36), seg=8, smooth=False)
    return [bake(m, WARM)]


def grove_vehicle(tractor=False):
    m = grove.vehicle('tractor' if tractor else 'truck', tractor=tractor)
    if tractor:
        for x in (-.85, .85):
            m.box(DARK, (.92, .084, .31), (1.53, x, 1.25), bevel=.037, hull=False)
            for i in range(4):
                m.box(STEEL, (.096, .032, .244), (1.21 + i * .2, x + .041, 1.25), bevel=.017, hull=False)
    else:
        for x in (-.965, .965):
            for y in (.075, 2.09):
                for z in (1.24, 1.49, 1.72):
                    m.cyl(0xD6AD7C, .043, .036, (x, y, z), rot=(0, 90 if x > 0 else -90, 0),
                          seg=8, smooth=False)
            m.box(0xBAD8D9, (.042, .53, .042), (x, -.47, 1.97), bevel=.012)
    return [bake(m)]


def scarecrow():
    m = grove.scarecrow()
    for i in range(5):
        x = (i - 2) * .11
        m.box(0xDBAF68, (.05, .04, .019), (x, -.338, 1.14 + (i % 2) * .027), rot=(0, -24, 0))
    for s in (-1, 1):
        m.box(COPPER, (.21, .13, .026), (s * .33, -.28, 2.406), rot=(0, -s * 19, 0), bevel=.014)
    return [bake(m)]


def shrine():
    m = city.Model('campaign_shrine')
    m.cyl(0x81718A, .88, .23, (0, 0, 0), seg=12, smooth=False)
    m.cyl(0xAA9CA5, .65, .19, (0, 0, .23), seg=12, smooth=False)
    m.cyl(0xC8BAB7, .28, 1.08, (0, 0, .41), r2=.21, seg=12)
    m.cyl(0xA899A6, .46, .18, (0, 0, 1.48), seg=12, smooth=False)
    ring(m, MINT, .32, .047, 1.661, 12)
    for a in (0, pi / 2, pi, pi * 1.5):
        x, y = cos(a), sin(a)
        beam(m, 0xBDABAA, (.57 * x, .57 * y, .39), (.28 * x, .28 * y, .82), .09)
    core = city.Model('shrine_focus', outline=0)
    core.ico(MINT, .32, (0, 0, 0), scale=(1, 1, 1.26), sub=2, hull=False)
    return [bake(m, SIGNAL), bob(bake(core, SIGNAL), 2.06, .105, turn=1)]


MAKERS = (
    motor, fountain, water_tank, street_lamp, billboard, kiosk, barricade, toll_booth, slide_truck,
    lambda: building('building_a', 13, 9, 15, 0xE88A5A, 0xFFF1C9, 0x3A3F66, 0xFF5EC4, 0xFF4D6D),
    lambda: building('building_b', 10, 9, 21, 0x6F7FC9, 0xD9E3FF, 0x2A2F55, 0x39FFB0, 0x4FE3FF),
    lambda: building('building_c', 15, 9, 11, 0xD9B0E6, 0xFFF1C9, 0x4A3F66, 0xFFD166, 0xFFA21F),
    tent, house, souk_wall, cart, pots, bazaar_lantern, well,
    lambda: vat('dye_vat_red', 0xDA4A54), lambda: vat('dye_vat_teal', 0x32B7A6),
    lambda: vat('dye_vat_gold', 0xF5BC4F), shrine,
    grove_lantern, bloom, totem, beanstalk, leaf_step, arch, greenhouse, gazebo, grove_vehicle,
    lambda: grove_vehicle(tractor=True), scarecrow,
)


def main():
    city.clear_scene()
    MATERIALS.clear()
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = 1, SCENE_END
    props = Path(city.OUT) / 'props'
    for i, make in enumerate(MAKERS):
        objects = make()
        name = objects[0].name
        scene.frame_set(1)
        bpy.context.view_layer.update()
        city.export(objects, 'props', name, animated=len(objects) > 1, compressed=True)
        assert (props / f'{name}.glb.gz').is_file()

        collection = bpy.data.collections.new(name)
        scene.collection.children.link(collection)
        root = bpy.data.objects.new(f'{name} | Editable prop', None)
        collection.objects.link(root)
        for obj in objects:
            collection.objects.link(obj)
            scene.collection.objects.unlink(obj)
            obj.parent = root
        root.location = ((i % 7) * 18, (i // 7) * 18, 0)
        collection.instance_offset = root.location
        collection.asset_mark()
    scene.frame_set(1)
    scene.name = 'Sproto Shooter | Levels 1–3 Art Polish'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            space = area.spaces.active
            space.shading.color_type = 'VERTEX'
            space.region_3d.view_location = (54, 36, 6)
            space.region_3d.view_distance = 152
            space.region_3d.view_rotation = Vector((-.17, 1, -.84)).to_track_quat('-Z', 'Y')
    bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).resolve().parents[1] / 'campaign_art_polish.blend'), compress=True)


if __name__ == '__main__':
    main()
