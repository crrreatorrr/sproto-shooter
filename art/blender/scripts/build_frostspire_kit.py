"""Build Frostspire Black Site's asset library and packed runtime GLBs."""
from math import cos, pi, sin
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_campaign_polish import MATERIALS, bake, beam, ring
from build_cartoon_kit import Model, clear_scene, export, key, srgb

INK = 0x263548
STEEL = 0x415C73
RIM = 0x66849D
CONCRETE = 0x63768D
SNOW = 0xD6E7F9
ICE = (0x407AA2, 0x5499C6, 0x79BAE1, 0xA4D7F5)
ORANGE = 0xD98035
AMBER = 0xFFCF76
LAMP = 0x82F0FF
GREEN = 0x6AF5BC
RUST = 0x9E4C28
RED = 0xF86552

CYAN_GLOW = ('frost_cyan', (LAMP,), 0x4BD9F6, 1.16)
AMBER_GLOW = ('frost_amber', (AMBER,), 0xFFC264, 1.05)
GREEN_GLOW = ('frost_green', (GREEN,), 0x49F1B5, 1.04)
RED_GLOW = ('frost_red', (RED,), 0xFF5542, .9)
GLOW = (CYAN_GLOW, AMBER_GLOW, GREEN_GLOW, RED_GLOW)
FRAMES = range(1, 98, 12)


def model(name):
    return Model(f'frost_{name}', outline=0)


def ice_mass(m, profile, seed):
    """Faceted rings with irregular sides and snow across the highest faces."""
    rng = Random(seed)
    sides = 9
    skew = [rng.uniform(.87, 1) for _ in range(sides)]
    for z, radius, x, y in profile:
        for i, k in enumerate(skew):
            a = 2 * pi * i / sides
            m.verts.append((x + radius * k * cos(a), y + radius * k * sin(a), z))
    m.faces.append(list(reversed(range(sides))))
    m.colors.append(srgb(ICE[0]))
    m.smooth.append(False)
    for tier in range(len(profile) - 1):
        for i in range(sides):
            lo, hi = tier * sides, (tier + 1) * sides
            j = (i + 1) % sides
            corners = lo + i, lo + j, hi + j, hi + i
            for face in (corners[:3], (corners[0], corners[2], corners[3])):
                m.faces.append(face)
                m.colors.append(srgb(rng.choice(ICE[:3] if tier < len(profile) - 2 else ICE[2:] + (SNOW,))))
                m.smooth.append(False)
    m.faces.append(list(range((len(profile) - 1) * sides, len(profile) * sides)))
    m.colors.append(srgb(SNOW))
    m.smooth.append(False)


def pod():
    m = model('pod')
    m.cyl(STEEL, 1.45, 2.12, (0, 0, .2), r2=1.6, seg=12, smooth=False)
    m.cyl(ORANGE, 1.52, .7, (0, 0, 2.26), r2=1.08, seg=12, smooth=False)
    m.cyl(INK, 1.18, .19, (0, 0, 2.95), r2=.89, seg=12, smooth=False)
    m.cyl(RIM, 1.49, .23, (0, 0, .39), seg=12, smooth=False)
    m.cyl(INK, 1.52, .18, (0, 0, 2.12), seg=12, smooth=False)
    for x, y, angle in ((-2.2, 1, -12), (2.2, 1, 12), (0, 2.4, 0)):
        m.box(INK, (.50, 2.3, 1.6), (x, y, .8), (0, angle, 0), bevel=.16)
        m.box(ORANGE, (.46, 1.68, .64), (x, y, 1.43), (0, angle, 0), bevel=.13)
        m.ico(SNOW, .54, (x, y + .42, .25), scale=(1.35, .85, .46))
    m.box(INK, (1.61, .22, 1.7), (0, -1.45, 1.42), bevel=.095)
    m.box(0x3A6D98, (1.34, .14, 1.02), (0, -1.57, 1.62), bevel=.064)
    for x in (-.77, .77):
        m.box(LAMP, (.11, .11, .76), (x, -1.61, 1.54), bevel=.028)
    m.box(ORANGE, (1.26, .59, .14), (0, -1.72, .26), bevel=.05)
    m.ico(SNOW, .91, (-.66, .16, 2.91), scale=(.9, .96, .30), sub=2)
    return m


def debris():
    m = model('debris')
    m.box(STEEL, (1.94, 1.94, .62), (0, 0, .31), bevel=.11)
    m.box(ORANGE, (1.98, .52, .52), (0, -.53, .64), (5, 7, 0), bevel=.09)
    m.box(RIM, (1.76, .49, .51), (0, .46, .69), (-8, 0, 0), bevel=.09)
    m.box(INK, (1.44, .22, .14), (0, -.13, .91), bevel=.04)
    return m


def boulder():
    m = model('boulder')
    ice_mass(m, [(0, .74, 0, 0), (.23, .99, 0, 0), (.64, .85, -.08, .03),
                 (.88, .58, -.12, .06), (1, .34, -.17, .06)], 5)
    return m


def spire():
    m = model('spire')
    ice_mass(m, [(0, .9, 0, 0), (.18, .97, 0, 0), (.49, .82, -.08, -.02),
                 (.73, .57, -.2, .08), (.95, .23, -.32, .12), (1, .09, -.35, .12)], 42)
    return m


def drift():
    m = model('drift')
    m.box(ICE[2], (2, 2, .82), (0, 0, .41), bevel=.16)
    m.box(SNOW, (2, 1.84, .33), (0, 0, .833), bevel=.14)
    for x, y, length, h in ((-.65, -.73, .57, .23), (.28, -.76, .92, .30),
                            (-.46, .77, .84, .31), (.58, .81, .63, .19)):
        m.ico(SNOW, 1, (x, y, .76), scale=(length / 2, .15, h), sub=1)
    return m


def glacier():
    m = model('glacier')
    m.box(ICE[0], (2, 1.95, .88), (0, 0, .44), bevel=.095)
    m.box(ICE[2], (2, 1.94, .17), (0, 0, .914), bevel=.076)
    for side in (-1, 1):
        for i in range(4):
            x = (i - 1.5) * .49
            h = (.68, .88, .78, .91)[i]
            m.cyl(ICE[1 + i % 2], .23, h, (x, side * .80, .02), r2=.20, seg=5, smooth=False)
            m.cyl(SNOW if i % 3 else ICE[3], .20, .069, (x, side * .80, h), r2=.157, seg=5, smooth=False)
    return m


def ice_floor():
    m = model('ice_floor')
    m.box(ICE[1], (2, 2, .998), (0, 0, .499), bevel=.028)
    start = len(m.verts)
    for j, row in enumerate((-1, -.31, .37, 1)):
        for i, col in enumerate((-1, -.36, .34, 1)):
            x = col + (.11 * sin(j * 3 + i) if i in (1, 2) else 0)
            y = row + (.10 * cos(i * 2 + j) if j in (1, 2) else 0)
            m.verts.append((x, y, 1))
    for j in range(3):
        for i in range(3):
            a = start + 4 * j + i
            m.faces.extend(((a, a + 1, a + 4), (a + 1, a + 5, a + 4)))
            m.colors.extend(srgb(ICE[k]) for k in (1 + (i + j) % 3, 1 + (i * 2 + j) % 3))
            m.smooth.extend((False, False))
    return m


def pine():
    m = model('pine')
    m.cyl(0x5C4B47, .29, 4.8, (0, 0, 0), r2=.12, seg=7, smooth=False)
    for i, (z, r, h) in enumerate(((1.55, 1.59, 2.7), (2.61, 1.35, 2.52), (3.8, 1.04, 2.6))):
        m.cyl(0x294D5A if i % 2 == 0 else 0x375E65, r, h, (0, 0, z), r2=.05, seg=8, smooth=False)
        m.cyl(SNOW, r * .65, h * .63, (.05, .055, z + h * .38), r2=.022, seg=8, smooth=False)
    return m


def tent():
    m = model('tent')
    m.cyl(INK, 1.7, .14, (0, 0, 0), r2=1.8, seg=10, smooth=False)
    m.cyl(RUST, 1.81, 1.26, (0, 0, .14), r2=1.8, seg=10, smooth=False)
    m.cyl(ORANGE, 2.13, 1.22, (0, 0, 1.36), r2=.34, seg=10, smooth=False)
    m.cyl(SNOW, 1.33, .69, (.025, .04, 1.91), r2=.27, seg=10, smooth=False)
    m.box(INK, (.87, .19, 1.2), (0, -1.71, .65), bevel=.12)
    m.box(AMBER, (.56, .17, .12), (0, -1.73, 1.26), bevel=.028)
    return m


def snowcat():
    m = model('snowcat')
    for y in (-1.3, 1.3):
        m.box(INK, (5.4, .6, .8), (0, y, .4), bevel=.22)
        for x in (-1.78, -.9, 0, .9, 1.78):
            m.cyl(RIM, .24, .07, (x, y - .33 if y < 0 else y + .33, .38),
                  rot=(-90 if y < 0 else 90, 0, 0), seg=8)
    m.box(ORANGE, (5, 2.4, 1.6), (0, 0, 1.2), bevel=.25)
    m.box(INK, (2.2, 2.2, 1.4), (1.04, 0, 2.57), bevel=.16)
    m.box(0x496C89, (2.04, 2.21, .58), (1.04, 0, 2.71), bevel=.09)
    m.box(SNOW, (2.18, 2.18, .24), (1.04, 0, 3.28), bevel=.10)
    for y in (-.72, .72):
        m.box(LAMP, (.12, .34, .22), (2.48, y, 1.53), bevel=.046)
    return m


def panel(name='panel', snow=False):
    m = model(name)
    m.box(INK, (2, 1.69, .96), (0, 0, .48), bevel=.036)
    for s in (-1, 1):
        m.box(CONCRETE, (1.9, .1, .88), (0, s * .9, .49), bevel=.045)
        for x in (-.93, .93):
            m.box(RIM, (.14, .10, .82), (x, s * .944, .49), bevel=.031)
            m.box(ORANGE, (.095, .062, .16), (x, s * .966, .74), bevel=.015)
        m.box(STEEL, (1.67, .074, .14), (0, s * .955, .31), bevel=.025)
        m.box(LAMP, (1.43, .043, .04), (0, s * .977, .31), bevel=.011)
    m.box(SNOW if snow else RIM, (1.99, 1.97, .11), (0, 0, .945), bevel=.036)
    return m


def wall():
    return panel('wall', snow=True)


def gate():
    m = model('gate')
    m.box(INK, (2, 1.9, 1), (0, 0, .5), bevel=.052)
    for s in (-1, 1):
        for side in (-1, 1):
            m.box(STEEL, (.937, .05, .84), (side * .486, s * .963, .5), bevel=.028)
            beam(m, RIM, (side * .13, s * .98, .52), (side * .87, s * .98, .85), .03)
            m.box(RUST, (.71, .044, .144), (side * .495, s * .97, .21), bevel=.012)
            for i in range(4):
                m.box(ORANGE, (.091, .021, .12), (side * .48 + (i - 1.5) * .151, s * .989, .21),
                      (0, 21, 0), bevel=.006)
            m.box(LAMP, (.36, .026, .049), (side * .48, s * .983, .84), bevel=.012)
    return m


def cover():
    m = model('cover')
    m.box(INK, (2, 2, .4), (0, 0, .2), bevel=.07)
    m.box(CONCRETE, (1.92, 1.68, .78), (0, 0, .57), bevel=.089)
    m.box(RIM, (1.94, 1.34, .14), (0, 0, .93), bevel=.05)
    for s in (-1, 1):
        for x in (-.68, 0, .68):
            m.box(ORANGE, (.22, .10, .33), (x, s * .85, .57), (0, 23, 0), bevel=.023)
    return m


def crate():
    m = model('crate')
    m.box(STEEL, (1.77, 1.77, .96), (0, 0, .50), bevel=.09)
    for x in (-.85, .85):
        for y in (-.85, .85):
            m.box(INK, (.29, .29, 1), (x, y, .5), bevel=.08)
    for y in (-.907, .907):
        m.box(ORANGE, (1.45, .139, .58), (0, y, .56), bevel=.05)
        m.box(RUST, (1.26, .075, .18), (0, y * 1.065, .51), bevel=.035)
        m.box(AMBER, (.16, .032, .081), (.49, y * 1.074, .68), bevel=.012)
    return m


def rail():
    m = model('rail')
    # Lower infill matches the cover plane behind the metal trim.
    m.box(STEEL, (2, 1.94, .64), (0, 0, .32), bevel=.047)
    m.box(RIM, (2, 1.68, .17), (0, 0, .69), bevel=.038)
    m.box(ORANGE, (2, 1.95, .14), (0, 0, .93), bevel=.027)
    for x in (-.84, .84):
        m.box(INK, (.13, 2, 1), (x, 0, .5), bevel=.026)
    return m


def deck():
    m = model('deck')
    m.box(STEEL, (2, 2, .89), (0, 0, .445), bevel=.06)
    for x in (-.52, .52):
        m.box(RIM, (.98, 1.99, .15), (x, 0, .925), bevel=.032)
        for y in (-.84, .84):
            m.box(ORANGE, (.58, .071, .041), (x, y, .976), bevel=.013)
    for y in (-.982, .982):
        m.box(LAMP, (1.31, .035, .068), (0, y, .51), bevel=.014)
    return m


def roof():
    m = model('roof')
    m.box(INK, (2, 2, .58), (0, 0, .29), bevel=.15)
    m.box(SNOW, (2, 2, .54), (0, 0, .73), bevel=.20)
    for y in (-.87, .87):
        m.box(AMBER, (1.46, .185, .12), (0, y, .34), bevel=.045)
    return m


def floodlight():
    m = model('floodlight')
    m.cyl(INK, .55, .16, (0, 0, 0), seg=10)
    m.cyl(RIM, .29, 1.68, (0, 0, .15), r2=.23, seg=8)
    for x in (-.33, .33):
        beam(m, ORANGE, (x * .54, 0, 1.7), (x, 0, 2.22), .13)
    m.cyl(STEEL, .42, .59, (0, .28, 2.29), (90, 0, 0), r2=.50, seg=12, smooth=False)
    m.cyl(INK, .505, .16, (0, -.29, 2.29), (90, 0, 0), seg=12, smooth=False)
    m.cyl(AMBER, .37, .05, (0, -.442, 2.29), (90, 0, 0), seg=12, smooth=False)
    return m


def searchlight():
    m = model('searchlight')
    m.cyl(INK, .47, .12, (0, 0, 0), seg=10, smooth=False)
    m.cyl(RIM, .32, .14, (0, 0, .11), r2=.25, seg=10, smooth=False)
    # The power mast fills the authored post and housing above the low lens.
    m.cyl(INK, .30, 1.94, (0, 0, .06), r2=.26, seg=8, smooth=False)
    m.box(STEEL, (.8, .8, .8), (0, 0, 2.4), bevel=.10)
    m.box(ORANGE, (.48, .055, .24), (0, -.379, 2.47), bevel=.022)
    head = model('searchlight_head')
    head.cyl(STEEL, .295, .40, (0, .23, 0), (90, 0, 0), r2=.34, seg=12, smooth=False)
    head.cyl(ORANGE, .346, .093, (0, -.168, 0), (90, 0, 0), seg=12, smooth=False)
    head.cyl(INK, .313, .045, (0, -.259, 0), (90, 0, 0), seg=12, smooth=False)
    lamp = model('searchlight_lens')
    lamp.cyl(AMBER, .257, .035, (0, -.296, 0), (90, 0, 0), seg=12, smooth=False)
    pivot = bake(head)
    pivot.location.z = .33
    lens = bake(lamp, AMBER_GLOW)
    lens.parent = pivot
    for i, f in enumerate(FRAMES):
        key(lens, f, scale=1 + .012 * sin(i * pi / 4))
    return m, [pivot, lens]


def beacon():
    m = model('beacon')
    m.cyl(INK, .43, .19, (0, 0, 0), seg=10)
    m.cyl(STEEL, .17, 1.44, (0, 0, .17), r2=.13, seg=8)
    m.cyl(ORANGE, .27, .18, (0, 0, 1.53), seg=10)
    pulse = model('beacon_lens')
    pulse.cyl(AMBER, .22, .26, (0, 0, -.13), r2=.18, seg=10)
    pulse.cyl(INK, .24, .07, (0, 0, .12), seg=10)
    part = bake(pulse, AMBER_GLOW)
    for i, f in enumerate(FRAMES):
        key(part, f, loc=(0, 0, 1.83 + .031 * sin(i * pi / 4)), scale=1 + .09 * sin(i * pi / 4))
    return m, [part]


def alarm():
    m = model('alarm')
    m.box(INK, (.72, .61, .76), (0, 0, .38), bevel=.09)
    m.box(ORANGE, (.57, .65, .56), (0, 0, .42), bevel=.061)
    for y in (-.335, .335):
        m.box(RED, (.35, .04, .13), (0, y, .51), bevel=.023)
    return m


def column():
    m = model('column')
    m.cyl(STEEL, 1, .12, (0, 0, 0), r2=.83, seg=12, smooth=False)
    m.cyl(CONCRETE, .85, .81, (0, 0, .11), r2=.74, seg=12, smooth=False)
    m.cyl(INK, .87, .075, (0, 0, .925), seg=12, smooth=False)
    for i in range(4):
        a = i * pi / 2
        m.box(LAMP, (.05, .05, .53), (.805 * cos(a), .805 * sin(a), .48), bevel=.014)
    return m


def tank():
    m = model('tank')
    m.cyl(INK, 1.48, .35, (0, 0, 0), r2=1.39, seg=14, smooth=False)
    m.cyl(STEEL, 1.36, .46, (0, 0, 3.54), r2=1.2, seg=14, smooth=False)
    for z in (.37, 1.72, 3.52):
        ring(m, RIM, 1.23, .24, z, segments=16, depth=.17)
    for i in range(6):
        a = i * pi / 3
        x, y = cos(a), sin(a)
        beam(m, INK, (x * 1.13, y * 1.13, .24), (x * 1.13, y * 1.13, 3.83), .16)
        m.box(ORANGE, (.28, .31, .29), (1.23 * x, 1.23 * y, 1.79), bevel=.048)
    ring(m, LAMP, .93, .17, .43, segments=16, depth=.08)
    ring(m, LAMP, .99, .17, 3.49, segments=16, depth=.07)
    crystal = model('tank_core')
    crystal.ico(ICE[2], .84, (0, 0, 0), scale=(.93, .84, 1.54), sub=2)
    crystal.ico(LAMP, .31, (.32, -.37, -.24), scale=(.77, .71, 1.66))
    part = bake(crystal, CYAN_GLOW)
    for i, f in enumerate(FRAMES):
        a = i * pi / 4
        key(part, f, loc=(0, 0, 1.92 + .14 * sin(a)), rot=(0, .12, a))
    return m, [part]


def generator():
    m = model('generator')
    m.box(INK, (2, 2, .29), (0, 0, .145), bevel=.094)
    m.box(STEEL, (1.97, 1.96, .76), (0, 0, .57), bevel=.10)
    m.box(ORANGE, (1.95, 1.93, .16), (0, 0, .92), bevel=.06)
    for y in (-.966, .966):
        m.box(INK, (1.65, .049, .53), (0, y, .56), bevel=.031)
        for x in (-.61, -.2, .2, .61):
            m.box(LAMP, (.12, .039, .24), (x, y * 1.021, .59), bevel=.023)
    return m


def shelf():
    m = model('shelf')
    m.box(STEEL, (1.97, .25, .98), (0, 0, .49), bevel=.035)
    for x in (-.94, .94):
        m.box(INK, (.12, 2, 1), (x, 0, .5), bevel=.026)
    for z in (.065, .29, .53, .77, .96):
        m.box(RIM, (2, 2, .081), (0, 0, z), bevel=.029)
    for row in range(4):
        for j in range(7):
            x = (j - 3) * .246
            z = .142 + .226 * row
            color = (RIM, 0x476C7F, 0xA28A62, ORANGE)[(j * 7 + row) % 4]
            m.box(color, (.18, 1.48, .148), (x, 0, z), bevel=.023)
    return m


def console():
    m = model('console')
    m.box(INK, (2, 1.9, .17), (0, 0, .085), bevel=.062)
    m.box(STEEL, (1.88, 1.74, .84), (0, 0, .48), bevel=.092)
    m.box(RIM, (1.91, 1.57, .19), (0, 0, .887), bevel=.062)
    m.box(INK, (1.59, .93, .062), (0, -.15, .966), bevel=.023)
    for x in (-.49, 0, .49):
        m.box(LAMP, (.32, .35, .043), (x, -.21, .978), bevel=.023)
    return m


def safe():
    m = model('safe')
    m.cyl(INK, 2.5, .28, (0, 0, 0), seg=16, smooth=False)
    m.cyl(STEEL, 2.39, 2.58, (0, 0, .26), r2=2.29, seg=16, smooth=False)
    m.cyl(RIM, 2.44, .22, (0, 0, 2.78), r2=2.29, seg=16, smooth=False)
    for z in (.57, 2.54):
        ring(m, ORANGE, 2.37, .16, z, segments=16, depth=.12)
    for x in (-1.1, 1.1):
        m.box(INK, (.54, .17, 1.78), (x, -1.98, 1.5), bevel=.068)
    m.box(LAMP, (.81, .085, .17), (0, -2.374, 2.02), bevel=.038)
    return m


def drill():
    m = model('drill')
    # Authored span is six metres along the game's Z axis, above the safe.
    m.box(INK, (.9, 5.96, .33), (0, 0, .17), bevel=.09)
    m.box(ORANGE, (1, 2.52, .74), (0, 1.33, .53), bevel=.12)
    for x in (-.466, .466):
        for y in (.55, 1.11, 1.67):
            m.box(RUST, (.065, .32, .34), (x, y, .58), bevel=.021)
    m.cyl(STEEL, .46, .51, (0, .22, .47), (90, 0, 0), seg=12, smooth=False)
    bit = model('drill_bit')
    bit.cyl(RIM, .45, .46, (0, 0, 0), r2=.40, seg=14, smooth=False)
    bit.cyl(STEEL, .40, 1.89, (0, 0, .45), r2=.055, seg=14, smooth=False)
    for i in range(7):
        a = i * 2 * pi / 7
        x, y = cos(a), sin(a)
        beam(bit, RIM, (.391 * x, .391 * y, .46), (.083 * x, .083 * y, 2.16), .069)
        bit.box(LAMP, (.105, .12, .19), (.437 * x, .437 * y, .24), bevel=.022)
    part = bake(bit, CYAN_GLOW)
    # Parent the authored +Z spin to a stationary pivot pointing out of the housing.
    pivot = bpy.data.objects.new('frost_drill_pivot', None)
    bpy.context.scene.collection.objects.link(pivot)
    pivot.location = (0, -.37, .48)
    pivot.rotation_euler.x = pi / 2
    part.parent = pivot
    for i, f in enumerate(FRAMES):
        key(part, f, rot=(0, 0, i * pi / 4))
    return m, [pivot, part]


def charge_ring():
    m = model('charge_ring')
    ring(m, STEEL, 8.78, .37, .043, segments=32, depth=.086)
    ring(m, LAMP, 8.78, .16, .091, segments=32, depth=.031)
    for i in range(8):
        a = i * pi / 4
        x, y = cos(a), sin(a)
        m.box(ORANGE, (.41, .41, .08), (8.78 * x, 8.78 * y, .08), bevel=.026)
    return m


def pad():
    m = model('pad')
    m.cyl(INK, 5, .12, (0, 0, 0), seg=20, smooth=False)
    m.cyl(STEEL, 4.93, .08, (0, 0, .12), seg=20, smooth=False)
    ring(m, GREEN, 4.57, .23, .213, segments=24, depth=.036)
    ring(m, RIM, 3.54, .095, .211, segments=24, depth=.03)
    for x in (-2.1, 2.1):
        m.box(GREEN, (.28, 3.7, .038), (x, 0, .213), bevel=.012)
    m.box(GREEN, (4.2, .23, .038), (0, 0, .213), bevel=.012)
    return m


MAKERS = (
    pod, debris, boulder, spire, drift, glacier, ice_floor, pine, tent, snowcat, wall, panel, gate, cover, crate,
    rail, deck, roof, floodlight, searchlight, beacon, alarm, column, tank, generator, shelf,
    console, safe, drill, charge_ring, pad,
)
EMISSIVE = {
    'pod', 'tent', 'snowcat', 'wall', 'panel', 'gate', 'crate', 'deck', 'roof', 'floodlight',
    'alarm', 'column', 'tank', 'generator', 'console', 'safe', 'charge_ring', 'pad',
}


def main():
    clear_scene()
    MATERIALS.clear()
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = FRAMES[0], FRAMES[-1]
    for i, make in enumerate(MAKERS):
        result = make()
        mesh, motion = result if isinstance(result, tuple) else (result, [])
        obj = bake(mesh, *(GLOW if mesh.name.removeprefix('frost_') in EMISSIVE else ()))
        scene.frame_set(scene.frame_start)
        objects = [obj, *motion]
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
        root.location = ((i % 6) * 12, (i // 6) * 15, 0)
        collection.instance_offset = root.location
        collection.asset_mark()
    scene.frame_set(scene.frame_start)
    scene.name = 'Frostspire Black Site | Asset Library'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.color_type = 'VERTEX'
            region = area.spaces.active.region_3d
            region.view_location = (30, 29, 2)
            region.view_distance = 106
            region.view_rotation = Vector((-.23, 1, -.88)).to_track_quat('-Z', 'Y')
    target = Path(__file__).resolve().parents[1] / 'frostspire_black_site.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(target), compress=True)


if __name__ == '__main__':
    main()
