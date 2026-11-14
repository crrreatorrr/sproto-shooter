"""Build the Government Office prop library and packed runtime GLBs."""
from math import cos, degrees, pi, sin
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_campaign_polish import MATERIALS, bake, beam, ring
from build_cartoon_kit import Model, clear_scene, export, key, srgb

INK, NAVY, SLATE, STEEL = 0x202C43, 0x344763, 0x597184, 0x93A8B8
STONE, CREAM, BRASS = 0xAAA8A3, 0xDED4BB, 0x9F8059
GLASS, PAPER, LEAF = 0x427F8A, 0xD9D5BC, 0x497367
CYAN, MINT, AMBER, RED = 0x9EEFFF, 0x6CF6CF, 0xFFD590, 0xFF5061
GLOW = (
    ('office_cyan', (CYAN,), 0x5FDBFF, 1.0),
    ('office_mint', (MINT,), 0x55F7C5, .64),
    ('office_amber', (AMBER,), 0xFFAD49, .82),
    ('office_red', (RED,), 0xFF334C, 1.04),
)
FRAMES = range(1, 146, 18)


def model(name):
    return Model('office_' + name, outline=0)


def facade():
    """Two units long and deep, one tall. Open above the sill for interior display bays."""
    m = model('facade')
    m.box(SLATE, (2, 2, .26), (0, 0, .13), bevel=.033)
    m.box(STONE, (2, 2.07, .045), (0, 0, .257), bevel=.018)
    for x in (-.962, .962):
        m.box(NAVY, (.078, 1.97, .72), (x, 0, .625), bevel=.022)
    m.box(NAVY, (2, 1.97, .08), (0, 0, .96), bevel=.020)
    m.box(INK, (1.96, .052, .082), (0, -.997, .065), bevel=.016)
    return m


def wall():
    """Full solid wall panel with baseboard and recessed framed detail."""
    m = model('wall')
    m.box(SLATE, (2, 2, .96), (0, 0, .48), bevel=.034)
    m.box(NAVY, (2, 2.05, .07), (0, 0, .964), bevel=.019)
    m.box(INK, (2, 2.044, .064), (0, 0, .066), bevel=.017)
    for x in (-.966, .966):
        m.box(STEEL, (.058, .12, .81), (x, -.979, .49), bevel=.012)
    m.box(INK, (.33, .063, .047), (.64, -1, .77), bevel=.012)
    m.box(CYAN, (.248, .032, .018), (.64, -1.035, .77), bevel=.006)
    return m


def parapet():
    m = model('parapet')
    m.box(0x727B90, (2, 2, .94), (0, 0, .47), bevel=.057)
    m.box(NAVY, (2, 2.09, .085), (0, 0, .957), bevel=.025)
    m.box(INK, (2, 2.12, .071), (0, 0, .057), bevel=.026)
    for x in (-.91, .91):
        m.box(STEEL, (.088, .10, .74), (x, -1, .53), bevel=.022)
    m.box(INK, (.28, .102, .075), (0, -1.035, .77), bevel=.018)
    m.box(RED, (.16, .030, .037), (0, -1.095, .77), bevel=.010)
    return m


def soffit():
    """An 8 m ceiling bay with recessed coffer trim and actual fixture lenses."""
    m = model('soffit')
    m.box(STONE, (8.04, 24.50, .48), (0, 0, .68), bevel=.109)
    for x in (-3.82, 0, 3.82):
        m.box(NAVY, (.30, 24.22, .33), (x, 0, .32), bevel=.061)
    for y in (-10.5, -6, 0, 6, 10.5):
        m.box(STEEL, (7.95, .25, .29), (0, y, .345), bevel=.05)
    for y in (-7.7, -2.9, 2.9, 7.7):
        m.box(INK, (3.16, .65, .17), (1.78, y, .28), bevel=.063)
        m.box(CYAN, (2.84, .43, .065), (1.78, y, .207), bevel=.026)
    return m


def skirt():
    """Floor for the wall-side display bays and the transition beyond the active slab."""
    m = model('skirt')
    m.box(0xA7AAAC, (2, 2, .12), (0, 0, .06), bevel=.02)
    return m


def pilaster():
    m = model('pilaster')
    m.box(INK, (1.05, 1.06, .51), (0, 0, .255), bevel=.103)
    m.box(STONE, (.92, .93, 7.38), (0, 0, 4.16), bevel=.103)
    m.box(STEEL, (1.11, 1.10, .19), (0, 0, 7.66), bevel=.054)
    for z in (1.53, 2.73, 4.76, 6.77):
        m.box(NAVY, (.87, .94, .035), (0, 0, z), bevel=.013)
    m.box(INK, (.30, .13, .75), (0, -.49, 2.95), bevel=.055)
    m.box(AMBER, (.16, .043, .57), (0, -.565, 2.95), bevel=.018)
    return m


def portal():
    m = model('portal')
    for y in (-11.21, 11.21):
        m.box(STONE, (2.0, .99, 6.83), (0, y, 3.415), bevel=.12)
        m.box(NAVY, (.18, 1.05, 6.75), (-.98, y, 3.43), bevel=.057)
    m.box(NAVY, (2.0, 23.35, .93), (0, 0, 6.37), bevel=.14)
    m.box(INK, (.115, 11.73, .62), (-1.021, 0, 6.30), bevel=.07)
    for y in (-3.3, 3.3):
        m.box(SLATE, (.165, .72, 4.23), (.69, y, 2.115), bevel=.08)
    m.box(NAVY, (.17, 6.48, .28), (.66, 0, 4.15), bevel=.065)
    m.box(CYAN, (.168, 1.85, .12), (.62, 0, 3.92), bevel=.022)
    for y in (-8.0, 8.0):
        m.box(CYAN, (.119, 1.86, .13), (-1.019, y, 6.35), bevel=.029)
    start = len(m.verts)
    m.text(CYAN, 'GOVERNMENT OFFICE', .36, .022, (0, 0, 0))
    for i in range(start, len(m.verts)):
        x, y, z = m.verts[i]
        m.verts[i] = (y - 1.099, -x, z + 6.18)
    return m


def crt(m, x, y, z, scale=1):
    def part(color, size, offset, bevel):
        m.box(color, tuple(v * scale for v in size),
              (x + offset[0] * scale, y + offset[1] * scale, z + offset[2] * scale), bevel=bevel * scale)
    part(INK, (.56, .50, .08), (0, .03, .047), .026)
    part(CREAM, (.75, .57, .62), (0, 0, .398), .098)
    part(NAVY, (.59, .095, .41), (0, -.296, .428), .053)
    part(GLASS, (.50, .047, .33), (0, -.35, .431), .038)
    part(MINT, (.054, .024, .034), (.26, -.342, .188), .010)
    part(CREAM, (.64, .26, .063), (0, -.62, .037), .018)
    for dy in (-.70, -.61, -.53):
        part(STEEL, (.53, .023, .014), (0, dy, .073), .004)


def reception():
    m = model('reception')
    for i in range(-3, 4):
        x = i * .89
        y = x * x * .081
        rot = (0, 0, degrees(x * .162))
        m.box(INK, (1.06, 1.30, .17), (x, y, .09), rot=rot, bevel=.037)
        m.box(STONE, (1.08, 1.27, 1.36), (x, y, .79), rot=rot, bevel=.059)
        m.box(NAVY, (1.14, 1.35, .16), (x, y, 1.35), rot=rot, bevel=.037)
        m.box(CREAM, (1.14, 1.39, .095), (x, y, 1.48), rot=rot, bevel=.027)
    for x in (-2.0, 1.95):
        crt(m, x, .38, 1.53, .80)
        for i in range(3):
            m.box((INK, PAPER, BRASS)[i], (.54, .37, .038), (x + .61, .30, 1.57 + i * .04), rot=(0, 0, i * 7), bevel=.008)
    m.box(INK, (2.28, .30, .32), (0, -.581, .70), bevel=.06)
    m.text(AMBER, 'RECEPTION', .23, .019, (0, -.748, .62))
    return m


def clock():
    m = model('clock')
    m.box(GLASS, (5.7, .28, 3.56), (0, .04, 1.78), bevel=.12)
    for x in (-2.71, -1.35, 0, 1.35, 2.71):
        m.box(STEEL, (.083, .29, 3.37), (x, -.098, 1.78), bevel=.019)
    m.box(CYAN, (5.50, .09, .072), (0, -.151, 3.32), bevel=.022)
    m.cyl(BRASS, .79, .17, (0, -.165, 2.26), (90, 0, 0), seg=26)
    m.cyl(CREAM, .705, .067, (0, -.336, 2.26), (90, 0, 0), seg=26)
    for i in range(12):
        a = i * pi / 6
        m.box(INK, (.066, .043, .104), (.586 * sin(a), -.414, 2.26 + .586 * cos(a)),
              rot=(0, i * 30, 0), bevel=.013)
    for length, angle in ((.30, 310), (.45, 40)):
        a = angle * pi / 180
        m.box(INK, (.068, .042, length), (.45 * length * sin(a), -.435, 2.26 + .45 * length * cos(a)),
              rot=(0, angle, 0), bevel=.012)
    hands = model('clock_hands')
    hands.box(BRASS, (.035, .044, .57), (0, -.019, .24), bevel=.010)
    hands.cyl(INK, .069, .076, (0, .01, 0), (90, 0, 0), seg=12)
    part = bake(hands)
    for i, f in enumerate(FRAMES):
        key(part, f, loc=(0, -.45, 2.26), rot=(0, i * pi / 4, 0))
    return m, [part]


def cubicle():
    m = model('cubicle')
    m.box(NAVY, (3.0, .17, 1.62), (0, .87, .83), bevel=.071)
    m.box(SLATE, (.17, 1.42, 1.60), (1.43, .17, .82), bevel=.068)
    m.box(STEEL, (3.04, .20, .088), (0, .87, 1.64), bevel=.032)
    m.box(CREAM, (2.84, .95, .17), (0, .25, 1.05), bevel=.060)
    for x in (-1.09, 1.09):
        m.box(INK, (.45, .73, .87), (x, .23, .47), bevel=.072)
        for z in (.29, .49, .69):
            m.box(STEEL, (.36, .044, .139), (x, -.15, z), bevel=.027)
            m.box(NAVY, (.16, .039, .025), (x, -.185, z + .022), bevel=.009)
    crt(m, -.47, .41, 1.143, .83)
    for i in range(5):
        m.box((CREAM, PAPER, BRASS)[i % 3], (.40, .37, .037), (.87, .26, 1.18 + i * .038), rot=(0, 0, i * 4), bevel=.01)
    for x in (.36, .72, 1.07):
        m.box(PAPER, (.16, .035, .21), (x, .765, 1.40), rot=(0, x * 7, 0), bevel=.008)
    m.cyl(INK, .39, .115, (.12, -.64, .03), seg=12)
    m.cyl(STEEL, .092, .50, (.12, -.64, .14), seg=10)
    m.box(NAVY, (.49, .47, .14), (.12, -.64, .64), bevel=.064)
    m.box(SLATE, (.48, .17, .50), (.12, -.89, .87), rot=(11, 0, 0), bevel=.069)
    return m


def elevator():
    m = model('elevator')
    m.box(NAVY, (4.16, .80, 4.15), (0, 0, 2.075), bevel=.18)
    m.box(INK, (3.31, .14, 3.14), (0, -.414, 1.78), bevel=.093)
    for x in (-.77, .77):
        m.box(STEEL, (1.49, .073, 2.91), (x, -.493, 1.765), bevel=.052)
        m.box(BRASS, (.074, .04, 2.76), (x * .19, -.539, 1.77), bevel=.014)
    m.box(INK, (1.08, .12, .46), (0, -.45, 3.61), bevel=.05)
    m.box(AMBER, (.21, .047, .21), (0, -.525, 3.59), rot=(0, 45, 0), bevel=.015)
    m.box(NAVY, (.23, .08, .49), (1.86, -.46, 1.26), bevel=.025)
    m.box(CYAN, (.087, .032, .11), (1.86, -.51, 1.32), bevel=.014)
    return m


def server():
    m = model('server')
    m.box(NAVY, (1.54, 1.24, 3.02), (0, 0, 1.51), bevel=.137)
    m.box(INK, (1.35, .145, 2.75), (0, -.622, 1.51), bevel=.061)
    for x in (-.64, .64):
        m.box(STEEL, (.095, .09, 2.63), (x, -.70, 1.49), bevel=.024)
    for row in range(5):
        z = .54 + row * .42
        m.box(SLATE, (1.13, .103, .28), (0, -.724, z), bevel=.033)
        for x in (-.36, -.17, .055, .295):
            m.box(AMBER if row % 3 == 0 else MINT, (.074, .036, .044), (x, -.788, z + .018))
        m.box(INK, (.13, .063, .114), (.43, -.773, z), bevel=.019)
    m.box(CYAN, (1.04, .062, .135), (0, -.714, 2.78), bevel=.027)
    for x in (-.743, .743):
        for z in (.47, .57, .67, .77, .87):
            m.box(INK, (.043, .50, .041), (x, .064, z))
    return m


def conduit():
    m = model('conduit')
    points = [(-3.7, 0, 0), (-3.7, 0, 3.15), (-3.54, 0, 3.56),
              (-3.17, 0, 3.83), (-2.70, 0, 3.91), (3.7, 0, 3.91)]
    for a, b in zip(points, points[1:]):
        start, end = Vector(a), Vector(b)
        d = end - start
        rot = tuple(degrees(v) for v in d.to_track_quat('Z', 'Y').to_euler())
        m.cyl(STEEL, .225, d.length + .125, start - d.normalized() * .0625, rot, seg=12)
    for x in (-2.63, -.85, 1.30, 3.15):
        m.cyl(NAVY, .30, .17, (x, 0, 3.91), (0, 90, 0), seg=12)
        m.box(INK, (.25, .43, .51), (x, .38, 3.91), bevel=.065)
    m.cyl(SLATE, .31, .18, (-3.7, 0, .055), seg=12)
    return m


def planter():
    m = model('planter')
    m.box(STONE, (.88, .88, .68), (0, 0, .34), bevel=.14)
    m.box(INK, (.77, .77, .073), (0, 0, .68), bevel=.056)
    rng = Random(108)
    for i in range(10):
        a = i * pi * .76
        r = rng.uniform(.32, .58)
        x, y, z = r * cos(a), r * sin(a), rng.uniform(.89, 1.55)
        beam(m, LEAF, (0, 0, .69), (x, y, z), .041)
        m.ico((LEAF, 0x649482, 0x82A38B)[i % 3], .36, (x, y, z), scale=(.73, .36, 1.23), sub=1)
    return m


def fan():
    m = model('fan')
    m.box(STONE, (3.57, 2.85, .53), (0, 0, .265), bevel=.14)
    m.box(NAVY, (3.32, 2.61, 2.55), (0, 0, 1.77), bevel=.18)
    m.cyl(INK, 1.05, .094, (0, -1.311, 1.73), (90, 0, 0), seg=20)
    m.box(INK, (3.16, .12, .13), (0, -1.44, 2.91), bevel=.029)
    m.box(INK, (3.16, .12, .13), (0, -1.44, .65), bevel=.029)
    for x in (-1.46, 1.46):
        m.box(STEEL, (.14, .17, 2.15), (x, -1.47, 1.75), bevel=.046)
        m.cyl(INK, .19, .075, (x, -1.28, 3.02), seg=10)
        m.cyl(RED, .132, .18, (x, -1.28, 3.085), r2=.115, seg=12)
    for x in (-.77, -.46, -.16, .16, .46, .77):
        m.box(STEEL, (.036, .043, 1.65), (x, -1.542, 1.74), bevel=.010)
    for z in (1.12, 1.42, 1.72, 2.02, 2.32):
        m.box(STEEL, (1.89, .043, .036), (0, -1.55, z), bevel=.010)
    rotor = model('fan_rotor')
    rotor.cyl(STEEL, .18, .095, (0, 0, 0), seg=14)
    for i in range(7):
        a = i * 2 * pi / 7
        rotor.box(0xB7636F if i == 0 else SLATE, (.64, .23, .07), (.50 * cos(a), .50 * sin(a), .02),
                  rot=(11, 0, i * 360 / 7 + 12), bevel=.043)
    part = bake(rotor)
    pivot = bpy.data.objects.new('office_fan_pivot', None)
    bpy.context.scene.collection.objects.link(pivot)
    pivot.location = (0, -1.444, 1.73)
    pivot.rotation_euler.x = pi / 2
    part.parent = pivot
    for i, f in enumerate(FRAMES):
        key(part, f, rot=(0, 0, i * pi / 2))
    return m, [pivot, part]


def dish():
    m = model('dish')
    m.box(INK, (3.6, 3.25, .34), (0, 0, .17), bevel=.14)
    m.box(STEEL, (2.84, 2.65, .76), (0, 0, .61), bevel=.16)
    m.cyl(NAVY, .82, .28, (0, 0, .96), r2=.69, seg=18)
    for x in (-1.30, 1.30):
        m.box(INK, (.26, .13, .42), (x, -1.34, .62), bevel=.051)
        m.box(AMBER, (.14, .06, .20), (x, -1.41, .67), bevel=.022)
    mount = model('dish_mount')
    mount.cyl(INK, .48, 1.53, (0, 0, 0), r2=.34, seg=14)
    mount.cyl(STEEL, .50, .88, (0, .44, 1.37), (90, 0, 0), seg=16)
    rotator = bake(mount)
    dish_head = model('dish_head')
    # The shallow parabolic shell has thickness, with rings of 24 sectors.
    segments = 24
    levels = ((.21, 0), (.86, .12), (1.55, .36), (2.17, .75))
    for thickness in (0, -.095):
        for radius, z in levels:
            for i in range(segments):
                a = i * 2 * pi / segments
                dish_head.verts.append((radius * cos(a), radius * sin(a), z + thickness))
    def facet(face, color):
        dish_head.faces.append(face)
        dish_head.colors.append(srgb(color))
        dish_head.smooth.append(False)

    shell = len(levels) * segments
    for row in range(len(levels) - 1):
        for i in range(segments):
            j = (i + 1) % segments
            a, b = row * segments + i, row * segments + j
            face = [a, a + segments, b + segments, b]
            facet(face, (STEEL, 0xACBCCB, 0x8496AF)[(i // 3 + row) % 3])
            facet([k + shell for k in reversed(face)], SLATE)
    for i in range(segments):
        a = shell - segments + i
        b = shell - segments + (i + 1) % segments
        facet([a, a + shell, b + shell, b], NAVY)
    dish_head.cyl(INK, .25, .22, (0, 0, -.11), seg=14)
    for i in range(3):
        a = i * 2 * pi / 3
        beam(dish_head, NAVY, (1.46 * cos(a), 1.46 * sin(a), .36), (0, 0, 1.77), .098)
    dish_head.cyl(RED, .143, .24, (0, 0, 1.72), r2=.117, seg=12)
    bowl = bake(dish_head, *GLOW)
    bowl.location = (0, 0, 1.54)
    bowl.rotation_euler.x = .66
    bowl.parent = rotator
    for i, f in enumerate(FRAMES):
        a = i * pi / 4
        key(rotator, f, loc=(0, 0, 1.23), rot=(0, 0, .56 * sin(a)))
    return m, [rotator, bowl]


def tower():
    m = model('tower')
    m.box(NAVY, (5.9, 5.2, 12.25), (0, 0, 6.125), bevel=.13)
    m.box(INK, (4.46, 4.18, 1.35), (.28, 0, 12.31), bevel=.089)
    m.box(SLATE, (6.04, 5.36, .24), (0, 0, 11.85), bevel=.057)
    for x in (-2.55, -1.09, 1.09, 2.55):
        for y in (-2.63, 2.63):
            m.box(SLATE, (.102, .16, 10.72), (x, y, 6.27))
    for i in range(4):
        for y in (-2.64, 2.64):
            for x in (-1.83, .18, 1.80):
                z = 2.3 + i * 2.34 + abs(x) * .25
                m.box(0xBDB28C if (i + int(x * 2)) % 3 == 0 else GLASS, (.32, .065, .55), (x, y, z))
    return m


def pad():
    m = model('pad')
    paint = 0xC5CDDA
    for y in (-4.6, 4.6):
        m.box(paint, (9.75, .126, .013), (0, y, .0065))
    for x in (-4.8, 4.8):
        m.box(paint, (.126, 9.2, .013), (x, 0, .0065))
    for y in (-.98, .98):
        m.box(paint, (3.6, .245, .013), (0, y, .0065))
    m.box(paint, (.268, 1.92, .013), (0, 0, .0065))
    for x in (-4.4, 4.4):
        for y in (-4.2, 4.2):
            m.box(BRASS, (.43, .39, .014), (x, y, .007))
    return m


def laser():
    """Flush caution ring with a floating scan disc centred on the laser's authored height."""
    m = model('laser')
    ring(m, INK, 1.22, .133, .015, segments=28, depth=.030)
    for i in range(12):
        a = i * pi / 6
        m.box(RED if i % 3 else AMBER, (.108, .135, .035),
              (1.221 * cos(a), 1.221 * sin(a), .027), rot=(0, 0, i * 30), bevel=.011)
    m.cyl(NAVY, .237, .074, (0, 0, 0), r2=.173, seg=12)
    m.cyl(RED, .112, .019, (0, 0, .075), seg=12)
    scan = model('laser_scan')
    ring(scan, RED, .88, .042, 0, segments=28, depth=.031)
    scan.ico(RED, .071, (0, 0, 0), sub=2)
    rotor = bake(scan, *GLOW)
    for i, f in enumerate(FRAMES):
        a = i * pi / 4
        key(rotor, f, loc=(0, 0, 1.20 + .14 * sin(a)), scale=1 + .075 * sin(2 * a))
    return m, [rotor]


def annex():
    """Two stepped civic buildings for the rooftop's middle-distance skyline."""
    m = model('annex')
    m.box(NAVY, (12.4, 7.8, 9.4), (0, 0, 4.7))
    m.box(SLATE, (8.6, 6.4, 4.5), (-1.0, .2, 11.65))
    m.box(INK, (5.1, 4.4, 2.4), (-1.45, .12, 15.1))
    m.box(STEEL, (12.5, 8.0, .28), (0, 0, 9.34))
    for y in (-3.91, 3.91):
        for z in (2.5, 4.9, 7.15):
            for x in (-3.9, -.9, 2.1, 4.8):
                m.box(AMBER if (z + x) % 3 < 1.5 else GLASS, (1.25, .052, .33), (x, y, z))
    m.box(INK, (.14, .14, 3.1), (-1.45, .12, 17.76))
    m.box(RED, (.21, .21, .15), (-1.45, .12, 19.3))
    return m


def atrium_sign():
    m = model('atrium_sign')
    m.box(NAVY, (.26, 7.0, .72), (0, 0, .36), bevel=.05)
    for y in (-3.15, 3.15):
        m.box(BRASS, (.32, .1, .62), (-.09, y, .37))
    start = len(m.verts)
    m.text(CYAN, 'PUBLIC SERVICES', .37, .018, (0, 0, 0))
    for i in range(start, len(m.verts)):
        x, y, z = m.verts[i]
        m.verts[i] = (y - .163, -x, z + .18)
    return m


def main():
    clear_scene()
    MATERIALS.clear()
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = FRAMES[0], FRAMES[-1]
    additions = (annex, atrium_sign)
    makers = (facade, wall, parapet, soffit, skirt, pilaster, portal, reception, clock, cubicle, elevator,
              server, conduit, planter, fan, dish, tower, pad, laser, *additions)
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    additions_only = '--expansion-only' in args
    for i, make in enumerate(makers):
        result = make()
        mesh, motion = result if isinstance(result, tuple) else (result, [])
        parts = [bake(mesh, *GLOW), *motion]
        scene.frame_set(scene.frame_start)
        if not additions_only or make in additions:
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
        root.location = ((i % 5) * 14, (i // 5) * 27, 0)
        collection.instance_offset = root.location
        collection.asset_mark()
    scene.frame_set(scene.frame_start)
    scene.name = 'Government Office | Asset Library'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.color_type = 'VERTEX'
            region = area.spaces.active.region_3d
            region.view_location = (27, 35, 2)
            region.view_distance = 116
            region.view_rotation = Vector((-.19, 1, -.89)).to_track_quat('-Z', 'Y')
    target = Path(__file__).resolve().parents[1] / 'government_office.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(target), compress=True)


if __name__ == '__main__':
    main()
