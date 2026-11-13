"""Build the Moonlit Ruins library and the packed campaign GLBs."""
from math import cos, degrees, pi, sin
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_campaign_polish import MATERIALS, bake, beam, ring
from build_cartoon_kit import Model, clear_scene, export, key, srgb

INK, SLATE, STONE, SILVER = 0x242B4C, 0x4D5878, 0x7987A5, 0x9BAAC1
DARK, MOSS, OLIVE = 0x3E425D, 0x546864, 0x697960
CYAN, LAVENDER, LILAC, ICE = 0x82F9EF, 0xC8A1FF, 0x9661F8, 0xCFFFEF
GLOW = (
    ('moonlit_aqua', (CYAN,), 0x42FFDF, 1.02),
    ('moonlit_ice', (ICE,), 0x9FFFF5, 1.40),
    ('moonlit_violet', (LAVENDER, LILAC), 0xA478FF, .93),
)
FRAMES = range(1, 146, 18)


def model(name):
    return Model('moonlit_' + name, outline=0)


def prism(m, color, points, depth):
    """Extrude an X/Z polygon across the local Y axis."""
    base = len(m.verts)
    n = len(points)
    for y in (-depth / 2, depth / 2):
        m.verts.extend((x, y, z) for x, z in points)
    faces = ([base + i for i in range(n)],
             [base + n + i for i in reversed(range(n))],
             *([base + i, base + i + n, base + (i + 1) % n + n, base + (i + 1) % n] for i in range(n)))
    for face in faces:
        m.faces.append(face)
        m.colors.append(srgb(color))
        m.smooth.append(False)


def arc(m, color, outer, inner, start, stop, count, depth, center=(0, 0), gap=0):
    cx, cz = center
    step = (stop - start) / count
    for i in range(count):
        a, b = start + i * step + gap, start + (i + 1) * step - gap
        points = [(cx + r * cos(t), cz + r * sin(t)) for r, t in
                  ((outer, a), (outer, b), (inner, b), (inner, a))]
        prism(m, color if not isinstance(color, list) else color[i % len(color)], points, depth)


def crescent(m, color, radius, z, depth, count=13):
    for i in range(count):
        a = .54 + i * (2 * pi - 1.08) / count
        b = .54 + (i + 1) * (2 * pi - 1.08) / count
        def inner(t):
            return radius * (.89 + .09 * cos(t))
        prism(m, color, [(radius * cos(a), z + radius * sin(a)),
                         (radius * cos(b), z + radius * sin(b)),
                         (inner(b) * cos(b), z + inner(b) * sin(b)),
                         (inner(a) * cos(a), z + inner(a) * sin(a))], depth)


def grass(m, rng, x, y, z):
    for _ in range(7):
        spread = rng.uniform(-.32, .32)
        m.ico(MOSS if rng.random() < .5 else OLIVE, .14, (x + spread, y + rng.uniform(-.23, .23), z),
              scale=(1.05, .46, rng.uniform(.3, .72)))


def wall():
    """Two units wide and deep and one tall, with shallow chipped masonry."""
    m = model('wall')
    m.box(SLATE, (2, 2, .93), (0, 0, .465), bevel=.034)
    for row in range(2):
        for i in range(4):
            x = (i - 1.5) * .49
            m.box((STONE, SLATE, DARK)[(i * 7 + row) % 3], (.47, .13, .30), (x, -.945, .25 + row * .335), bevel=.023)
    m.box(DARK, (2, 2.06, .10), (0, 0, .076), bevel=.02)
    for x, z, width in ((-.75, .92, .50), (-.235, .94, .49), (.27, .91, .48), (.755, .925, .48)):
        m.box(STONE, (width, 2.06, .11), (x, 0, z), bevel=.028)
    return m


def crypt_wall():
    m = model('crypt_wall')
    m.box(DARK, (2, 2, .96), (0, 0, .48), bevel=.028)
    for z, height in ((.07, .10), (.44, .055), (.93, .08)):
        m.box(SLATE, (2, 2.03, height), (0, 0, z), bevel=.016)
    for x in (-.88, 0, .88):
        m.box(STONE, (.075, .11, .79), (x, -.99, .52), bevel=.020)
    return m


def column():
    m = model('column')
    m.box(DARK, (1.97, 1.87, .32), (0, 0, .16), bevel=.13)
    m.box(STONE, (1.66, 1.54, .24), (0, 0, .39), bevel=.08)
    m.cyl(STONE, .65, 4.5, (0, 0, .47), r2=.51, seg=10, smooth=False)
    for i in range(8):
        a = i * pi / 4
        beam(m, SLATE, (.60 * cos(a), .60 * sin(a), .70), (.49 * cos(a), .49 * sin(a), 4.58), .075)
    for z, w in ((4.43, 1.23), (4.73, 1.51), (5.0, 1.76)):
        m.box(STONE if z < 4.9 else SLATE, (w, w * .95, .28), (0, 0, z), bevel=.09)
    return m


def fragment():
    m = model('fragment')
    m.box(SLATE, (2.39, 1.97, .29), (0, 0, .145), bevel=.12)
    m.cyl(STONE, .73, 2.49, (0, 0, .25), r2=.55, seg=9, smooth=False)
    m.ico(DARK, .84, (.12, .08, 2.45), scale=(.80, .79, .48))
    rng = Random(419)
    for _ in range(9):
        x, y = rng.uniform(-1.5, 1.5), rng.uniform(-1.27, 1.27)
        if abs(x) + abs(y) > .82:
            m.ico((SLATE, DARK, STONE)[rng.randrange(3)], rng.uniform(.25, .53), (x, y, .17),
                  scale=(1.42, .82, .65))
    grass(m, rng, .62, -.52, .24)
    grass(m, rng, -.84, .54, .20)
    return m


def ruin_arch():
    m = model('ruin_arch')
    for x in (-2.61, 2.61):
        m.box(DARK, (1.57, 1.8, .34), (x, 0, .17), bevel=.12)
        m.box(STONE, (1.13, 1.33, 3.37), (x, 0, 1.90), bevel=.103)
        m.box(SILVER, (1.34, 1.54, .29), (x, 0, 3.39), bevel=.08)
    arc(m, [SLATE, STONE, SILVER, STONE], 3.05, 2.08, 0, pi, 11, 1.25, (0, 3.49), .015)
    for x, z in ((-.74, 6.40), (.22, 6.69), (1.10, 6.18)):
        m.ico(MOSS, .38, (x, -.49, z), scale=(1.3, .77, .35))
    return m


def ridge():
    m = model('ridge')
    rng = Random(8331)
    for i in range(14):
        x, y = rng.uniform(-4.6, 4.6), rng.uniform(-2.38, 2.38)
        h = rng.uniform(2.55, 7.9) * (1 - .058 * abs(x))
        r = rng.uniform(.68, 1.56)
        m.cyl((SLATE, DARK, INK)[i % 3], r, h, (x, y, 0),
              (3, rng.uniform(-9, 8), rng.uniform(0, 360)), r2=r * .81, seg=6, smooth=False)
    return m


def vault():
    """A masonry barrel vault with visible shell faces and chunky inset ribs."""
    m = model('vault')
    n = 16
    angles = [pi * i / n for i in range(n + 1)]
    for i, (a, b) in enumerate(zip(angles, angles[1:])):
        points = [(r * cos(t), 3.9 + h * sin(t)) for r, h, t in
                  ((11.96, 5.44, a), (11.96, 5.44, b), (11.70, 5.12, b), (11.70, 5.12, a))]
        prism(m, (DARK, SLATE, DARK, STONE)[i % 4], points, 6.10)
    for y in (-2.88, 2.88):
        start = len(m.verts)
        for i, (a, b) in enumerate(zip(angles, angles[1:])):
            points = [(r * cos(t), 3.90 + h * sin(t)) for r, h, t in
                      ((12.04, 5.39, a + .006), (12.04, 5.39, b - .006),
                       (11.51, 4.83, b - .006), (11.51, 4.83, a + .006))]
            prism(m, (SLATE, STONE, SILVER, STONE)[i % 4], points, .44)
        for j in range(start, len(m.verts)):
            x, py, z = m.verts[j]
            m.verts[j] = (x, py + y, z)
    # Blender -Y becomes game +Z. Turn the arch cross-section across the corridor.
    for i, (x, y, z) in enumerate(m.verts):
        m.verts[i] = (y, -x, z)
    return m


def tomb():
    m = model('tomb')
    m.box(DARK, (3.09, 1.63, .21), (0, 0, .105), bevel=.091)
    m.box(STONE, (2.84, 1.43, .94), (0, 0, .62), bevel=.098)
    m.box(SLATE, (3.02, 1.59, .28), (0, 0, 1.11), bevel=.096)
    m.box(STONE, (2.65, 1.22, .25), (0, 0, 1.30), bevel=.089)
    start = len(m.verts)
    crescent(m, SILVER, .34, .66, .06)
    for i in range(start, len(m.verts)):
        x, y, z = m.verts[i]
        m.verts[i] = (x, y - .73, z)
    for x in (-.94, .94):
        for a in (-1, 1):
            beam(m, SLATE, (x + a * .34, -.728, .38), (x, -.728, .88), .069)
    return m


def sconce():
    m = model('sconce')
    m.box(DARK, (.55, .30, 1.23), (0, 0, .615), bevel=.083)
    m.box(STONE, (.49, .18, .52), (0, -.185, .74), bevel=.066)
    beam(m, SLATE, (0, -.215, .40), (0, -.66, .94), .17)
    m.cyl(SLATE, .32, .15, (0, -.62, .83), r2=.22, seg=10)
    m.ico(LAVENDER, .34, (0, -.62, 1.19), scale=(.72, .71, 1.46), sub=2)
    m.ico(ICE, .14, (.07, -.795, 1.18), scale=(.75, .55, 1.16))
    return m


def lantern():
    m = model('lantern')
    m.box(DARK, (.94, .88, .20), (0, 0, .10), bevel=.08)
    m.box(STONE, (.73, .68, .92), (0, 0, .58), bevel=.087)
    m.box(SILVER, (.94, .87, .16), (0, 0, 1.06), bevel=.064)
    crescent(m, STONE, .69, 1.83, .28)
    m.cyl(DARK, .26, .11, (-.035, -.13, 1.40), seg=10)
    m.cyl(SILVER, .24, .10, (-.035, -.13, 2.11), r2=.09, seg=10)
    m.ico(CYAN, .30, (-.035, -.13, 1.82), scale=(.71, .68, 1.26), sub=2)
    for i in range(6):
        a = i * pi / 3
        x, y = -.035 + .203 * cos(a), -.13 + .203 * sin(a)
        beam(m, SLATE, (x, y, 1.49), (x, y, 2.095), .037)
    for i, (x, y, z) in enumerate(m.verts):
        m.verts[i] = (x, y, z + .57)
    m.box(SLATE, (1.06, .95, .60), (0, 0, .30), bevel=.09)
    return m


def obelisk():
    m = model('obelisk')
    m.box(DARK, (2.0, 1.91, .29), (0, 0, .145), bevel=.13)
    m.box(SLATE, (1.64, 1.52, .39), (0, 0, .43), bevel=.11)
    m.cyl(STONE, .78, 4.48, (0, 0, .61), (0, 0, 45), r2=.52, seg=4, smooth=False)
    for z in (1.32, 4.81):
        m.box(SLATE, (1.18, 1.13, .18), (0, 0, z), bevel=.061)
    for y in (-.55, .55):
        m.box(INK, (.37, .104, 2.41), (0, y, 3.01), bevel=.078)
        for sign in (-1, 1):
            beam(m, CYAN, (0, y * 1.12, 3.59), (sign * .15, y * 1.12, 3.23), .040)
            beam(m, CYAN, (sign * .15, y * 1.12, 3.23), (0, y * 1.12, 2.87), .040)
    crescent(m, SILVER, .89, 5.66, .31)
    m.ico(CYAN, .29, (0, -.065, 5.62), scale=(.64, .66, 1.45), sub=1)
    return m


def camp():
    m = model('camp')
    m.box(DARK, (4.29, 2.26, .24), (0, 0, .12), bevel=.09)
    for x in (-1.9, 1.9):
        m.box(STONE, (.37, .35, 2.30), (x, .33, 1.18), bevel=.053)
    m.box(0x526B7D, (4.30, 2.36, .125), (0, 0, 2.25), rot=(14, 0, 0), bevel=.041)
    for x in (-1.73, -.54, .66, 1.60):
        m.box(SILVER, (.055, 2.24, .10), (x, 0, 2.278), rot=(14, 0, 0), bevel=.014)
    for x, h in ((-1.38, .58), (.12, .74), (1.24, .52)):
        m.box(SLATE, (1.04, .88, h), (x, -.25, h * .5 + .24), bevel=.075)
        m.box(DARK, (1.09, .92, .13), (x, -.25, h + .22), bevel=.045)
        m.box(CYAN, (.24, .060, .067), (x, -.73, .45), bevel=.015)
    return m


def arch_frame(name, radius, center):
    m = model(name)
    for x in (-radius * .69, radius * .69):
        m.box(DARK, (radius * .63, radius * .83, radius * .14), (x, 0, radius * .07), bevel=.13)
        m.box(SLATE, (radius * .43, radius * .59, radius * .23), (x, 0, radius * .23), bevel=.10)
    arc(m, [STONE, SILVER, SLATE, STONE], radius, radius * .77, pi / 2 + .13, 5 * pi / 2 - .13, 17,
        radius * .22, (0, center), .009)
    start = len(m.verts)
    arc(m, CYAN, radius * .891, radius * .874, pi / 2 + .13, 5 * pi / 2 - .13, 13,
        .052, (0, center), .021)
    for i in range(start, len(m.verts)):
        x, y, z = m.verts[i]
        m.verts[i] = (x, y - radius * .12, z)
    return m


def portal_frame():
    return arch_frame('portal_frame', 1.93, 2.04)


def portal_light():
    spin = model('portal_light')
    for i in range(3):
        # Offset arcs read as a rolling spiral when the local Y axis rotates.
        arc(spin, (LILAC, LAVENDER, CYAN)[i], 1.18 - i * .233, 1.10 - i * .233,
            .1 + i * 1.29, 4.34 + i * 1.29, 17, .056)
    spin.ico(ICE, .22, (0, 0, 0), scale=(.65, .59, 1.26), sub=2)
    part = bake(spin, *GLOW)
    for i, f in enumerate(FRAMES):
        a = i * pi / 4
        key(part, f, loc=(0, -.065, 2.04), rot=(0, a * 2, 0), scale=1 + .09 * sin(a))
    return [part]


def gate():
    m = arch_frame('gate', 5.24, 5.62)
    for x in (-4.4, 4.4):
        m.box(SLATE, (2.13, 2.33, 1.16), (x, -.24, .61), bevel=.17)
        m.box(STONE, (1.65, 1.85, 1.12), (x, -.28, 1.55), bevel=.13)
        m.ico(CYAN, .54, (x, -.31, 2.52), scale=(.72, .72, 1.57), sub=2)
    for i in range(5):
        m.box(STONE if i % 2 else SLATE, (7.94 - i * .51, .62, .16 + i * .13),
              (0, -2.88 + i * .62, .081 + i * .065), bevel=.044)
    m.ico(LAVENDER, .64, (0, -.66, 10.74), scale=(.74, .77, 1.62), sub=2)
    orbit = model('gate_orbit')
    arc(orbit, LAVENDER, 2.64, 2.602, .10, 2 * pi - .10, 24, .036, gap=.007)
    for i in range(5):
        a = i * 2 * pi / 5
        orbit.ico(ICE if i % 2 == 0 else CYAN, .38, (2.64 * cos(a), -.06, 2.64 * sin(a)),
                  scale=(.64, .81, 1.33), sub=2)
    wheel = bake(orbit, *GLOW)
    core = model('gate_core')
    core.cyl(ICE, .10, .90, (0, 0, -.93), r2=.53, seg=6, smooth=False)
    core.cyl(ICE, .53, .90, (0, 0, -.03), r2=.064, seg=6, smooth=False)
    core.ico(LAVENDER, .35, (.22, -.49, -.19), scale=(.85, .75, 1.38), sub=1)
    jewel = bake(core, *GLOW)
    for i, f in enumerate(FRAMES):
        a = i * pi / 4
        key(wheel, f, loc=(0, -.23, 5.64), rot=(0, a, 0))
        key(jewel, f, loc=(0, -.29, 5.64 + .30 * sin(a)), rot=(.11, -a, 0), scale=1 + .085 * sin(a * 2))
    return m, [wheel, jewel]


def medallion():
    m = model('medallion')
    for r, width, z, color in ((7.35, .12, .026, STONE), (6.55, .07, .025, SLATE), (4.65, .075, .025, CYAN),
                               (2.40, .065, .025, SILVER), (1.35, .079, .024, LAVENDER)):
        ring(m, color, r, width, z, segments=40, depth=.023)
    for i in range(12):
        a = i * pi / 6
        r = 7.01
        m.box(CYAN if i % 3 == 0 else STONE, (.29, .10, .021), (r * cos(a), r * sin(a), .026), rot=(0, 0, i * 30 + 42))
    return m


def apron():
    m = model('apron')
    m.box(SLATE, (2, 2, .30), (0, 0, .15), bevel=.075)
    return m


def viaduct():
    """A distant aqueduct silhouette with three ruined arches and lit recesses."""
    m = model('viaduct')
    for x in (-7.8, 0, 7.8):
        arc(m, [DARK, SLATE, STONE], 3.91, 3.04, 0, pi, 6, 2.0, (x, 5.6))
    for x in (-11.65, -3.9, 3.9, 11.65):
        m.box(DARK, (1.64, 2.0, 5.9), (x, 0, 2.95))
        m.box(SLATE, (1.84, 2.22, .52), (x, 0, 5.4))
        m.box(CYAN, (.24, .038, .63), (x, -1.022, 4.12))
    m.box(SLATE, (24.8, 2.0, .47), (0, 0, 9.55))
    for x, height in ((-10, 2.06), (-4.7, 1.36), (2.1, .62), (7.6, 1.15)):
        m.box(INK, (1.20, 1.75, height), (x, 0, 9.78 + height / 2))
    return m


def main():
    clear_scene()
    MATERIALS.clear()
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = FRAMES[0], FRAMES[-1]
    makers = (wall, crypt_wall, column, fragment, ruin_arch, ridge, vault, tomb,
              sconce, lantern, obelisk, camp, portal_frame, gate, medallion, apron, viaduct)
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    expansion_only = '--expansion-only' in args
    results = []
    for make in makers:
        result = make()
        mesh, motion = result if isinstance(result, tuple) else (result, [])
        results.append((mesh.name, [bake(mesh, *GLOW), *motion], bool(motion)))
    results.append(('moonlit_portal_light', portal_light(), True))
    for i, (name, parts, animated) in enumerate(results):
        scene.frame_set(scene.frame_start)
        if not expansion_only or name == 'moonlit_viaduct':
            export(parts, 'props', name, animated=animated, compressed=True)
        collection = bpy.data.collections.new(name)
        scene.collection.children.link(collection)
        root = bpy.data.objects.new(f'{name} | Editable prop', None)
        collection.objects.link(root)
        for part in parts:
            collection.objects.link(part)
            scene.collection.objects.unlink(part)
            if not part.parent:
                part.parent = root
        root.location = ((i % 5) * 16, (i // 5) * 26, 0)
        collection.instance_offset = root.location
        collection.asset_mark()
    scene.frame_set(scene.frame_start)
    scene.name = 'Moonlit Ruins | Asset Library'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.color_type = 'VERTEX'
            region = area.spaces.active.region_3d
            region.view_location = (31, 34, 3)
            region.view_distance = 112
            region.view_rotation = Vector((-.19, 1, -.90)).to_track_quat('-Z', 'Y')
    target = Path(__file__).resolve().parents[1] / 'moonlit_ruins.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(target), compress=True)


if __name__ == '__main__':
    main()
