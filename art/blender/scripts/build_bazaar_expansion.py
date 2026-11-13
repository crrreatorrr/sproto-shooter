"""Build the Grand Bazaar architectural kit and its compressed runtime models."""
from math import cos, pi, sin
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_campaign_polish import MATERIALS, bake, beam, ring
from build_cartoon_kit import Model, clear_scene, export, srgb
from build_moonlit_kit import prism

CREAM, STONE, TERRA, ROSE = 0xE9C28B, 0xC59066, 0xA76852, 0xC78168
BASE, DARK, DUST, SHADE = 0xB38770, 0x554256, 0xD7A27A, 0x81565E
TEAL, SEA, ROYAL, COPPER = 0x428A8A, 0x275B69, 0x61518A, 0xB86D48
GOLD, AMBER, IVORY = 0xDAA95D, 0xFFD185, 0xF3DFAC
GLOW = (('bazaar_ember', (AMBER,), 0xFFB365, 1.19),)


def model(name):
    return Model('bazaar2_' + name, outline=0)


def face(m, color, vertices):
    start = len(m.verts)
    m.verts.extend(vertices)
    m.faces.append(list(range(start, start + len(vertices))))
    m.colors.append(srgb(color))
    m.smooth.append(False)


def panel(m, color, x, y, z, width, height, direction=-1):
    points = [(x-width/2,y,z-height/2), (x+width/2,y,z-height/2),
              (x+width/2,y,z+height/2), (x-width/2,y,z+height/2)]
    face(m, color, points if direction < 0 else points[::-1])


def arch_tiles(m, x, y, spring, outer, inner, depth, palette, count=11, gap=.014):
    for i in range(count):
        a, b = pi*i/count + gap, pi*(i+1)/count - gap
        points = [(x+r*cos(t), spring+r*sin(t)) for r,t in
                  ((outer,a),(outer,b),(inner,b),(inner,a))]
        start = len(m.verts)
        prism(m, palette[i%len(palette)], points, depth)
        for k in range(start, len(m.verts)):
            vx, vy, vz = m.verts[k]
            m.verts[k] = (vx, vy+y, vz)


def wall_panel():
    m = model('wall_panel')
    m.box(STONE, (2, 2, 1), (0, 0, .50))
    for z, h, c in ((.088,.15,BASE), (.78,.054,TEAL), (.858,.033,CREAM), (.973,.054,CREAM)):
        m.box(c, (2, 2.025, h), (0, 0, z))
    for side in (-1, 1):
        panel(m, TERRA, 0, side*1.02, .359, 1.82, .146, side)
        for x in (-.67, -.21, .25, .71):
            panel(m, CREAM, x, side*1.023, .362, .073, .093, side)
    return m


def shop():
    m = model('shop')
    m.box(STONE, (10, 8, 7.7), (0, 0, 3.85), bevel=.15)
    m.box(CREAM, (10, 8, .31), (0, 0, 7.67), bevel=.09)
    m.box(TERRA, (9.4, 7.9, .42), (0, 0, .21), bevel=.06)
    for y, side in ((-4.03,-1),(4.03,1)):
        for x in (-3.38, 0, 3.38):
            panel(m, DARK, x, y, 1.70, 1.42, 2.46, side)
            arch_tiles(m, x, y, 2.67, .91, .69, .13, (CREAM, DUST), 7)
            for z, w in ((3.99,1.01),(5.61,1.19)):
                panel(m, SEA, x, y+side*.014, z, w, .82, side)
                panel(m, TEAL, x, y+side*.018, z+.16, w*.83, .092, side)
        m.box(CREAM, (9.66,.19,.13),(0,y,3.43),bevel=.025)
    return m


def canopy():
    m = model('canopy')
    colors = (TEAL, SEA, ROYAL, TEAL, ROYAL)
    for i in range(11):
        x = (i-5)*.96
        for j in range(4):
            y0, y1 = -4+j*2, -2+j*2
            z0 = .23 if j%2 == 0 else .085
            z1 = .23 if j%2 == 1 else .085
            pts = [(x-.48,y0,z0),(x+.48,y0,z0),(x+.48,y1,z1),(x-.48,y1,z1)]
            c = colors[(i+j)%len(colors)]
            face(m, c, pts)
            face(m, c, pts[::-1])
    for y in (-3.95,0,3.95):
        m.box(DARK, (10.8,.11,.14), (0,y,.105), bevel=.022)
        m.box(GOLD, (10.78,.095,.06), (0,y,.055))
    return m


def archway():
    m = model('archway')
    for x in (-5.22,5.22):
        m.box(TERRA, (2.38,2.87,.46),(x,0,.23),bevel=.12)
        m.box(STONE,(1.95,2.25,5.37),(x,0,3.03),bevel=.14)
        for z in (2.17,4.33,5.60):
            m.box(CREAM,(2.06,2.34,.15),(x,0,z),bevel=.04)
        for s in (-1,1):
            m.box(SEA,(.21,.08,1.14),(x,s*1.164,3.62),bevel=.016)
    arch_tiles(m,0,0,5.52,6.11,4.36,2.22,(STONE,CREAM,DUST),14)
    for y in (-1.146,1.146):
        arch_tiles(m,0,y,5.52,5.37,5.22,.065,(TEAL,SEA,TEAL),13,.009)
    return m


def tower():
    m = model('tower')
    m.box(TERRA,(3.78,3.78,.68),(0,0,.34),bevel=.13)
    m.box(STONE,(3.18,3.18,8.60),(0,0,4.94),bevel=.19)
    for z,w in ((1.27,3.42),(7.80,3.48),(9.04,3.65)):
        m.box(CREAM,(w,w,.24),(0,0,z),bevel=.048)
    m.cyl(SEA,1.61,.66,(0,0,9.10),r2=1.49,seg=12,smooth=False)
    m.cyl(TEAL,1.53,.78,(0,0,9.75),r2=.80,seg=12,smooth=False)
    m.cyl(TEAL,.81,.65,(0,0,10.52),r2=.11,seg=12,smooth=False)
    m.cyl(GOLD,.08,.48,(0,0,11.1),r2=.035,seg=8)
    for side in (-1,1):
        for x in (-.77,.77):
            panel(m,DARK,x,side*1.61,6.68,.48,1.43,side)
            panel(m,TEAL,x,side*1.617,6.50,.28,.69,side)
        panel(m,SEA,0,side*1.613,8.45,1.88,.28,side)
    return m


def city():
    m = model('city')
    for i,(x,y,w,h) in enumerate(((-11,1.4,8.7,6.9),(-3.6,-1.2,8.7,10),(4.7,.8,9.6,7.8),(12.4,3.2,5.9,5.4))):
        tone = (BASE,STONE,ROSE,TERRA)[i]
        m.box(tone,(w,9.1,h),(x,y,h/2))
        m.box(DUST,(w+.21,9.2,.22),(x,y,h))
        for n in (-1,0,1):
            for z in (2.53,4.7,h-.88):
                panel(m, SHADE, x+n*w*.23, y-4.56, z, .46,.64)
        if i in (1,3):
            m.cyl(TEAL,w*.29,w*.14,(x,y,h),r2=w*.21,seg=8,smooth=False)
            m.cyl(SEA,w*.21,w*.19,(x,y,h+w*.14),r2=.10,seg=8,smooth=False)
    m.cyl(BASE, .83, 13.6, (7.4,3.45,0), r2=.65, seg=8, smooth=False)
    m.cyl(CREAM,1.13,.55,(7.4,3.45,11.45),seg=8,smooth=False)
    m.cyl(SEA,.82,1.33,(7.4,3.45,13.6),r2=.035,seg=8,smooth=False)
    return m


def ridge():
    m = model('ridge')
    rng = Random(332)
    n = 10
    levels = ((0,1.0),(1.1,1.03),(3.9,.96),(4.3,.87),(6.4,.82),(7.15,.76),(8.8,.68),(9.75,.58))
    for peak in range(3):
        rings = []
        ox = (peak-1)*6.1
        oy = (0.6,-1.3,1.9)[peak]
        radius = (4.7,4.1,5.2)[peak]
        height = (.81,1.21,.92)[peak]
        stretch = [rng.uniform(.88,1.12) for _ in range(n)]
        for row,(z,s) in enumerate(levels):
            rings.append([(ox+radius*s*stretch[i]*cos(i*2*pi/n)+z*.06,
                           oy+radius*s*stretch[i]*sin(i*2*pi/n),
                           z*height+(0 if row == 0 else .24*sin(i*1.7+row))) for i in range(n)])
        for row,(low,high) in enumerate(zip(rings,rings[1:])):
            for i in range(n):
                color = (TERRA,BASE,ROSE,SHADE,DUST,STONE,BASE)[row]
                j = (i+1)%n
                face(m, color, [low[i],low[j],high[j],high[i]])
        face(m, DUST, rings[-1])
    return m


def rug():
    m = model('rug')
    face(m, ROYAL, [(-2.8,-3.9,0),(2.8,-3.9,0),(2.8,3.9,0),(-2.8,3.9,0)])
    for x in (-2.58,2.58):
        m.box(GOLD,(.075,7.50,.013),(x,0,.011))
    for y in (-3.62,3.62):
        m.box(GOLD,(5.11,.077,.013),(0,y,.011))
        for j in range(11):
            x = (j-5)*.50
            face(m, CREAM, [(x-.068,y,.025),(x+.068,y,.025),(x+.10,y*1.11,.025),(x-.10,y*1.11,.025)])
    for y in (-2.45,0,2.45):
        for x, color in ((-1.22,TERRA),(0,TEAL),(1.22,TERRA)):
            face(m,color,[(x-.48,y,.016),(x,y-.64,.016),(x+.48,y,.016),(x,y+.64,.016)])
            face(m,CREAM,[(x-.14,y,.019),(x,y-.23,.019),(x+.14,y,.019),(x,y+.23,.019)])
    return m


def support():
    m = model('support')
    m.box(TERRA,(2,2,.18),(0,0,.09),bevel=.07)
    m.box(STONE,(1.67,1.74,.82),(0,0,.55),bevel=.085)
    m.box(CREAM,(1.97,1.99,.13),(0,0,.935),bevel=.05)
    for side in (-1,1):
        panel(m,SEA,0,side*.874,.49,.64,.48,side)
        panel(m,TEAL,0,side*.879,.53,.48,.10,side)
    return m


def lantern():
    m = model('lantern')
    m.cyl(DARK,.36,.14,(0,0,0),seg=8,smooth=False)
    m.cyl(DARK,.118,2.80,(0,0,.13),r2=.10,seg=7,smooth=False)
    beam(m,COPPER,(0,0,2.76),(0,-.73,2.91),.11)
    m.cyl(DARK,.25,.075,(0,-.70,2.27),seg=8,smooth=False)
    m.cyl(AMBER,.20,.43,(0,-.70,2.32),r2=.17,seg=8,smooth=False)
    m.cyl(COPPER,.26,.17,(0,-.70,2.72),r2=.115,seg=8,smooth=False)
    return m


def brazier():
    m = model('brazier')
    m.cyl(TERRA,.80,.20,(0,0,0),r2=.69,seg=10,smooth=False)
    m.cyl(STONE,.55,.42,(0,0,.20),r2=.71,seg=10,smooth=False)
    ring(m,GOLD,.68,.09,.62,segments=12,depth=.078)
    m.cyl(DARK,.59,.052,(0,0,.62),seg=10,smooth=False)
    m.ico(AMBER,.39,(0,0,.80),scale=(.70,.64,1.48),sub=2)
    m.ico(AMBER,.18,(.18,.09,1.09),scale=(.74,.68,1.18))
    return m


def beacon():
    m = model('beacon')
    m.box(STONE,(.95,.92,.14),(0,0,.073),bevel=.062)
    m.cyl(SEA,.29,1.26,(0,0,.11),r2=.18,seg=6,smooth=False)
    m.cyl(CREAM,.28,.10,(0,0,1.36),r2=.22,seg=6,smooth=False)
    m.ico(TEAL,.19,(0,0,1.53),scale=(.8,.8,1.14))
    return m


def ring_inlay():
    m = model('ring_inlay')
    for r,w,c in ((7.8,.125,TEAL),(7.47,.085,GOLD),(6.68,.078,TEAL),(4.76,.063,COPPER)):
        ring(m,c,r,w,.018,segments=36,depth=.024)
    for i in range(12):
        a=i*pi/6
        r=6.21
        m.box(CREAM,(.57,.57,.026),(r*cos(a),r*sin(a),.021),(0,0,i*30+45),.017)
    return m


def main():
    clear_scene()
    MATERIALS.clear()
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    makers = (wall_panel, shop, canopy, archway, tower, city, ridge, rug, support, lantern, brazier, beacon, ring_inlay)
    for i, maker in enumerate(makers):
        mesh = maker()
        obj = bake(mesh, *GLOW)
        export([obj], 'props', mesh.name, compressed=True)
        collection = bpy.data.collections.new(mesh.name)
        scene.collection.children.link(collection)
        collection.objects.link(obj)
        scene.collection.objects.unlink(obj)
        obj.location = ((i%4)*23,(i//4)*24,0)
        collection.instance_offset = obj.location
        collection.asset_mark()
    scene.name = 'The Grand Bazaar | Expansion Assets'
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.color_type = 'VERTEX'
            region = area.spaces.active.region_3d
            region.view_location = (34,31,4)
            region.view_distance = 112
            region.view_rotation = Vector((-.21,1,-.83)).to_track_quat('-Z','Y')
    target = Path(__file__).resolve().parents[1] / 'grand_bazaar.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(target), compress=True)


if __name__ == '__main__':
    main()
