"""Build the Vape Cabal Skyline environment kit and its packed runtime GLBs."""
from math import cos, pi, sin
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_campaign_polish import MATERIALS, bake, beam, ring
from build_cartoon_kit import Model, clear_scene, export, key

INK, STEEL, TRIM = 0x25283D, 0x56657F, 0x8393AA
SLATE, STONE, BRICK = 0x464963, 0x9193A8, 0x786272
YELLOW, RUST = 0xFFAE3B, 0xAF6137
CYAN, AMBER, CORAL, WINDOW = 0x72ECFF, 0xFFD78D, 0xFF8197, 0xB64A68
GLOW = (
    ('skyline_cyan', (CYAN,), 0x4CCFFF, 1.10),
    ('skyline_amber', (AMBER,), 0xFFB54B, 1.22),
    ('skyline_coral', (CORAL,), 0xFF5E85, 0.95),
    ('skyline_window', (WINDOW,), 0xEA4266, 0.16),
)
FRAMES = range(1, 122, 15)


def model(name):
    return Model('skyline_' + name, outline=0)


def barrier():
    m = model('barrier')
    m.box(STONE, (2, 2, .76), (0, 0, .38), bevel=.08)
    m.box(SLATE, (2, 1.86, .26), (0, .04, .87), bevel=.04)
    m.box(INK, (2, 1.89, .055), (0, .04, .971), bevel=.02)
    for x in (-.86, .86):
        m.box(INK, (.095, .12, .25), (x, -.92, .75), bevel=.026)
    m.box(STEEL, (.29, .085, .094), (0, -.927, .827), bevel=.03)
    m.box(CYAN, (.22, .032, .043), (0, -.976, .827), bevel=.013)
    for x in (-.76, -.59, .59, .76):
        m.box(YELLOW, (.087, .052, .22), (x, -1, .29), rot=(0, 28, 0))
    return m


def cladding():
    m = model('cladding')
    m.box(SLATE, (2, 2, .94), (0, 0, .47), bevel=.042)
    m.box(TRIM, (2, 2.025, .072), (0, 0, .964), bevel=.029)
    for x in (-.88, 0, .88):
        m.box(STEEL, (.075, .10, .73), (x, -1, .49), bevel=.026)
    m.box(INK, (1.95, .10, .105), (0, -1, .16), bevel=.025)
    for x in (-.61, .61):
        m.box(INK, (.31, .12, .065), (x, -1, .77), bevel=.023)
        m.box(AMBER, (.22, .055, .034), (x, -1.068, .77), bevel=.011)
    return m


def masonry():
    m = model('masonry')
    m.box(BRICK, (2, 2, 1), (0, 0, .5), bevel=.047)
    for z in (.085, .84, .962):
        m.box(STEEL, (2, 2.04, .065), (0, 0, z), bevel=.022)
    for x in (-.78, .78):
        m.box(SLATE, (.17, .10, .73), (x, -1, .452), bevel=.038)
    m.box(INK, (.45, .11, .10), (0, -1, .66), bevel=.029)
    m.box(CORAL, (.34, .046, .039), (0, -1.07, .66), bevel=.015)
    return m


def crane():
    m = model('crane')
    m.box(INK, (3.6, 3.6, .62), (0, 0, .31), bevel=.17)
    m.box(STEEL, (3.15, 3.15, .45), (0, 0, .79), bevel=.11)
    for x in (-1.15, 1.15):
        for y in (-1.15, 1.15):
            beam(m, RUST, (x, y, 1), (x * .68, y * .68, 13), .235)
    for j in range(5):
        z = 1.1 + 2.25 * j
        w = 1.15 - .066 * j
        for side in (-1, 1):
            beam(m, YELLOW, (-w, side * w, z), (w, side * w, z), .15)
            beam(m, YELLOW, (side * w, -w, z), (side * w, w, z), .15)
            beam(m, YELLOW, (side * w, -w, z), (side * (w - .06), w - .06, z + 2.25), .15)
            beam(m, YELLOW, (-w, side * w, z + 2.25), (w, side * w, z), .15)
    for y in (-.73, .73):
        for z in (11.9, 13.04):
            beam(m, YELLOW, (-4.35, y, z), (13.7, y, z), .26)
        for j in range(9):
            x = -4.3 + j * 2
            beam(m, RUST, (x, y, 11.94), (x + 1.98, y, 13.02), .15)
            beam(m, YELLOW, (x, y, 13.03), (x + 1.98, y, 13.03), .12)
        beam(m, STEEL, (0, 0, 16.4), (13.6, y, 13.01), .075)
        beam(m, STEEL, (0, 0, 16.4), (-4.35, y, 13.01), .075)
    for x in (-3.15, 5.1, 11.25):
        m.box(INK, (1.04, 1.55, .28), (x, 0, 11.9), bevel=.063)
        m.box(AMBER, (.78, 1.27, .072), (x, 0, 11.735), bevel=.022)
    m.box(STEEL, (2.1, 1.85, 1.85), (-4.1, 0, 12.35), bevel=.14)
    m.box(YELLOW, (2.42, 1.62, 1.85), (1.35, -.92, 12.17), bevel=.15)
    m.box(0x3A647D, (1.85, .085, .77), (1.35, -1.751, 12.51), bevel=.072)
    m.box(TRIM, (.13, .095, .74), (1.34, -1.798, 12.51), bevel=.028)
    m.box(INK, (.78, 1.22, .44), (8.5, 0, 11.65), bevel=.10)
    beam(m, YELLOW, (0, 0, 12.95), (0, 0, 16.3), .36)
    m.cyl(INK, .22, .17, (0, 0, 16.2), seg=12)

    cable = model('hoist_cable')
    for y in (-.2, .2):
        cable.cyl(STEEL, .028, 1, (0, y, -1), seg=8)
    wire = bake(cable)
    load = model('hoist_load')
    load.box(INK, (1.02, .66, .6), (0, 0, -.28), bevel=.095)
    load.box(YELLOW, (.77, .72, .21), (0, 0, -.32), bevel=.045)
    for x in (-.93, .93):
        for y in (-.60, .60):
            beam(load, STEEL, (0, 0, -.57), (x, y, -1.65), .044)
    load.box(SLATE, (2.12, 1.42, .72), (0, 0, -2), bevel=.14)
    for x in (-.74, .74):
        load.box(YELLOW, (.17, 1.48, .75), (x, 0, -2), bevel=.045)
    payload = bake(load)

    lens = model('crane_lens')
    lens.cyl(AMBER, .14, .27, (0, 0, -.1), r2=.10, seg=12)
    bulb = bake(lens, *GLOW)
    for i, frame in enumerate(FRAMES):
        a = i * pi / 4
        length = 3.65 + .85 * sin(a)
        key(wire, frame, loc=(8.5, 0, 11.49), scale=(1, 1, length))
        key(payload, frame, loc=(8.5, 0, 11.49 - length), rot=(0, 0, .13 * sin(a)))
        key(bulb, frame, loc=(0, 0, 16.44), scale=1 + .18 * sin(a * 2))
    return m, [wire, payload, bulb]


def trailer():
    m = model('trailer')
    m.box(INK, (8.7, 2.7, .42), (.13, 0, .78), bevel=.13)
    m.box(STONE, (6.5, 2.8, 2.48), (-.76, 0, 2.31), bevel=.18)
    m.box(SLATE, (6.48, 2.87, .20), (-.76, 0, 1.14), bevel=.07)
    for y in (-1.407, 1.407):
        for x in (-3.67, -2.8, -1.45, -.1, 1.25, 2.21):
            m.box(TRIM, (.083, .12, 2.1), (x, y, 2.31), bevel=.025)
        for x in (-3.75, -1.1, 1.6):
            m.box(CORAL, (.22, .088, .105), (x, y, 1.24), bevel=.028)
    m.box(0x465681, (2.19, 2.66, 1.3), (3.4, 0, 1.35), bevel=.24)
    m.box(0x465681, (1.49, 2.52, 1.38), (2.92, 0, 2.20), bevel=.21)
    m.box(0x487189, (.17, 2.31, .52), (3.68, 0, 2.42), rot=(0, -12, 0), bevel=.09)
    m.box(INK, (.15, 1.33, .56), (4.49, 0, 1.46), bevel=.08)
    for z in (1.29, 1.41, 1.53, 1.65):
        m.box(TRIM, (.061, 1.25, .032), (4.58, 0, z), bevel=.01)
    for y in (-.97, .97):
        m.box(AMBER, (.096, .32, .21), (4.49, y, 1.25), bevel=.062)
    for x in (-2.98, -1.91, 3.41):
        for y in (-1.22, .91):
            m.wheel((x, y, .53), r=.52, w=.33)
    return m


def depot():
    m = model('depot')
    m.box(SLATE, (7.55, 3.76, 3.48), (0, 0, 1.74), bevel=.16)
    m.box(INK, (7.68, 3.91, .31), (0, 0, 3.43), bevel=.08)
    for x in (-3.26, -1.27, 1.27, 3.26):
        m.box(STEEL, (.33, .37, 3.12), (x, -1.9, 1.64), bevel=.075)
    for x in (-2.19, 2.19):
        m.box(INK, (1.28, .25, 2.54), (x, -1.93, 1.41), bevel=.082)
        for z in (.36, .80, 1.24, 1.68, 2.12):
            m.box(TRIM, (1.05, .064, .084), (x, -2.08, z), bevel=.025)
        m.box(AMBER, (.80, .09, .12), (x, -2.10, 2.91), bevel=.025)
    m.box(0x536F7F, (1.76, .14, 1.14), (0, -1.94, 2.02), bevel=.064)
    return m


def canopy():
    m = model('canopy')
    m.box(STEEL, (8.45, 4.12, .36), (0, 0, .20), bevel=.095)
    for y in (-2.045, 2.045):
        m.box(SLATE, (8.52, .22, .56), (0, y, .29), bevel=.086)
    for x in (-3.75, -2.5, -1.25, 0, 1.25, 2.5, 3.75):
        m.box(INK, (.16, 3.86, .10), (x, 0, .05), bevel=.032)
    for y in (-1.56, 1.56):
        m.box(INK, (7.80, .31, .10), (0, y, .053), bevel=.034)
        for x in (-2.85, -1.4, 0, 1.4, 2.85):
            m.box(CYAN, (.88, .15, .06), (x, y, .03), bevel=.024)
    m.box(INK, (4.9, .084, .35), (0, -2.162, .335), bevel=.025)
    m.text(CYAN, 'CABAL ARCADE', .30, .018, (0, -2.209, .265))
    return m


def fan():
    m = model('fan')
    m.box(INK, (2.89, 1.8, .25), (0, 0, .125), bevel=.081)
    m.box(STEEL, (2.79, 1.74, 1.69), (0, 0, 1.05), bevel=.16)
    m.box(INK, (1.91, .18, 1.48), (-.27, -.86, 1.05), bevel=.087)
    m.cyl(INK, .70, .09, (-.30, -.97, 1.03), (90, 0, 0), seg=20)
    for z in (.52, .77, 1.02, 1.27, 1.52):
        m.box(INK, (.33, .09, .085), (1.05, -.893, z), bevel=.025)
    m.box(CYAN, (.26, .08, .071), (1.06, -.909, 1.68), bevel=.022)
    rotor = model('fan_rotor')
    rotor.cyl(TRIM, .179, .13, (0, 0, 0), seg=14)
    for i in range(7):
        a = 2 * pi * i / 7
        rotor.box(TRIM, (.51, .195, .071), (.37 * cos(a), .37 * sin(a), .036),
                  rot=(15, 0, i * 360 / 7 + 16), bevel=.028)
    part = bake(rotor)
    pivot = bpy.data.objects.new('skyline_fan_pivot', None)
    bpy.context.scene.collection.objects.link(pivot)
    pivot.location = (-.30, -1.075, 1.03)
    pivot.rotation_euler.x = pi / 2
    part.parent = pivot
    for i, frame in enumerate(FRAMES):
        key(part, frame, rot=(0, 0, i * pi / 2))
    lip = model('fan_lip')
    ring(lip, TRIM, .678, .075, 0, segments=20, depth=.064)
    bezel = bake(lip)
    bezel.location = (-.30, -1.101, 1.03)
    bezel.rotation_euler.x = pi / 2
    return m, [pivot, part, bezel]


def shop():
    m = model('shop')
    m.box(BRICK, (7.64, 4.25, 5.65), (0, 0, 2.825), bevel=.16)
    m.box(STEEL, (7.82, 4.36, .26), (0, 0, 5.52), bevel=.08)
    m.box(INK, (7.51, .22, .39), (0, -2.14, 4.94), bevel=.063)
    for x in (-3.45, -.88, .88, 3.45):
        m.box(STEEL, (.26, .28, 2.75), (x, -2.19, 3.89), bevel=.067)
    m.box(INK, (1.53, .15, 2.41), (0, -2.21, 3.73), bevel=.061)
    m.box(0x446C82, (1.17, .09, .95), (0, -2.30, 4.03), bevel=.055)
    for x in (-2.19, 2.19):
        m.box(INK, (2.32, .22, 1.46), (x, -2.19, 3.91), bevel=.085)
        m.box(WINDOW, (2.11, .087, 1.20), (x, -2.323, 3.91), bevel=.058)
        m.box(CORAL, (1.91, .052, .098), (x, -2.381, 4.31), bevel=.024)
        m.box(TRIM, (.105, .09, 1.15), (x, -2.390, 3.91), bevel=.03)
    return m


def lamp():
    m = model('lamp')
    m.cyl(INK, .30, .21, (0, 0, 0), seg=12)
    m.cyl(STEEL, .137, 5.38, (0, 0, .18), r2=.094, seg=12)
    beam(m, STEEL, (0, 0, 5.45), (0, -.79, 5.84), .152)
    m.box(INK, (.54, .87, .25), (0, -1.05, 5.82), bevel=.099)
    m.box(AMBER, (.35, .59, .078), (0, -1.09, 5.69), bevel=.026)
    return m


def tower():
    m = model('tower')
    m.box(SLATE, (5.6, 4.1, 10.4), (0, 0, 5.2), bevel=.17)
    m.box(STEEL, (4.18, 3.51, 12.15), (0, 0, 6.075), bevel=.17)
    m.box(SLATE, (2.26, 2.23, 13.28), (0, 0, 6.64), bevel=.13)
    m.box(INK, (1.18, 1.22, .41), (0, 0, 13.26), bevel=.078)
    m.cyl(STEEL, .064, 1.12, (0, 0, 13.43), seg=8)
    m.box(CORAL, (.17, .17, .15), (0, 0, 14.53), bevel=.038)
    for y in (-2.055, 2.055):
        for x in (-2.62, -.86, .86, 2.62):
            m.box(TRIM, (.13, .15, 9.83), (x, y, 5.3), bevel=.045)
        for z in (2.85, 6.2, 9.21):
            m.box(INK, (5.55, .16, .13), (0, y, z), bevel=.029)
    return m


def slab():
    m = model('slab')
    m.box(SLATE, (7.5, 4.4, 8.85), (0, 0, 4.425), bevel=.23)
    m.box(0x46526E, (4.22, 3.68, 1.32), (-.94, 0, 9.46), bevel=.14)
    m.box(INK, (7.60, 4.53, .23), (0, 0, 8.78), bevel=.07)
    for y in (-2.22, 2.22):
        for x in (-3.37, -.43, 1.18, 3.37):
            m.box(STEEL, (.17, .21, 8.18), (x, y, 4.39), bevel=.046)
    for x in (.67, 2.43):
        m.box(INK, (1.23, 1.51, .59), (x, 0, 9.18), bevel=.095)
    return m


def spire():
    """Distant stepped tower with a thin beacon and a few lit office bands."""
    m = model('spire')
    m.box(0x303C5B, (6.8, 5.4, 11), (0, 0, 5.5))
    m.box(0x3D506E, (4.5, 4.2, 6.2), (.55, 0, 14.1))
    m.box(INK, (1.4, 1.25, 1.5), (.65, 0, 17.95))
    m.box(STEEL, (.16, .16, 3.2), (.65, 0, 19.25))
    m.box(CORAL, (.20, .20, .18), (.65, 0, 20.9))
    for side in (-1, 1):
        for height, x, face in ((4.4, -1.85, 2.7), (8.2, .9, 2.7), (13.7, .5, 2.1), (15.4, 1.35, 2.1)):
            m.box(CYAN, (1.05, .07, .17), (x, side * face, height))
        m.box(AMBER, (.07, 2.7, .16), (side * 3.4, .15, 6.1))
    return m


def midrise():
    """Wide, low silhouette for the blocks below the freeway and skybridges."""
    m = model('midrise')
    m.box(0x344363, (9.4, 5.3, 7.4), (0, 0, 3.7))
    m.box(0x495572, (5.4, 3.9, 2.1), (-1.4, -.3, 8.45))
    m.box(INK, (9.6, 5.5, .26), (0, 0, 7.45))
    m.box(INK, (1.9, 1.65, .64), (2.6, .85, 7.9))
    for side in (-1, 1):
        for x, height in ((-2.6, 2.3), (.3, 4.6), (2.8, 2.3)):
            m.box(AMBER, (1.45, .07, .17), (x, side * 2.65, height))
        m.box(CYAN, (2.15, .07, .18), (-1.6, side * 1.95 - .3, 8.35))
    return m


def skybridge():
    m = model('skybridge')
    m.box(0x394765, (12, 1.84, 1.48), (0, 0, .74))
    for side in (-1, 1):
        m.box(INK, (12, .085, .27), (0, side * .93, 1.43))
        for x in (-4.2, -1.4, 1.4, 4.2):
            m.box(CYAN, (1.45, .05, .32), (x, side * .93, .89))
    return m


def main():
    clear_scene()
    MATERIALS.clear()
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = FRAMES[0], FRAMES[-1]
    landmarks = (spire, midrise, skybridge)
    makers = (barrier, cladding, masonry, crane, trailer, depot, canopy, fan, shop, lamp, tower, slab, *landmarks)
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    landmarks_only = '--landmarks-only' in args
    for i, make in enumerate(makers):
        result = make()
        mesh, motion = result if isinstance(result, tuple) else (result, [])
        obj = bake(mesh, *GLOW)
        objects = [obj, *motion]
        scene.frame_set(scene.frame_start)
        if not landmarks_only or make in landmarks:
            export(objects, 'props', mesh.name, animated=bool(motion), compressed=True)
        collection = bpy.data.collections.new(mesh.name)
        scene.collection.children.link(collection)
        root = bpy.data.objects.new(f'{mesh.name} | Editable prop', None)
        collection.objects.link(root)
        for part in objects:
            collection.objects.link(part)
            scene.collection.objects.unlink(part)
            if not part.parent:
                part.parent = root
        root.location = ((i % 4) * 19, (i // 4) * 16, 0)
        collection.instance_offset = root.location
        collection.asset_mark()
    scene.frame_set(scene.frame_start)
    scene.name = 'Vape Cabal Skyline | Asset Library'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.color_type = 'VERTEX'
            region = area.spaces.active.region_3d
            region.view_location = (29, 23, 4)
            region.view_distance = 108
            region.view_rotation = Vector((-.20, 1, -.82)).to_track_quat('-Z', 'Y')
    target = Path(__file__).resolve().parents[1] / 'vape_cabal_skyline.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(target), compress=True)


if __name__ == '__main__':
    main()
