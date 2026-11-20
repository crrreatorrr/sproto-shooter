"""Build the universal first-person melee swing: source scene and the in-game GLB.

Run: Blender --background --python art/blender/scripts/build_melee_swing.py

One keyed node, "Melee", carries the whole swing as an offset in camera space (glTF axes: +X right,
+Y up, -Z forward; metres and radians). The game applies that offset on top of whatever gun is held
(src/render/frame/firstPersonView.js), and the first-person arms follow the gun, so one clip serves
every gun: machine gun, shotgun, sniper, bazooka, boss guns, the Duck Gun and the placeholder sidearms.

Beats at 30 fps (the sim lands the hit on the press, so the strike comes early):
  0 rest, 2 cock back and right, 4 strike forward and across to the left, 6 follow-through,
  14 back at rest. The swing stays inside a 0.2 m box, which keeps a long gun (sniper, bazooka) clear
  of the camera.

The .blend also holds a preview: a camera at the eye and three stand-in guns (pistol, rifle,
launcher lengths) parented to the swing, to check the motion on short and long guns alike.
"""
from pathlib import Path

import bpy
from mathutils import Vector


REPO = Path(__file__).resolve().parents[3]
ART = REPO / "art" / "blender"
GAME = REPO / "public" / "assets" / "models" / "gear"
FPS = 30
CLIP = "Melee swing"

# (frame, position [x right, y up, z back], rotation [pitch up, yaw left, roll left]) in glTF camera space
BEATS = [
    (0, (0.0, 0.0, 0.0), (0.0, 0.0, 0.0)),
    (2, (0.05, 0.025, 0.05), (0.22, -0.32, 0.28)),       # cock back and to the right, muzzle up
    (4, (-0.08, -0.015, -0.15), (-0.16, 0.48, -0.42)),   # strike: forward and across to the left
    (6, (-0.10, -0.04, -0.11), (-0.26, 0.55, -0.5)),     # follow-through
    (14, (0.0, 0.0, 0.0), (0.0, 0.0, 0.0)),              # recover
]


def to_blender(p):
    """glTF (x, y, z) -> Blender (x, -z, y). The exporter maps it back."""
    x, y, z = p
    return Vector((x, -z, y))


def rot_to_blender(r):
    """glTF pitch (about X), yaw (about Y), roll (about Z) -> Blender Euler XYZ (X, -Z, Y axes)."""
    pitch, yaw, roll = r
    return (pitch, -roll, yaw)


def material(name, hex_color):
    srgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    rgba = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = rgba
    shader.inputs["Roughness"].default_value = 0.5
    return mat


def stand_in(name, length, height, at_x, mat, parent):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (0.07, length, height)  # Blender Y is glTF -Z: length runs forward
    obj.location = to_blender((at_x, 0.0, 0.0))
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = CLIP
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 0, BEATS[-1][0]

swing = bpy.data.objects.new("Melee", None)
swing.empty_display_type = "ARROWS"
swing.empty_display_size = 0.08
swing.rotation_mode = "XYZ"
scene.collection.objects.link(swing)
for frame, pos, rot in BEATS:
    swing.location = to_blender(pos)
    swing.rotation_euler = rot_to_blender(rot)
    swing.keyframe_insert("location", frame=frame)
    swing.keyframe_insert("rotation_euler", frame=frame)
action = swing.animation_data.action
action.name = CLIP
# Fast out of the windup into the strike, eased recovery. Blender 5 keeps F-curves in action layers.
curves = []
if hasattr(action, "fcurves"):
    curves = list(action.fcurves)
else:
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                curves.extend(bag.fcurves)
for fc in curves:
    for kp in fc.keyframe_points:
        kp.interpolation = "BEZIER"
        kp.easing = "AUTO"
        if int(kp.co.x) in (2, 4):
            kp.interpolation = "QUAD"
            kp.easing = "EASE_IN"

# Export only the swing node and its clip.
scene.frame_set(0)
bpy.ops.object.select_all(action="DESELECT")
swing.select_set(True)
bpy.context.view_layer.objects.active = swing
GAME.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(GAME / "melee_swing.glb"), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="ACTIONS", export_frame_range=True,
    export_force_sampling=True, export_optimize_animation_size=False,
)

# Preview: an eye camera and three stand-in guns riding the swing (not exported).
pistol = material("Pistol stand-in", "C8463A")
rifle = material("Rifle stand-in", "3A6FC8")
launcher = material("Launcher stand-in", "6A8A3A")
rest = bpy.data.objects.new("Gun rest (right hand)", None)
rest.location = to_blender((0.2, -0.19, -0.6))
scene.collection.objects.link(rest)
swing.parent = rest
stand_in("Pistol 0.25 m", 0.25, 0.1, 0.0, pistol, swing)
stand_in("Rifle 0.8 m", 0.8, 0.12, -0.12, rifle, swing)
stand_in("Launcher 0.9 m", 0.9, 0.2, -0.26, launcher, swing)
cam_data = bpy.data.cameras.new("Eye")
cam_data.lens_unit = "FOV"
cam_data.angle = 1.3
cam = bpy.data.objects.new("Eye", cam_data)
cam.location = (0, 0, 0)
cam.rotation_euler = (1.5708, 0, 0)  # look down Blender +Y (glTF -Z, forward)
scene.collection.objects.link(cam)
scene.camera = cam
light = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "SUN"))
light.rotation_euler = (0.9, 0.3, 0.4)
scene.collection.objects.link(light)
scene.frame_set(4)

ART.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ART / "melee_swing.blend"), compress=True)
print("melee swing: wrote", GAME / "melee_swing.glb", "and", ART / "melee_swing.blend")
