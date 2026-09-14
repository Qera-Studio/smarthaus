"""Blender -> public/hero/villa.glb, the hero's real-time villa.

    /Applications/Blender.app/Contents/MacOS/Blender -b <scene>.blend \
        --python scripts/export-villa.py

Run it against whichever .blend is current; it writes public/hero/villa.glb
relative to this file. The site needs no code change when the model is
re-exported — same contract the scene manifest has.

Three things this does, each of which matters:

  * DROPS THE GROUND SLABS, `plot` AND `podium_n`. Both are 60x60m and render
    as opaque grey planes with a hard horizon, which is what stopped the
    pre-rendered frames from blending into the page. Real-time has the same
    problem and the same fix: no ground. The hero's bottom edge is a CSS mask
    into the page colour, so a floor would have to be painted, not modelled.
    `podium_n` is the easy one to miss — it sits directly under `plot` and only
    becomes visible once `plot` is gone.

  * CLEARS EVERY MODIFIER. The scene carries 2,546 bevel modifiers, one per
    object. Applying them on export takes 30,540 triangles to millions and the
    file from 1.6MB to 29MB. At hero scale the bevels are sub-pixel: they are a
    Cycles nicety, not geometry the viewer can see.

  * JOINS TO ONE MESH. 2,546 separate objects is 3MB of per-object glTF
    metadata for 30k triangles. One draw call is also the difference between a
    mid-range phone rendering this comfortably and not.

Deliberately NO Draco. Plain glTF is 1.6MB raw, 284KB over gzip, which the CDN
applies for free. Draco reaches 164KB but needs a 752KB wasm decoder served
from our origin AND 'wasm-unsafe-eval' in the CSP. Smaller file, much larger
transfer, and a widened script policy: a bad trade three times over.

NOTE: joining loses per-object names, which phase 3's service explorer will
want for its `sys_*` hooks (sys_gate, sys_ac, sys_curtains, sys_tv,
sys_garage, sys_led). When that lands, join per material group rather than
globally and keep those objects out of the join.
"""

import os

import bpy

HERE = os.path.dirname(os.path.realpath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "public", "hero", "villa.glb")

scene = bpy.context.scene

# Renderable meshes only.
for obj in list(scene.objects):
    if obj.type != "MESH" or obj.hide_render:
        bpy.data.objects.remove(obj, do_unlink=True)

# The ground planes. See the module docstring.
GROUND = {"plot", "podium_n"}
for obj in list(scene.objects):
    if obj.name in GROUND:
        bpy.data.objects.remove(obj, do_unlink=True)

for obj in scene.objects:
    obj.modifiers.clear()

meshes = [o for o in scene.objects if o.type == "MESH"]
if not meshes:
    raise SystemExit("No renderable meshes left to export")

bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()

joined = bpy.context.view_layer.objects.active
tris = sum(len(p.vertices) - 2 for p in joined.data.polygons)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_selection=True,
    # False, not True: applying modifiers is exactly what the clear above
    # exists to avoid.
    export_apply=False,
    export_draco_mesh_compression_enable=False,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
)

print(f"villa.glb: {tris} triangles, {os.path.getsize(OUT) / 1e6:.2f}MB -> {OUT}")
