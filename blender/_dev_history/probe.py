import bpy
import os

print("BLENDER_VERSION", bpy.app.version_string)
print("ENGINES", [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items])

# glTF exporter props
try:
    props = bpy.ops.export_scene.gltf.get_rna_type().properties
    names = sorted(p.identifier for p in props)
    print("GLTF_PROPS", names)
except Exception as e:
    print("GLTF_PROPS_ERR", e)

# Cycles devices
try:
    prefs = bpy.context.preferences.addons.get('cycles')
    if prefs:
        cp = prefs.preferences
        cp.get_devices()
        print("CYCLES_DEVICES", [(d.name, d.type) for d in cp.devices])
        print("CYCLES_COMPUTE_TYPE", cp.compute_device_type)
except Exception as e:
    print("CYCLES_ERR", e)

# simple cube test + render
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.mesh.primitive_cube_add(size=1)
cube = bpy.context.object
bpy.ops.object.light_add(type='AREA', location=(3, -3, 4))
light = bpy.context.object
light.data.energy = 500
light.data.size = 4
bpy.ops.object.camera_add(location=(3.2, -3.8, 2.6))
cam = bpy.context.object
cam.rotation_euler = (1.1, 0, 0.7)
sc.camera = cam
sc.render.resolution_x = 320
sc.render.resolution_y = 320
out = os.path.join(os.path.dirname(__file__), "probe_render")
sc.render.image_settings.file_format = 'PNG'
sc.render.filepath = out + "_eevee"
try:
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
except Exception:
    try:
        sc.render.engine = 'BLENDER_EEVEE'
    except Exception as e:
        print("EEVEE_SET_ERR", e)
print("RENDER_ENGINE", sc.render.engine)
try:
    bpy.ops.render.render(write_still=True)
    print("EEVEE_RENDER_OK", os.path.exists(out + "_eevee.png"))
except Exception as e:
    print("EEVEE_RENDER_ERR", e)

# workbench fallback
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.filepath = out + "_workbench"
try:
    bpy.ops.render.render(write_still=True)
    print("WORKBENCH_RENDER_OK", os.path.exists(out + "_workbench.png"))
except Exception as e:
    print("WORKBENCH_RENDER_ERR", e)

# cycles cpu quick test
sc.render.engine = 'CYCLES'
sc.cycles.samples = 8
sc.cycles.use_denoising = True
sc.render.filepath = out + "_cycles"
try:
    bpy.ops.render.render(write_still=True)
    print("CYCLES_RENDER_OK", os.path.exists(out + "_cycles.png"))
except Exception as e:
    print("CYCLES_RENDER_ERR", e)

# export cube test
bpy.ops.object.select_all(action='SELECT')
glb = os.path.join(os.path.dirname(__file__), "probe_cube.glb")
try:
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True)
    print("GLB_OK", os.path.exists(glb), os.path.getsize(glb) if os.path.exists(glb) else 0)
except Exception as e:
    print("GLB_ERR", e)
