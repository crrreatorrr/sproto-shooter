"""Author the instanced Sproto Landing street, interior and skyline props."""
from math import cos, degrees, pi, sin
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_campaign_polish import MATERIALS, bake, beam
from build_cartoon_kit import Model, clear_scene, export, srgb

INK, SLATE, CONCRETE, CREAM = 0x292F43, 0x4E6077, 0x8693A1, 0xCABFB3
GLASS, GLINT, STEEL = 0x314E6C, 0x6296AE, 0x687988
AQUA, AMBER, PINK, WHITE = 0x59ECE2, 0xFFD38A, 0xF183B2, 0xE6F5F8
GLOW = (
    ('landing_aqua', (AQUA,), 0x38DCCA, 1.02),
    ('landing_amber', (AMBER,), 0xFFC475, 1.12),
    ('landing_pink', (PINK,), 0xF26CA7, .71),
    ('landing_white', (WHITE,), 0xC5E5F5, .75),
)


def model(name):
    return Model('landing_' + name, outline=0)


def face(m, color, points):
    offset = len(m.verts)
    m.verts.extend(points)
    m.faces.append(list(range(offset, offset + len(points))))
    m.colors.append(srgb(color))
    m.smooth.append(False)


def quad(m, color, x, y, z, w, h):
    face(m, color, [(x - w/2, y, z - h/2), (x + w/2, y, z - h/2),
                    (x + w/2, y, z + h/2), (x - w/2, y, z + h/2)])


def facade(name, w, height, tint, trim, sign, style):
    m = model(name)
    d = 8.6
    m.box(tint, (w, d, height), (0, 0, height/2))
    m.box(SLATE, (w * .99, d + .16, .55), (0, 0, .29))
    m.box(trim, (w + .3, d + .33, .35), (0, 0, height - .22), bevel=.04)
    m.box(tint, (w*.68, d*.66, 1.0 + style * .45), (0, .45, height + .40))
    for x in (-w*.365, w*.365):
        m.box(trim, (.24, .24, height - 4.1), (x, -4.37, (height+3.6)/2))
    m.box(SLATE, (w * .95, .15, 2.83), (0, -4.36, 1.78))
    m.box(trim, (w*.88, 1.15, .16), (0, -4.88, 3.45), (6, 0, 0), bevel=.029)
    quad(m, sign, 0, -4.46, 3.09, w*.78, .25)
    for i in range(5):
        x = (i - 2) * w / 5.5
        quad(m, GLASS, x, -4.448, 1.79, w*.156, 1.92)
        quad(m, GLINT, x, -4.454, 2.47, w*.15, .20)
        quad(m, INK, x, -4.458, .95, w*.156, .33)
    rng = Random(style + 29)
    for row in range(2 + style):
        z = 5.4 + row * (height - 6.4) / (2 + style)
        for i in range(5):
            x = (i - 2) * w * .172
            quad(m, INK, x, -4.314, z, w*.126, 1.49)
            quad(m, AMBER if rng.random() < .23 else GLASS, x, -4.320, z + .035, w*.102, 1.23)
            if i % 2 == 0:
                quad(m, GLINT, x, -4.326, z + .37, w*.093, .11)
        for side in (-1, 1):
            x = side * (w/2 + .014)
            for y in (-2.05, .1, 2.2):
                pts = [(x, y + a*.59, z + b*.66) for a,b in ((-1,-1),(1,-1),(1,1),(-1,1))]
                face(m, GLASS, pts if side > 0 else pts[::-1])
    return m


def street_wall():
    m = model('street_wall')
    m.box(SLATE, (2, 2, .97), (0, 0, .485))
    m.box(CONCRETE, (2, 2.10, .064), (0, 0, .948), bevel=.022)
    for z in (.18, .71):
        quad(m, STEEL, 0, -1.002, z, 1.86, .12)
    return m


def block():
    m = model('block')
    rng = Random(49)
    for i, (x, y, h, w) in enumerate(((-11, 0, 14, 9), (-2, 2, 22, 9), (7, .4, 17, 7), (13, 4, 10, 6))):
        tone = (0x565A76, 0x5C5A79, 0x526078, 0x6C637A)[i]
        m.box(tone, (w, 9, h), (x, y, h/2))
        m.box(tone, (w*.66, 6.5, 2.4), (x, y, h+1.2))
        for level in range(int(h/3)-1):
            for col in (-1, 0, 1):
                if rng.random() > .37:
                    quad(m, 0xA68278 if rng.random() < .45 else 0x756E85, x+col*w*.24, y-4.53,
                         3.2+3*level, w*.14, .67)
    return m


def palm():
    m = model('palm')
    m.box(0x91838E, (1.67, 1.67, .19), (0, 0, .095), bevel=.07)
    m.box(0x655C53, (1.4, 1.4, .16), (0, 0, .123))
    trunk = [(0,0,.21,.25), (.12,0,2.18,.196), (.34,0,4.19,.145), (.69,.03,6.38,.105)]
    for a,b in zip(trunk,trunk[1:]):
        start, end = Vector(a[:3]), Vector(b[:3])
        v = end - start
        m.cyl(0xA87754, a[3], v.length, start, tuple(degrees(q) for q in v.to_track_quat('Z', 'Y').to_euler()),
              r2=b[3], seg=6, smooth=False)
    for i in range(8):
        a = i * pi / 4
        dx, dy = cos(a), sin(a)
        x, y, z, _ = trunk[-1]
        t = 2.2 + (i % 3) * .28
        ridge = (x+dx*t*.46, y+dy*t*.46, z+.34+i%2*.15)
        tip = (x+dx*t,y+dy*t,z-.68+(i%3)*.17)
        root = (x,y,z)
        for side,color in ((-1,0x407E63),(1,0x639777)):
            w = (ridge[0]+dy*.32*side, ridge[1]-dx*.32*side, ridge[2]-.12)
            pts = [root,ridge,tip,w]
            if side == 1:
                pts.reverse()
            face(m,color,pts)
            face(m,0x366554,pts[::-1])
    return m


def car():
    m = model('car')
    for y in (-.72, .72):
        for x in (-1.00, 1.00):
            m.cyl(INK, .315, .21, (x, y, .315), (90, 0, 0), seg=8, smooth=False)
            m.cyl(STEEL, .17, .225, (x, y, .315), (90, 0, 0), seg=7, smooth=False)
    m.box(0x6788A3, (3.05, 1.46, .47), (0, 0, .51), bevel=.145)
    m.box(0x90A0A8, (1.67, 1.27, .46), (-.17, 0, .97), bevel=.15)
    for y in (-.645, .645):
        for x in (-.62, .23):
            pts = [(x-.31,y,.81),(x+.34,y,.81),(x+.23,y,1.11),(x-.21,y,1.11)]
            face(m,GLASS,pts if y<0 else pts[::-1])
        m.box(SLATE, (2.59,.03,.07), (0,y*1.14,.60))
    for x in (-1.48, 1.48):
        for y in (-.45,.45):
            m.box(0xF2B4A1 if x<0 else 0xE5E4D1, (.076,.32,.14), (x,y,.60), bevel=.025)
    return m


def bin_prop():
    m = model('bin')
    m.box(0x407A6F, (2.4, 1.4, 1.13), (0, 0, .565), bevel=.105)
    m.box(SLATE, (2.39, 1.43, .22), (0, 0, 1.18), bevel=.049)
    for x in (-.77, -.26, .26, .77):
        m.box(0x5B8C7F, (.083,.036,.81), (x,-.68,.57))
    quad(m, CREAM, 0, -.704, .8, .68, .25)
    return m


def lamp():
    m = model('lamp')
    m.box(SLATE, (.47,.51,.22), (0,0,.11), bevel=.03)
    m.cyl(INK, .117, 5.32, (0,0,.17), r2=.082, seg=6)
    beam(m, STEEL, (0,0,5.37),(0,-1.04,5.54), .13)
    m.box(INK, (.52,.85,.22), (0,-1.01,5.54), bevel=.069)
    m.box(AMBER, (.31,.65,.057), (0,-1.02,5.405), bevel=.022)
    return m


def wall_light():
    m = model('wall_light')
    m.box(INK, (.83, .22, 1.37), (0, 0, .685), bevel=.06)
    m.box(AQUA, (.60,.18,.12), (0,-.164,.37), bevel=.03)
    m.box(WHITE, (.49,.19,.082), (0,-.168,.98), bevel=.014)
    return m


def mall_wall():
    m = model('mall_wall')
    m.box(CONCRETE, (2,2,1), (0,0,.5))
    m.box(SLATE, (1.74,.080,.55), (0,-1.006,.43))
    for x in (-.45, .46):
        quad(m, GLASS, x,-1.049,.46,.82,.43)
        quad(m, GLINT, x,-1.052,.53,.77,.034)
    for z,color in ((.16,CREAM),(.79,AQUA),(.94,STEEL)):
        m.box(color,(2,.06,.045),(0,-1.03,z))
    return m


def garage_wall():
    m = model('garage_wall')
    m.box(CONCRETE, (2,2,.98), (0,0,.49))
    m.box(SLATE, (2,.075,.21), (0,-1.027,.23))
    quad(m, AMBER, .15,-1.07,.24,1.44,.035)
    for x in (-.93,.92):
        m.box(SLATE, (.093,.12,.97), (x,-1.02,.485))
    return m


def upper_wall():
    m = model('upper_wall')
    m.box(SLATE, (2, 2, 1), (0, 0, .50))
    quad(m, GLASS, 0, -1.004, .56, 1.82, .71)
    quad(m, GLINT, 0, -1.009, .67, 1.8, .054)
    for x in (-.47, 0, .47):
        m.box(STEEL, (.037, .06, .76), (x, -1.024, .57))
    return m


def roof_light():
    m = model('roof_light')
    m.box(INK, (3.86, 1.29, .27), (0,0,.215), bevel=.065)
    for y in (-.35,.35):
        m.box(WHITE, (3.57,.13,.046), (0,y,.068), bevel=.015)
    m.box(STEEL, (3.70,.19,.079), (0,0,.078), bevel=.011)
    return m


def roof_rib():
    m = model('roof_rib')
    m.box(SLATE, (2,2,.38), (0,0,.19), bevel=.08)
    m.box(STEEL, (1.4,2,.11), (0,0,.067), bevel=.023)
    return m


def rail():
    m = model('rail')
    m.box(CONCRETE, (2,2,.34), (0,0,.17), bevel=.038)
    m.box(SLATE, (2,.64,.21), (0,0,.90), bevel=.049)
    for x in (-.67,.67):
        m.box(STEEL, (.085,.86,.78), (x,0,.57), bevel=.03)
    return m


def tower():
    m = model('tower')
    m.box(INK, (4.1,4.36,.45), (0,0,.23), bevel=.11)
    m.box(SLATE, (3.25,3.34,11.75), (0,0,6.29), bevel=.16)
    m.box(CREAM, (3.67,3.73,.47), (0,0,11.7), bevel=.066)
    m.box(CONCRETE, (2.79,2.81,.59), (0,0,12.19), bevel=.105)
    for y in (-1.69,1.69):
        for x in (-.99,.99):
            m.box(STEEL, (.28,.19,10.77), (x,y,6.07), bevel=.04)
        m.box(AMBER, (.25,.18,5.84), (0,y,7.31), bevel=.025)
        m.box(GLASS, (1.04,.24,1.25), (0,y,10.68), bevel=.07)
    return m



def hill():
    m = model('hill')
    m.ico(0x61577D, 35, (0, 0, 1.2), scale=(1.68, .72, .38), sub=2)
    m.ico(0x525674, 28, (-49, 3, .9), scale=(1.50, .77, .38), sub=2)
    m.ico(0x62607B, 31, (50, 5, 1.2), scale=(1.44, .71, .35), sub=2)
    for x in (-20, -10, 0, 10, 20):
        m.box(STEEL, (.34, .54, 4.8), (x, -6.1, 12.3), rot=(7, 0, 0))
    m.box(SLATE, (55, .46, .44), (0, -6.34, 13.89))
    m.text(CREAM, 'SPROTOWOOD', 6.1, .25, (0, -6.68, 14.12))
    return m


def sign(name, text, w, color):
    m = model(name)
    m.box(INK, (w, .28, 1.28), (0, 0, .64), bevel=.10)
    m.box(SLATE, (w-.18, .088, 1.12), (0, -.158, .64), bevel=.045)
    m.box(color, (w-.47, .026, .054), (0, -.211, .22))
    m.text(color, text, .78, .019, (0, -.223, .46))
    return m


def arrow():
    m = model('arrow')
    face(m, 0xC9BC98, [(-1.1,-.18,0), (.02,-.18,0), (.02,-.55,0),
                       (1.16,0,0), (.02,.55,0), (.02,.18,0), (-1.1,.18,0)])
    return m


def parking_bay():
    m = model('parking_bay')
    color = 0xD6C4A0
    for x in (-1.65, 1.65):
        face(m, color, [(x-.061,-2.7,0), (x+.061,-2.7,0), (x+.061,2.7,0), (x-.061,2.7,0)])
    face(m, color, [(-1.71,2.64,0), (1.71,2.64,0), (1.71,2.76,0), (-1.71,2.76,0)])
    return m


def main():
    clear_scene()
    MATERIALS.clear()
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    makers = (
        lambda: facade('facade_a', 14, 16.3, 0xA87578, 0xDFBCA0, PINK, 0),
        lambda: facade('facade_b', 11, 23.7, 0x6573A1, 0xC0BDD7, AQUA, 2),
        lambda: facade('facade_c', 16, 13.7, 0xA47F62, 0xD7C8AC, AMBER, 1),
        street_wall, block, palm, car, bin_prop, lamp, wall_light, mall_wall, garage_wall, upper_wall,
        roof_light, roof_rib, rail, tower, hill, arrow, parking_bay,
        lambda: sign('mall_sign', 'MALL OF SPROTO', 9.4, AQUA),
        lambda: sign('park_sign', 'PARKING', 5.0, AMBER),
        lambda: sign('gate_sign', 'GATE PLAZA', 8.0, AMBER),
    )
    for i, maker in enumerate(makers):
        asset = maker()
        obj = bake(asset, *GLOW)
        export([obj], 'props', asset.name, compressed=True)
        collection = bpy.data.collections.new(asset.name)
        scene.collection.children.link(collection)
        collection.objects.link(obj)
        scene.collection.objects.unlink(obj)
        obj.location = ((i % 5) * 26, (i // 5) * 23, 0)
        collection.instance_offset = obj.location
        collection.asset_mark()
    scene.name = 'Sproto Landing | Asset Library'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.color_type = 'VERTEX'
            region = area.spaces.active.region_3d
            region.view_location = (52, 35, 5)
            region.view_distance = 147
            region.view_rotation = Vector((-.18, 1, -.76)).to_track_quat('-Z', 'Y')
    path = Path(__file__).resolve().parents[1] / 'sproto_landing.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(path), compress=True)


if __name__ == '__main__':
    main()
