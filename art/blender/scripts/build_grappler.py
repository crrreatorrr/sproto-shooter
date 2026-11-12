"""Build the Grappler source scene and the in-game GLB.

Run from anywhere with Blender --background --python path/to/build_grappler.py.
The source scene includes a keyed launch, tether, ledge impact and return.
"""
from math import cos, pi, sin
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


REPO = Path(__file__).resolve().parents[3]
ART = REPO / "art" / "blender"
GAME = REPO / "public" / "assets" / "models" / "gear"
FPS = 30


def xyz(point):
    """Use glTF axes for the model dimensions, with +Z toward the claw."""
    x, y, z = point
    return Vector((x, -z, y))


def material(name, color, metal=0.0, emission=0.0):
    srgb = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    rgba = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = rgba
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = 0.36
    shader.inputs["Emission Color"].default_value = rgba
    shader.inputs["Emission Strength"].default_value = emission
    return mat


def empty(name, parent=None, at=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = xyz(at)
    obj.empty_display_size = 0.035
    return obj


def finish(obj, parent, mat, bevel=0):
    obj.parent = parent
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Edge bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def box(name, at, size, mat, parent=None, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.location = xyz(at)
    x, y, z = size
    obj.scale = (x, z, y)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, parent, mat, bevel)


def tube(name, start, end, radius, mat, parent=None, sides=12, radius_tip=None):
    a, b = xyz(start), xyz(end)
    bpy.ops.mesh.primitive_cone_add(
        vertices=sides, radius1=radius, radius2=radius if radius_tip is None else radius_tip,
        depth=(b - a).length,
    )
    obj = bpy.context.object
    obj.name = name
    obj.location = (a + b) / 2
    obj.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    return finish(obj, parent, mat)


def cuff(parent, at, mat):
    # Hollow faceted straps fit around the posed forearm.
    radii = (0.106, 0.102)
    points = [
        (cos(i * pi / 6) * r, sin(i * pi / 6) * r * 0.92, z)
        for r in radii for z in (at - 0.009, at + 0.009) for i in range(12)
    ]
    faces = []
    for i in range(12):
        j = (i + 1) % 12
        faces += [(i, j, j+12, i+12), (i+24, i+36, j+36, j+24),
                  (i, i+24, j+24, j), (i+12, j+12, j+36, i+36)]
    return mesh("Split cuff", points, faces, parent, mat, 0.001)


def mesh(name, points, faces, parent, mat, bevel=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata([xyz(p) for p in points], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    return finish(obj, parent, mat, bevel)


def merge_by_material(parent):
    groups = {}
    for obj in parent.children:
        if obj.type == "MESH":
            groups.setdefault(obj.data.materials[0], []).append(obj)
    for mat, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        objects[0].name = f"{parent.name} - {mat.name}"


def key(obj, channel, values):
    for frame, value in values:
        setattr(obj, channel, value)
        obj.keyframe_insert(channel, frame=frame)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "Grappler jaws"
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 0, 18

rubber = material("Charcoal webbing", "262B31")
housing = material("Graphite", "3F4751", 0.18)
trim = material("Ochre", "C3964F", 0.12)
steel = material("Satin steel", "BEC4C3", 0.20)
cyan = material("Ion cyan", "64CDDA", emission=0.85)

launcher = empty("Launcher")
for z in (-0.070, 0.053):
    cuff(launcher, z, rubber)
box("Sleeve pad", (0, 0.101, -0.009), (0.064, 0.008, 0.185), rubber, launcher, 0.003)
box("Low-profile rail", (0, 0.111, -0.012), (0.054, 0.015, 0.172), housing, launcher, 0.004)
box("Status filament", (0, 0.119, -0.030), (0.005, 0.0015, 0.046), cyan, launcher, 0.0006)
box("Edge index", (0.016, 0.119, -0.077), (0.015, 0.0015, 0.013), trim, launcher, 0.0006)
for x in (-0.019, 0.019):
    box("Guide rail", (x, 0.111, 0.081), (0.011, 0.012, 0.036), housing, launcher, 0.003)
socket = empty("Dock", launcher, (0, 0.119, 0.100))
merge_by_material(launcher)

claw = empty("Claw")
insert = empty("Claw insert", claw)
insert.scale = (0.63, 0.63, 0.63)
tube("Cable coupling", (0, 0, 0), (0, 0, 0.024), 0.037, housing, insert, 8)
tube("Coupling indicator", (0, 0, 0.024), (0, 0, 0.034), 0.041, cyan, insert, 10)
tube("Hub", (0, 0, 0.034), (0, 0, 0.082), 0.064, housing, insert, 9, 0.052)
tube("Front hub", (0, 0, 0.082), (0, 0, 0.097), 0.046, rubber, insert, 9, 0.028)
merge_by_material(insert)

hinges = []
for i in range(3):
    angle = i * 2 * pi / 3
    radial = empty(f"Jaw radial {i + 1}", insert)
    radial.rotation_euler.y = -angle
    hinge = empty(f"Jaw hinge {i + 1}", radial, (0, 0.043, 0.062))
    tube("Knuckle", (-0.024, 0.008, 0), (0.024, 0.008, 0), 0.019, housing, hinge, 8)
    section = [(0.005, 0.004), (0.036, 0.025), (0.042, 0.075), (0.022, 0.111),
               (-0.024, 0.139), (-0.033, 0.125), (-0.012, 0.090), (-0.009, 0.046)]
    widths = (0.021, 0.027, 0.027, 0.020, 0.005, 0.005, 0.015, 0.019)
    n = len(section)
    points = [(side * w, y, z) for side in (-1, 1) for (y, z), w in zip(section, widths)]
    faces = [tuple(range(n)), tuple(range(n, 2*n))]
    faces += [(j, (j+1) % n, (j+1) % n+n, j+n) for j in range(n)]
    mesh("Forged jaw", points, faces, hinge, steel, 0.004)
    # Rotation about local X spreads each jaw away from the nose.
    key(hinge, "rotation_euler", [(f, (-a, 0, 0)) for f, a in
        [(0, 0), (4, 0.43), (10, 0.75), (12, 0.73), (15, -0.04), (18, 0.13)]])
    hinges.append(hinge)

scene.frame_set(0)
bpy.ops.object.select_all(action="SELECT")
GAME.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(GAME / "grappler.glb"), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="SCENE", export_anim_scene_split_object=False,
    export_frame_range=True,
)

# Preview scene. The in-game head follows the actual simulation anchor.
scene.name = "Grappler preview"
scene.frame_start, scene.frame_end = 1, 108
scene.world = bpy.data.worlds.new("Studio")
scene.world.color = (0.16, 0.19, 0.24)
scene.render.engine = "BLENDER_WORKBENCH"
shading = scene.display.shading
shading.light = "STUDIO"
shading.studio_light = "paint.sl"
shading.color_type = "MATERIAL"
shading.show_cavity = True
shading.cavity_type = "BOTH"
shading.show_shadows = True
shading.show_specular_highlight = True
shading.background_type = "WORLD"
scene.view_settings.view_transform = "Standard"
scene.render.resolution_x, scene.render.resolution_y = 960, 540
scene.render.resolution_percentage = 100

deck = material("Studio blue", "536379")
slate = material("Anchor body", "495873")
edge = material("Anchor edge", "71839B")
box("Stage", (0, -0.535, 1.60), (13.0, 0.10, 13.0), deck, bevel=0.05)
box("Anchor pedestal", (0, -0.205, 3.42), (0.68, 0.57, 0.62), slate, bevel=0.055)
box("Anchor plate", (0, 0.089, 3.13), (0.41, 0.14, 0.10), edge, bevel=0.028)
tube("Grip rail", (-0.235, 0.119, 3.07), (0.235, 0.119, 3.07), 0.026, housing, sides=12)
for x in (-0.24, 0.24):
    tube("Rail end", (x - 0.012, 0.119, 3.07), (x + 0.012, 0.119, 3.07), 0.035, trim, sides=10)

dock = 0.100
stop = 2.965
key(claw, "location", [(f, xyz((0, 0.119, z))) for f, z in [
    (1, dock), (19, dock), (23, 0.43), (32, 1.59), (43, stop), (77, stop), (95, dock), (108, dock),
]])
for hinge in hinges:
    hinge.animation_data_clear()
    key(hinge, "rotation_euler", [(f, (-a, 0, 0)) for f, a in [
        (1, 0), (19, 0), (25, 0.43), (39, 0.75), (43, 0.73),
        (47, -0.04), (50, 0.13), (77, 0.13), (83, 0.46), (95, 0), (108, 0),
    ]])

# Mesh cable scaled along the flight axis. Its rear tip stays fixed at Dock.
cable = empty("Tether", at=(0, 0.119, dock))
tube("Tether filament", (0, 0, 0), (0, 0, 1), 0.006, cyan, cable, 10)
driver = cable.driver_add("scale", 1).driver
travel = driver.variables.new()
travel.name = "claw_y"
travel.type = "TRANSFORMS"
travel.targets[0].id = claw
travel.targets[0].transform_type = "LOC_Y"
travel.targets[0].transform_space = "LOCAL_SPACE"
driver.expression = f"max(0.0001, -claw_y - {dock})"

flare = empty("Latch flash", at=(0, 0.119, 3.07))
for i in range(7):
    a = i * 2 * pi / 7
    tube("Impact streak", (cos(a)*0.07, sin(a)*0.07, 0), (cos(a)*0.17, sin(a)*0.17, -0.07),
         0.006, cyan, flare, 5, 0.001)
key(flare, "scale", [(f, (s, s, s)) for f, s in [(1, 0), (42, 0), (46, 1), (54, 0), (108, 0)]])

cam_data = bpy.data.cameras.new("Preview camera")
cam = bpy.data.objects.new("Preview camera", cam_data)
bpy.context.collection.objects.link(cam)
scene.camera = cam
cam.rotation_mode = "QUATERNION"
cam_data.type = "ORTHO"
shots = [(1, (1.25, 0.87, 0.59), (0, 0.07, 0.055), 0.76),
         (14, (1.25, 0.87, 0.59), (0, 0.07, 0.055), 0.76),
         (28, (3.4, 1.95, 1.90), (0, 0.09, 1.58), 4.24),
         (44, (3.4, 1.95, 1.90), (0, 0.09, 1.58), 4.24),
         (59, (1.74, 1.13, 3.00), (0, 0.09, 3.03), 0.89),
         (71, (1.74, 1.13, 3.00), (0, 0.09, 3.03), 0.89),
         (89, (3.4, 1.95, 1.90), (0, 0.09, 1.58), 4.24),
         (108, (1.25, 0.87, 0.59), (0, 0.07, 0.055), 0.76)]
key(cam, "location", [(f, xyz(p)) for f, p, _, _ in shots])
key(cam, "rotation_quaternion", [(f, (xyz(t) - xyz(p)).to_track_quat("-Z", "Y")) for f, p, t, _ in shots])
key(cam_data, "ortho_scale", [(f, scale) for f, _, _, scale in shots])
for label, frame in [("Docked", 1), ("Launch", 19), ("Flight", 32), ("Latch", 43), ("Retract", 77)]:
    scene.timeline_markers.new(label, frame=frame)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == "VIEW_3D":
            area.spaces.active.region_3d.view_perspective = "CAMERA"
            area.spaces.active.overlay.show_overlays = False

bpy.ops.object.select_all(action="DESELECT")
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ART / "grappler.blend"), compress=True)
