"""Build the Hellfire Caldera Blender library and compressed game models."""
from math import cos, pi, radians, sin
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Euler, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_campaign_polish import MATERIALS, bake, beam, ring
from build_cartoon_kit import Model, clear_scene, export, key
from build_moonlit_kit import prism

INK, BASALT, SLATE, ASH = 0x342638, 0x605266, 0x796779, 0x99808A
COPPER, OXIDE, WOOD, ROPE = 0xBE774C, 0x814B50, 0x9B6550, 0xDEAD79
EMBER, GOLD, HOT = 0xFF5733, 0xFFB34F, 0xFFE7A4
JADE, MINT = 0x55CEBE, 0xD5FFE5
ROCKS = (BASALT, SLATE, INK, ASH, BASALT)
GLOW = (
    ('caldera_ember', (EMBER,), 0xFF461F, 1.16),
    ('caldera_gold', (GOLD,), 0xFF9E42, .95),
    ('caldera_hot', (HOT,), 0xFFD886, 1.5),
    ('caldera_vent_glow', (JADE, MINT), 0x77FFE2, 1.13),
)
FRAMES = range(1, 122, 15)


def model(name):
    return Model('caldera_' + name, outline=0)


def wall():
    m = model('wall')
    m.box(BASALT, (2, 2, .92), (0, 0, .46), bevel=.026)
    rng = Random(172)
    for i in range(6):
        x = -.84 + i * .335
        h = rng.uniform(.63, 1)
        m.cyl(ROCKS[i % 5], .176, h, (x, -.86, 0), (0, rng.uniform(-3, 3), 30),
              r2=.163, seg=6, smooth=False)
        m.cyl(OXIDE if i % 3 == 0 else SLATE, .174, .046, (x, -.858, .39 + i * .032),
              (0, -4, 30), r2=.174, seg=6, smooth=False)
    m.box(INK, (2, 2.12, .084), (0, 0, .046), bevel=.027)
    return m


def scree():
    m = model('scree')
    rng = Random(1282)
    for i in range(17):
        x, y = rng.uniform(-1.75, 1.75), rng.uniform(-.82, .82)
        size = rng.uniform(.17, .62)
        m.ico(ROCKS[i % 5], size, (x, y, size * .34), scale=(1.28, .74, .62),
              sub=2 if i < 3 else 1)
    return m


def spires():
    m = model('spires')
    rng = Random(2006)
    for i in range(13):
        x, y = rng.uniform(-4.65, 4.65), rng.uniform(-1.84, 1.84)
        h = rng.uniform(2.3, 8.2) * (1 - .052 * abs(x))
        r = rng.uniform(.47, 1.20)
        lean, twist = rng.uniform(-16, 13), rng.uniform(0, 60)
        m.cyl(ROCKS[i % 5], r, h, (x, y, 0), (4, lean, twist), r2=r * .67, seg=6, smooth=False)
        rot = Euler((radians(4), radians(lean), radians(twist))).to_matrix()
        cap = Vector((x, y, 0)) + rot @ Vector((0, 0, h - .23))
        m.ico(ROCKS[(i + 1) % 5], r * .72, cap, scale=(.98, .94, .83))
    return m


def overhang():
    m = model('overhang')
    # The ledge grows from the wall and leaves the centre of the canyon open.
    m.box(INK, (8.64, 6.66, .92), (0, .66, .78), bevel=.23)
    rng = Random(87)
    for i in range(8):
        x = -3.81 + i * 1.09
        depth = rng.uniform(5.8, 7.9)
        m.box(ROCKS[i % 5], (rng.uniform(1.01, 1.41), depth, rng.uniform(.66, 1.27)),
              (x, .80, rng.uniform(.68, 1.23)), rot=(rng.uniform(-6, 11), rng.uniform(-11, 11), rng.uniform(-8, 8)),
              bevel=.18)
        m.ico(ROCKS[(i + 2) % 5], rng.uniform(.50, .82), (x, -2.2, .54),
              scale=(.82, 1.28, .79), sub=2)
    for i in range(9):
        m.ico(BASALT if i % 3 else OXIDE, rng.uniform(.25, .51), (rng.uniform(-3.8, 3.8),
              rng.uniform(-2.6, .8), rng.uniform(.25, .52)), scale=(1.78, 1.48, .38))
    return m


def apron():
    m = model('apron')
    m.box(BASALT, (2, 2, .37), (0, 0, .185), bevel=.049)
    return m


def bridge():
    m = model('bridge')
    rng = Random(45)
    for i in range(15):
        x = -2.8 + i * .4
        m.box((WOOD, 0x80523E, 0xAA7556)[i % 3], (.386, rng.uniform(1.87, 1.96), .098),
              (x, 0, .058), rot=(0, 0, rng.uniform(-1.9, 1.9)), bevel=.024)
        for y in (-.74, .74):
            m.cyl(INK, .023, .019, (x, y, .103), seg=6)
    # Shallow edge rails keep the gameplay corridor free of scenery collision.
    for y in (-.94, .94):
        for x in (-2.78, -.93, .93, 2.78):
            m.cyl(WOOD, .082, .19, (x, y, .042), seg=8, smooth=False)
            for z in (.17, .207):
                ring_at(m, ROPE, .085, .027, x, y, z, 8, .027)
        for left in (-2.78, -.93, .93):
            for i in range(8):
                a, b = i / 8, (i + 1) / 8
                beam(m, ROPE, (left + 1.85 * a, y, .204 - .07 * sin(pi * a)),
                     (left + 1.85 * b, y, .204 - .07 * sin(pi * b)), .050)
    return m


def ring_at(m, color, radius, width, x, y, z, segments, depth):
    start = len(m.verts)
    ring(m, color, radius, width, z, segments=segments, depth=depth)
    for i in range(start, len(m.verts)):
        px, py, pz = m.verts[i]
        m.verts[i] = (px + x, py + y, pz)


def diamond(m, color, x, y, z, w, h, stroke):
    top, right, bottom, left = (x,y,z+h), (x+w,y,z), (x,y,z-h), (x-w,y,z)
    for a, b in ((top,right), (right,bottom), (bottom,left), (left,top)):
        beam(m, color, a, b, stroke)


def obelisk():
    m = model('obelisk')
    m.box(INK, (1.72, 1.35, .29), (0, 0, .145), bevel=.16)
    m.box(BASALT, (1.42, 1.20, .32), (0, 0, .35), bevel=.13)
    prism(m, SLATE, [(-.72, .36), (.61, .36), (.58, 2.29), (.21, 3.28), (-.44, 2.94), (-.70, 1.78)], .84)
    for x, z, radius in ((-.57,.56,.31), (.58,.71,.39), (-.38,2.66,.27)):
        m.ico(BASALT, radius, (x, -.30, z), scale=(.72, .76, 1.67), sub=2)
    diamond(m, COPPER, 0, -.446, 2.05, .42, .64, .102)
    diamond(m, GOLD, 0, -.507, 2.05, .33, .51, .055)
    beam(m, GOLD, (0, -.514, 1.52), (0, -.513, .65), .046)
    for side in (-1, 1):
        beam(m, OXIDE, (.44 * side, -.45, 1.32), (.29 * side, -.46, .64), .098)
    return m


def brazier():
    m = model('brazier')
    m.cyl(INK, .73, .19, (0, 0, 0), r2=.58, seg=9, smooth=False)
    m.cyl(BASALT, .46, .72, (0, 0, .18), r2=.31, seg=8, smooth=False)
    m.cyl(BASALT, .40, .32, (0, 0, .79), r2=.65, seg=10, smooth=False)
    ring(m, COPPER, .65, .099, 1.10, segments=12, depth=.084)
    m.cyl(EMBER, .46, .049, (0, 0, 1.05), seg=12, smooth=False)
    for i in range(6):
        a = i * pi / 3
        m.ico(SLATE, .16, (.51 * cos(a), .51 * sin(a), 1.13), scale=(.84, .94, 1.62))
    coal = model('brazier_flame')
    coal.ico(EMBER, .34, (0, 0, .18), scale=(.71, .76, 1.58), sub=2)
    coal.ico(HOT, .21, (-.037, -.04, .09), scale=(.76, .74, 1.42), sub=2)
    flame = bake(coal, *GLOW)
    for i, frame in enumerate(FRAMES):
        a = i * pi / 4
        key(flame, frame, loc=(0, 0, 1.16 + .065 * sin(a)), rot=(.12 * sin(a), 0, a),
            scale=1 + .19 * sin(a * 2))
    return m, [flame]


def vent():
    m = model('vent')
    m.cyl(INK, 1.40, .095, (0, 0, 0), r2=1.27, seg=16, smooth=False)
    m.cyl(BASALT, 1.28, .16, (0, 0, .08), r2=1.13, seg=16, smooth=False)
    m.cyl(INK, .79, .055, (0, 0, .239), seg=16, smooth=False)
    ring(m, JADE, .81, .078, .265, segments=18, depth=.041)
    ring(m, COPPER, .96, .046, .248, segments=18, depth=.03)
    for i in range(8):
        a = i * pi / 4
        x, y = cos(a), sin(a)
        m.box(SLATE, (.51, .31, .145), (1.13*x, 1.13*y, .225), (0, -12, i*45), .049)
        m.box(MINT, (.28, .075, .022), (1.13*x, 1.13*y, .306), (0, -12, i*45), .009)
    for x in (-.32, 0, .32):
        m.box(OXIDE, (.05, 1.08, .06), (x, 0, .31), bevel=.015)
    plume = model('vent_plume')
    for i in range(13):
        a = i * 2.39996
        r = .24 + (i % 4) * .093
        plume.ico(MINT if i % 3 == 0 else JADE, .042 + (i % 4) * .013,
                  (r*cos(a), r*sin(a), .13 + i * .132), scale=(.61, .61, 2.9))
    vapor = bake(plume, *GLOW)
    for i, frame in enumerate(FRAMES):
        a = i * pi / 4
        key(vapor, frame, loc=(0, 0, .21 + .125 * sin(a)), rot=(0, 0, a), scale=1 + .15 * sin(a))
    return m, [vapor]


def shrine():
    m = model('shrine')
    for i in range(4):
        m.box(ROCKS[i], (8.80 - i * .57, .83, .34 + i * .16),
              (0, -3.47 + i * .82, .14 + i * .08), bevel=.099)
    m.box(BASALT, (10.9, 3.19, .68), (0, -.22, .33), bevel=.21)
    m.box(INK, (8.43, 2.61, .29), (0, -.28, .75), bevel=.105)
    for side in (-1, 1):
        rng = Random(37 if side < 0 else 112)
        m.box(INK, (2.05, 2.31, .95), (side * 4.27, -.05, 1.01), bevel=.14)
        m.box(BASALT, (1.55, 1.92, 1.51), (side * 4.24, -.04, 1.49),
              (0, -side * 10, 0), bevel=.17)
        for i in range(8):
            a = .21 + i * .157
            b = a + .154
            points = [(side * r * cos(t), 1.0 + (r + .55) * sin(t)) for r, t in
                      ((5.37, a), (5.24 - i * .09, b), (3.04 + i * .075, b), (3.03 + i * .069, a))]
            if side < 0:
                points.reverse()
            prism(m, ROCKS[i % 5], points, 2.28 - i * .15)
            c = (a + b) / 2
            m.ico(BASALT, rng.uniform(.30, .49), (side * 4.56 * cos(c), -.60, .91 + 5.18 * sin(c)),
                  scale=(.76, 1.19, 1.45), sub=2)
        for i in range(4):
            a, b = .29 + i * .21, .50 + i * .21
            beam(m, GOLD, (side * 4.42 * cos(a), -.98 + i * .07, 1.0 + 4.97 * sin(a)),
                 (side * 4.42 * cos(b), -.98 + i * .07, 1.0 + 4.97 * sin(b)), .085)
        diamond(m, GOLD, side * 3.55, -1.07, 2.57, .31, .43, .075)
        for i in range(6):
            m.ico(ROCKS[i % 5], rng.uniform(.30, .74), (side * rng.uniform(4.15, 5.55), rng.uniform(-1.3, 1.2), .46),
                  scale=(1.0, 1.17, .76), sub=2 if i < 2 else 1)
    gem = model('shrine_core')
    gem.cyl(EMBER, .071, 1.25, (0, 0, -1.25), r2=.75, seg=7, smooth=False)
    gem.cyl(GOLD, .75, 1.22, (0, 0, 0), r2=.034, seg=7, smooth=False)
    gem.ico(HOT, .41, (.13, -.65, .12), scale=(.65, .44, 1.43), sub=2)
    core = bake(gem, *GLOW)
    rubble = model('shrine_orbit')
    for i in range(7):
        a = i * 2 * pi / 7
        rubble.ico(ROCKS[i % 5], .21 + (i % 3) * .05, (1.89 * cos(a), 1.53 * sin(a), .52 * sin(a * 2)),
                   scale=(1.16, .74, 1.38), sub=2)
        rubble.ico(EMBER, .068, (2.03 * cos(a), 1.64 * sin(a), .54 * sin(a * 2)), scale=(1, .66, 1.5))
    orbit = bake(rubble, *GLOW)
    for i, frame in enumerate(FRAMES):
        a = i * pi / 4
        key(core, frame, loc=(0, -.05, 4.39 + .34 * sin(a)), rot=(.13, .11, -a), scale=1 + .063 * sin(a))
        key(orbit, frame, loc=(0, -.05, 4.35 + .25 * sin(a)), rot=(.32, 0, a))
    return m, [core, orbit]


def seal():
    m = model('seal')
    for r, width, color in ((7.86,.096,COPPER), (7.33,.093,GOLD), (6.38,.073,COPPER),
                            (3.45,.090,GOLD), (2.82,.078,COPPER), (1.12,.084,COPPER)):
        ring(m, color, r, width, .020, segments=40, depth=.017)
    for i in range(12):
        a = i * pi / 6
        for j in range(3):
            r = 4.04 + j * .63
            m.box(GOLD if i % 3 == 0 else COPPER, (.37, .09, .015), (r*cos(a),r*sin(a),.022), (0,0,i*30+24))
        m.box(COPPER, (.45,.45,.016), (6.83*cos(a),6.83*sin(a),.020), (0,0,i*30+45), .018)
    return m


def fuel():
    m = model('fuel')
    m.cyl(INK, .54, .17, (0, 0, 0), r2=.48, seg=10, smooth=False)
    m.cyl(OXIDE, .34, .82, (0, 0, .16), r2=.28, seg=12, smooth=False)
    m.cyl(SLATE, .21, .12, (0, 0, .97), r2=.25, seg=10, smooth=False)
    ring(m, COPPER, .36, .061, .37, segments=12, depth=.08)
    ring(m, COPPER, .32, .049, .85, segments=12, depth=.067)
    for i in range(3):
        a = i * 2 * pi / 3
        x, y = cos(a), sin(a)
        m.box(INK, (.16, .28, .47), (.319*x, .319*y, .64), (0, -4, i*120), .037)
        m.box(MINT, (.04, .087, .34), (.402*x, .402*y, .64), (0, -4, i*120), .012)
    return m


def escarpment():
    """Layered basalt cliff with a few molten fractures for the mid-distance."""
    m = model('escarpment')
    for x, y, radius, height, tilt, color in (
        (-5.4, 1.7, 3.4, 10, -16, INK), (-1.8, 1.9, 4.3, 15.8, 9, BASALT),
        (3.2, 1.5, 4.1, 12.2, -8, SLATE), (7.1, 1.0, 2.6, 8, 16, BASALT),
        (1.6, -2.1, 3.9, 6.6, -12, INK),
    ):
        m.cyl(color, radius, height, (x, y, 0), (tilt * .2, tilt, x * 7),
              r2=radius * .73, seg=6, smooth=False)
    for x, z in ((-2.9, 3.3), (3.8, 4.4), (7.2, 3.5)):
        m.box(EMBER, (.13, .12, 2.1), (x, -2.58, z), (0, -14, 0))
    return m


def main():
    clear_scene()
    MATERIALS.clear()
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = FRAMES[0], FRAMES[-1]
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    expansion_only = '--expansion-only' in args
    for i, maker in enumerate((wall, scree, spires, overhang, apron, bridge, obelisk, brazier, vent, shrine, seal, fuel, escarpment)):
        result = maker()
        mesh, motion = result if isinstance(result, tuple) else (result, [])
        parts = [bake(mesh, *GLOW), *motion]
        scene.frame_set(scene.frame_start)
        if not expansion_only or maker == escarpment:
            export(parts, 'props', mesh.name, animated=bool(motion), compressed=True)
        collection = bpy.data.collections.new(mesh.name)
        scene.collection.children.link(collection)
        root = bpy.data.objects.new(mesh.name + ' | Editable prop', None)
        collection.objects.link(root)
        for part in parts:
            collection.objects.link(part)
            scene.collection.objects.unlink(part)
            if not part.parent:
                part.parent = root
        root.location = ((i % 4) * 19, (i // 4) * 23, 0)
        collection.instance_offset = root.location
        collection.asset_mark()
    scene.frame_set(scene.frame_start)
    scene.name = 'Hellfire Caldera | Asset Library'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.color_type = 'VERTEX'
            region = area.spaces.active.region_3d
            region.view_location = (27, 25, 2.5)
            region.view_distance = 91
            region.view_rotation = Vector((-.21, 1, -.94)).to_track_quat('-Z', 'Y')
    target = Path(__file__).resolve().parents[1] / 'hellfire_caldera.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(target), compress=True)


if __name__ == '__main__':
    main()
