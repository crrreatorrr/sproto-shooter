"""Build the Hellfire Underworks asset library and compressed campaign GLBs."""
from math import cos, pi, sin
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_campaign_polish import MATERIALS, bake, beam, ring
from build_cartoon_kit import Model, clear_scene, export, key

INK, BASALT, SLATE, STEEL = 0x302639, 0x574661, 0x73607E, 0x6F677B
IRON, RUST, COPPER, WOOD = 0x565260, 0xA34F38, 0xBD7851, 0x906344
WOOD_END, BOLT, GOLD = 0xC39061, 0xA89899, 0xE2AC48
HEAT, AMBER, HOT = 0xF74924, 0xFFD178, 0xFFF2AB
GLOW = (
    ('underworks_heat', (HEAT,), 0xFF4416, 1.15),
    ('underworks_lamp', (AMBER,), 0xFFAA43, 1.28),
    ('underworks_hot', (HOT,), 0xFFC566, 1.65),
)
FRAMES = range(1, 121 + 1, 15)


def model(name):
    return Model('underworks_' + name, outline=0)


def bolts(m, points, radius=.073):
    for x, y, z in points:
        m.cyl(BOLT, radius, .045, (x, y, z), (90, 0, 0), seg=6, smooth=False)


def lamp(m, x, y, z):
    m.cyl(IRON, .11, .36, (x, y, z + .14), seg=8)
    m.cyl(INK, .43, .13, (x, y, z + .08), r2=.31, seg=12)
    m.cyl(AMBER, .34, .17, (x, y, z - .067), r2=.38, seg=14)
    m.cyl(HOT, .24, .045, (x, y, z - .077), seg=12)
    ring(m, IRON, .33, .049, z - .057, segments=12, depth=.035)
    for i in range(6):
        a = i * pi / 3
        beam(m, RUST, (x + .40 * cos(a), y + .40 * sin(a), z + .10),
             (x + .33 * cos(a), y + .33 * sin(a), z - .058), .035)


def basalt_wall():
    """Two units wide and deep, one tall. The face at Y=-1 bounds the road."""
    m = model('basalt_wall')
    m.box(BASALT, (2, 2, .97), (0, 0, .485), bevel=.027)
    rng = Random(3707)
    for i in range(8):
        x = (i - 3.5) * .25
        h = rng.uniform(.20, .80)
        m.cyl((SLATE, BASALT, INK)[i % 3], rng.uniform(.09, .14), h,
              (x, -.93, 1 - h), r2=.095, seg=5, smooth=False)
    m.box(INK, (2, 2.045, .066), (0, 0, .066), bevel=.019)
    return m


def steel_wall():
    m = model('steel_wall')
    m.box(IRON, (2, 2, .98), (0, 0, .49), bevel=.036)
    for z in (.10, .87, .965):
        m.box(STEEL, (2, 2.08, .064), (0, 0, z), bevel=.018)
    for x in (-.88, 0, .88):
        m.box(INK, (.065, .15, .73), (x, -1, .48), bevel=.016)
    for x in (-.43, .43):
        m.box(INK, (.26, .075, .10), (x, -1.008, .72), bevel=.016)
        m.box(AMBER, (.19, .047, .043), (x, -1.049, .72), bevel=.011)
    return m


def roof():
    """A full shaft ceiling bay, with beams, caged lights and a painted underside."""
    m = model('roof')
    m.box(SLATE, (5.68, 23.8, .44), (0, 0, 1.25), bevel=.14)
    for x in (-2.72, .84, 2.63):
        m.box(WOOD, (.36, 23.32, .48), (x, 0, .93), bevel=.06)
        for y in (-7.7, 0, 7.7):
            m.box(IRON, (.44, .52, .57), (x, y, .93), bevel=.045)
    for y in (-9.6, -4.2, 4.2, 9.6):
        m.box(WOOD, (5.64, .31, .37), (0, y, 1.01), bevel=.043)
    for y in (-6, 6):
        lamp(m, 1.1, y, .24)
    return m


def gantry():
    m = model('gantry')
    for y in (-11.2, 11.2):
        m.box(IRON, (.93, .92, .61), (0, y, .3), bevel=.14)
        m.box(WOOD, (.64, .61, 7.75), (0, y, 4.29), bevel=.11)
        for z in (1.05, 5.28, 7.11):
            m.box(IRON, (.75, .75, .38), (0, y, z), bevel=.051)
            bolts(m, [(x, y - .39, z + dz) for x in (-.24, .24) for dz in (-.10, .10)])
        beam(m, WOOD_END, (0, y, 5.45), (0, y * .79, 7.82), .36)
    m.box(WOOD, (.57, 23.30, .56), (0, 0, 7.93), bevel=.078)
    m.box(IRON, (.64, 3.3, .62), (0, 0, 7.92), bevel=.078)
    for y in (-6, 0, 6):
        lamp(m, 0, y, 7.28)
    return m


def tunnel():
    """A dark exit collar with an open centre and a painted steel soffit."""
    m = model('tunnel')
    for y in (-11.2, 11.2):
        m.box(BASALT, (3.5, 2.0, 8.7), (0, y, 4.35), bevel=.19)
        m.box(IRON, (.47, 1.27, 8.35), (-1.78, y, 4.35), bevel=.081)
        beam(m, IRON, (-1.84, y * .93, 5.85), (-1.84, y * .71, 8.37), .43)
    m.box(IRON, (3.5, 24, .68), (0, 0, 8.63), bevel=.13)
    m.box(INK, (.30, 14.1, .42), (-1.86, 0, 8.24), bevel=.058)
    sign = len(m.verts)
    m.text(AMBER, 'UNDERWORKS', .36, .025, (0, 0, 0))
    for i in range(sign, len(m.verts)):
        x, y, z = m.verts[i]
        m.verts[i] = (y - 2.021, -x, z + 8.13)
    for y in (-7.6, -3.8, 0, 3.8, 7.6):
        m.box(RUST, (.30, .22, .39), (-1.88, y, 8.27), bevel=.04)
    for y in (-5.4, 5.4):
        lamp(m, -.35, y, 7.83)
    return m


def track():
    """Four metres of inlaid track, a visual cue for the existing boost lane."""
    m = model('track')
    for x in (-1.5, -.5, .5, 1.5):
        m.box(WOOD, (.21, 2.44, .038), (x, 0, .019), bevel=.009)
    for y in (-.78, .78):
        m.box(INK, (4, .17, .047), (0, y, .025), bevel=.011)
        m.box(STEEL, (4, .097, .032), (0, y, .057), bevel=.008)
        for x in (-1.5, -.5, .5, 1.5):
            m.box(BOLT, (.09, .245, .027), (x, y, .039), bevel=.008)
    return m


def cart():
    m = model('cart')
    m.box(INK, (2.73, 1.64, .22), (0, 0, .52), bevel=.082)
    m.box(IRON, (2.49, 1.53, .26), (0, 0, .72), bevel=.071)
    m.box(RUST, (2.46, 1.46, .74), (0, 0, 1.07), bevel=.13)
    for y in (-.78, .78):
        m.box(COPPER, (2.74, .14, .16), (0, y, 1.45), bevel=.042)
        for x in (-1.12, 0, 1.12):
            m.box(IRON, (.14, .11, .70), (x, y, 1.09), bevel=.044)
            if y < 0:
                bolts(m, [(x, y - .057, .91), (x, y - .057, 1.27)], .055)
    for x in (-1.23, 1.23):
        m.box(COPPER, (.16, 1.64, .15), (x, 0, 1.45), bevel=.044)
        m.box(IRON, (.18, 1.21, .24), (x, 0, .80), bevel=.055)
    rng = Random(927)
    for i in range(12):
        x, y = (i % 4 - 1.5) * .51, (i // 4 - 1) * .38
        m.ico((BASALT, SLATE, INK)[i % 3], rng.uniform(.26, .37), (x, y, rng.uniform(1.35, 1.55)),
              scale=(1.35, 1, .86), sub=1)
    for x in (-.84, .84):
        for y in (-.72, .49):
            m.wheel((x, y, .35), r=.34, w=.22)
    return m


def hoist():
    m = model('hoist')
    for x in (-1.55, 1.55):
        for y in (-1.24, 1.24):
            m.box(IRON, (.82, .74, .39), (x, y, .195), bevel=.10)
            beam(m, WOOD, (x, y, .26), (x * .19, y * .79, 5.74), .40)
        beam(m, COPPER, (x * .69, -1.19, 1.89), (x * .69, 1.19, 1.89), .30)
    m.box(WOOD, (2.62, 2.49, .25), (0, 0, 2.00), bevel=.058)
    for y in (-.67, .67):
        m.box(IRON, (2.51, .14, .091), (0, y, 2.15), bevel=.023)
    m.box(IRON, (1.32, 2.64, .44), (0, 0, 5.55), bevel=.092)
    m.cyl(IRON, .37, .60, (0, .31, 5.08), (90, 0, 0), seg=14)
    m.cyl(COPPER, .28, .07, (0, -.27, 5.08), (90, 0, 0), seg=12)
    lamp(m, 0, -.97, 5.08)
    return m


def basalt_cluster():
    m = model('basalt_cluster')
    rng = Random(711)
    for i in range(16):
        x = rng.uniform(-3.7, 3.7)
        y = rng.uniform(-1.9, 1.9)
        radius = rng.uniform(.43, 1.20)
        h = rng.uniform(3.2, 9.4) * (1 - abs(x) * .077)
        m.cyl((BASALT, SLATE, INK)[i % 3], radius, h, (x, y, 0), (2, (i % 5 - 2) * 4, i * 25),
              r2=radius * .84, seg=6, smooth=False)
    for x in (-3.3, -1.6, 0, 1.9, 3.5):
        m.ico(INK, .91, (x, -1.7, .31), scale=(1.4, .82, 1.08))
    return m


def furnace():
    """An inset firebox with a keyed hot bed, heavy framing, vents and an exhaust."""
    m = model('furnace')
    m.box(BASALT, (5.15, 3.25, 5.22), (0, 0, 2.61), bevel=.16)
    m.box(IRON, (5.36, 3.38, .43), (0, 0, 5.04), bevel=.11)
    m.box(INK, (3.58, .31, 2.28), (0, -1.67, 1.89), bevel=.27)
    for x in (-2.13, 2.13):
        m.box(STEEL, (.54, .57, 3.31), (x, -1.64, 1.94), bevel=.098)
        bolts(m, [(x, -1.95, z) for z in (.57, 1.26, 2.77, 3.41)])
    for z in (.60, 3.32):
        m.box(IRON, (4.41, .50, .42), (0, -1.64, z), bevel=.094)
    for x in (-1.41, -.94, -.47, 0, .47, .94, 1.41):
        m.box(INK, (.108, .20, 1.84), (x, -1.97, 1.95), bevel=.018)
    for x in (-1.1, -.55, 0, .55, 1.1):
        m.box(INK, (.24, .15, .73), (x, -1.64, 4.19), bevel=.048)
        m.box(HEAT, (.10, .10, .57), (x, -1.737, 4.19), bevel=.025)
    m.cyl(RUST, .39, 2.74, (1.62, .74, 5.12), seg=14)
    m.cyl(IRON, .49, .22, (1.62, .74, 7.74), seg=14)
    bed = model('firebed')
    bed.box(HEAT, (3.37, .15, 1.61), (0, 0, .11), bevel=.20)
    for i in range(8):
        x = (i - 3.5) * .37
        bed.ico(AMBER if i % 3 else HOT, .34, (x, -.068, -.30 + (i % 3) * .20),
                scale=(.66, .28, 1.54), sub=1)
    fire = bake(bed, *GLOW)
    for i, frame in enumerate(FRAMES):
        wave = i * pi / 4
        key(fire, frame, loc=(0, -1.822, 1.84), scale=(1, 1, 1 + .11 * sin(3 * wave)))
    return m, [fire]


def pipe():
    m = model('pipe')
    # Polygonal elbow from the floor into the longitudinal overhead line.
    joints = [(0, 0, 0), (0, 0, 3.85), (.37, 0, 4.89), (1.19, 0, 5.62), (2.22, 0, 5.89), (6.05, 0, 5.89)]
    for a, b in zip(joints, joints[1:]):
        start, end = Vector(a), Vector(b)
        axis = end - start
        rotation = tuple(v * 180 / pi for v in axis.to_track_quat('Z', 'Y').to_euler())
        m.cyl(RUST, .64, axis.length + .17, start - axis.normalized() * .085, rotation, seg=14)
    for x, y, z, r in ((0, 0, .17, 0), (0, 0, 3.43, 0), (2.62, 0, 5.89, 90), (5.67, 0, 5.89, 90)):
        m.cyl(IRON, .77, .25, (x, y, z), (0, r, 0), seg=16)
        for i in range(8):
            a = i * pi / 4
            at = (x + .69 * cos(a), y + .69 * sin(a), z + .23) if r == 0 else (x + .22, y + .69 * sin(a), z + .69 * cos(a))
            m.cyl(BOLT, .069, .074, at, (0, r, 0), seg=6, smooth=False)
    return m


def press():
    m = model('press')
    for y in (-1.62, 1.62):
        m.box(IRON, (2.71, .62, .33), (0, y, .165), bevel=.09)
        m.box(STEEL, (.44, .48, 5.74), (0, y, 3.12), bevel=.086)
    m.box(IRON, (2.73, 3.77, .56), (0, 0, 6), bevel=.14)
    m.cyl(RUST, .53, 2.25, (0, 0, 3.75), seg=14)
    for x in (-.85, .85):
        m.box(AMBER, (.44, .09, .12), (x, -1.887, 6.01), bevel=.029)
    plate = model('press_plate')
    plate.box(INK, (2.38, 2.39, .59), (0, 0, .27), bevel=.115)
    plate.cyl(BOLT, .38, 2.55, (0, 0, .47), seg=14)
    for x in (-.79, -.4, 0, .4, .79):
        plate.box(GOLD, (.16, .084, .43), (x, -1.205, .26), rot=(0, 27, 0), bevel=.014)
    ram = bake(plate)
    for i, frame in enumerate(FRAMES):
        key(ram, frame, loc=(0, 0, (2.46, 2.43, 2.18, 1.31, 1.28, 1.51, 2.19, 2.46, 2.46)[i]))
    return m, [ram]


def reactor():
    m = model('reactor')
    m.box(INK, (8.15, 4.65, .74), (0, 0, .37), bevel=.20)
    m.box(IRON, (7.52, 4.32, .33), (0, 0, .80), bevel=.13)
    m.cyl(STEEL, 2.20, 2.96, (0, 2.09, 4.05), (90, 0, 0), r2=2.33, seg=24)
    # Visible front collar set above the main support deck.
    m.cyl(IRON, 2.91, .42, (0, -.72, 4.05), (90, 0, 0), seg=28)
    m.cyl(HEAT, 2.48, .16, (0, -1.15, 4.05), (90, 0, 0), seg=28)
    m.cyl(INK, 1.74, .18, (0, -1.30, 4.05), (90, 0, 0), seg=24)
    for i in range(14):
        a = i * pi / 7
        x, z = 2.66 * cos(a), 4.05 + 2.66 * sin(a)
        m.box(COPPER, (.30, .39, .26), (x, -1.17, z), rot=(0, -i * 180 / 7, 0), bevel=.057)
        bolts(m, [(x, -1.37, z)], .080)
    for x in (-3.35, 3.35):
        m.box(RUST, (.70, .63, 3.57), (x, -.65, 2.53), bevel=.10)
        m.box(INK, (.56, .24, 1.22), (x, -1.04, 2.95), bevel=.066)
        for z in (2.64, 2.94, 3.24):
            m.box(AMBER, (.33, .09, .12), (x, -1.188, z), bevel=.029)
        m.cyl(COPPER, .25, 1.38, (x, -.58, 4.25), seg=12)
    wheel = model('reactor_rotor')
    ring(wheel, RUST, 1.77, .31, 0, segments=28, depth=.25)
    ring(wheel, AMBER, 1.74, .103, .144, segments=28, depth=.052)
    wheel.cyl(HOT, .37, .29, (0, 0, -.075), seg=16)
    for i in range(8):
        a = i * pi / 4
        beam(wheel, COPPER, (.33 * cos(a), .33 * sin(a), 0), (1.67 * cos(a), 1.67 * sin(a), 0), .24)
        wheel.box(HEAT, (.28, .108, .065), (1.36 * cos(a), 1.36 * sin(a), .165), rot=(0, 0, i * 45), bevel=.022)
    rotor = bake(wheel, *GLOW)
    pivot = bpy.data.objects.new('underworks_reactor_pivot', None)
    bpy.context.scene.collection.objects.link(pivot)
    pivot.location = (0, -1.60, 4.05)
    pivot.rotation_euler.x = pi / 2
    rotor.parent = pivot
    for i, frame in enumerate(FRAMES):
        key(rotor, frame, rot=(0, 0, i * pi / 4))
    return m, [pivot, rotor]


def chimney():
    m = model('chimney')
    m.cyl(BASALT, 2.4, 2.65, (0, 0, 0), r2=1.75, seg=10, smooth=False)
    m.cyl(IRON, 1.66, 6.82, (0, 0, 2.40), r2=1.28, seg=12)
    m.cyl(RUST, 1.63, .51, (0, 0, 8.95), seg=12)
    ring(m, INK, 1.29, .31, 9.41, segments=12, depth=.16)
    ring(m, HEAT, 1.14, .11, 9.41, segments=12, depth=.09)
    for z in (4.4, 6.7):
        ring(m, STEEL, 1.54 if z < 5 else 1.43, .20, z, segments=12, depth=.18)
    for a in range(0, 360, 90):
        c, s = cos(a * pi / 180), sin(a * pi / 180)
        m.box(AMBER, (.25, .12, 1.05), (1.55 * c, 1.55 * s, 3.7), rot=(0, 0, a - 90), bevel=.047)
    return m


def magma():
    m = model('magma')
    m.box(HEAT, (2, 2, .025), (0, 0, .0125))
    return m


def lavafall():
    m = model('lavafall')
    # The dark side lips are world geometry, while the falling sheet uses the magma shader.
    m.box(HEAT, (2.05, .045, 1.005), (0, 0, .5025))
    return m


def cavern_rib():
    """A broad shelf of slanted basalt pillars, built for the middle distance."""
    m = model('cavern_rib')
    for x, y, r, height, tilt, color in (
        (-3.4, 1.3, 3.2, 9.5, -14, BASALT), (-.6, .5, 3.6, 16.5, 8, SLATE),
        (3.5, .4, 2.9, 11.6, 17, BASALT), (1.2, -1.5, 2.3, 6.4, -13, INK),
        (-3.9, -1.4, 2.2, 5.4, 11, IRON),
    ):
        m.cyl(color, r, height, (x, y, 0), (tilt * .3, tilt, x * 8),
              r2=r * .68, seg=5, smooth=False)
    return m


def distant_smelter():
    """A rockside industrial silhouette with glowing slots and angled stacks."""
    m = model('distant_smelter')
    m.box(INK, (11.2, 6.2, 3.0), (0, 0, 1.5))
    m.box(IRON, (9.7, 5.65, 4.6), (0, .14, 5.2), bevel=.26)
    m.box(BASALT, (6.35, 4.55, 2.3), (1.2, .22, 8.55), bevel=.16)
    for x in (-2.8, 2.9):
        m.cyl(IRON, .72, 5.6, (x, .65, 7.2), r2=.49, seg=6, smooth=False)
        m.cyl(RUST, .77, .24, (x, .65, 12.6), seg=6, smooth=False)
        m.box(HEAT, (.62, .065, .64), (x, -2.72, 4.65))
    for x in (-3.65, -1.2, 1.2, 3.65):
        m.box(AMBER, (.72, .09, .17), (x, -2.73, 6.2))
    return m


def main():
    clear_scene()
    MATERIALS.clear()
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = FRAMES[0], FRAMES[-1]
    backdrop = (cavern_rib, distant_smelter)
    makers = (basalt_wall, steel_wall, roof, gantry, tunnel, track, cart, hoist,
              basalt_cluster, furnace, pipe, press, reactor, chimney, magma, lavafall, *backdrop)
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    backdrop_only = '--backdrop-only' in args
    for i, make in enumerate(makers):
        result = make()
        mesh, motion = result if isinstance(result, tuple) else (result, [])
        obj = bake(mesh, *GLOW)
        parts = [obj, *motion]
        scene.frame_set(scene.frame_start)
        if not backdrop_only or make in backdrop:
            export(parts, 'props', mesh.name, animated=bool(motion), compressed=True)
        collection = bpy.data.collections.new(mesh.name)
        scene.collection.children.link(collection)
        root = bpy.data.objects.new(f'{mesh.name} | Editable prop', None)
        collection.objects.link(root)
        for part in parts:
            collection.objects.link(part)
            scene.collection.objects.unlink(part)
            if not part.parent:
                part.parent = root
        root.location = ((i % 5) * 15, (i // 5) * 28, 0)
        collection.instance_offset = root.location
        collection.asset_mark()
    scene.frame_set(scene.frame_start)
    scene.name = 'Hellfire Underworks | Asset Library'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.color_type = 'VERTEX'
            region = area.spaces.active.region_3d
            region.view_location = (30, 42, 3)
            region.view_distance = 142
            region.view_rotation = Vector((-.17, 1, -.88)).to_track_quat('-Z', 'Y')
    target = Path(__file__).resolve().parents[1] / 'hellfire_underworks.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(target), compress=True)


if __name__ == '__main__':
    main()
