import re

p = 'build_flowers.py'
s = open(p, encoding='utf-8').read()

# Add bow/ridge tables near width_profile
s = s.replace(
    "def width_profile(kind, s):",
    "BOW_BY_PROFILE = {'rose': 8.0, 'lotus': 10.0, 'lily': 11.0, 'tulip': 14.0, 'cherry': 7.0, 'daisy': 3.0}\n"
    "RIDGE_BY_PROFILE = {'rose': 0.035, 'lotus': 0.045, 'lily': 0.075, 'tulip': 0.05, 'cherry': 0.03, 'daisy': 0.01}\n\n\n"
    "def width_profile(kind, s):"
)

# Petal geometry: bow, stronger cup, ridge, roll
s = s.replace(
    "    cup = lerp(pd['cc'], pd['oc'], q)\n    az = pd['az']",
    "    cup = lerp(pd['cc'], pd['oc'], q) * 1.15\n"
    "    bow = math.radians(BOW_BY_PROFILE.get(pd['profile'], 0.0))\n"
    "    ridge = RIDGE_BY_PROFILE.get(pd['profile'], 0.0)\n"
    "    az = pd['az']"
)

s = s.replace(
    "    N = 44\n"
    "    pts = [base.copy()]\n"
    "    for i in range(1, N + 1):\n"
    "        sm = (i - 0.5) / N\n"
    "        e = e0 + (e1 - e0) * (sm ** 1.35)\n"
    "        pts.append(pts[-1] + (radial * math.cos(e) + up * math.sin(e)) * (L / N))\n"
    "    normals = []\n"
    "    for i in range(N + 1):\n"
    "        s = i / N\n"
    "        e = e0 + (e1 - e0) * (s ** 1.35)\n"
    "        normals.append((-radial * math.sin(e) + up * math.cos(e)).normalized())",
    "    def elev_curve(ss):\n"
    "        return e0 + (e1 - e0) * (ss ** 1.3) + bow * math.sin(math.pi * ss)\n\n"
    "    N = 44\n"
    "    pts = [base.copy()]\n"
    "    for i in range(1, N + 1):\n"
    "        sm = (i - 0.5) / N\n"
    "        e = elev_curve(sm)\n"
    "        pts.append(pts[-1] + (radial * math.cos(e) + up * math.sin(e)) * (L / N))\n"
    "    normals = []\n"
    "    for i in range(N + 1):\n"
    "        s = i / N\n"
    "        e = elev_curve(s)\n"
    "        normals.append((-radial * math.sin(e) + up * math.cos(e)).normalized())"
)

s = s.replace(
    "            e_local = e0 + (e1 - e0) * (se ** 1.35)\n"
    "            radial_dist = math.hypot(P.x, P.y)",
    "            e_local = elev_curve(se)\n"
    "            radial_dist = math.hypot(P.x, P.y)"
)

s = s.replace(
    "            cup_off = cup * (v * v) * w_eff * 0.5\n"
    "            ruf = (math.sin(v * math.pi * pd['ruffle_freq'] + pd['phase'] + se * 4.0)\n"
    "                   * pd['ruffle'] * (v * v) * W * 0.055)\n"
    "            P = P + lateral_axis * (v * w_eff * 0.5) + Nn * (cup_off + ruf)",
    "            cup_shape = 0.62 * (v * v) + 0.38 * (v ** 4)\n"
    "            cup_off = cup * cup_shape * w_eff * 0.5\n"
    "            ruf = (math.sin(v * math.pi * pd['ruffle_freq'] + pd['phase'] + se * 4.0)\n"
    "                   * pd['ruffle'] * (v * v) * W * 0.055)\n"
    "            ridge_off = ridge * ((1.0 - v * v) ** 2) * w_eff * 0.45\n"
    "            roll = pd.get('roll', 0.0)\n"
    "            width_dir = lateral_axis * math.cos(roll) + Nn * math.sin(roll)\n"
    "            normal_dir = -lateral_axis * math.sin(roll) + Nn * math.cos(roll)\n"
    "            P = P + width_dir * (v * w_eff * 0.5) + normal_dir * (cup_off + ruf + ridge_off)"
)

# Color: less edge wash, saturation lift
s = s.replace(
    "    # subtle edge light\n    c = mix(c, pd['edge'], 0.10 * (v * v) * smoothstep(s / 0.5))",
    "    # subtle edge light\n    c = mix(c, pd['edge'], 0.04 * (v * v) * smoothstep(s / 0.5))"
)
s = s.replace(
    "    # sparse speckles (lily)\n",
    "    # modest saturation lift so petals read richly through AgX\n"
    "    lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]\n"
    "    c = tuple(clamp(lum + (x - lum) * 1.22) for x in c)\n"
    "    # sparse speckles (lily)\n"
)

# Add roll to petal data
s = s.replace(
    "                'tone': tone, 'phase': rng.uniform(0, math.pi * 2),\n"
    "                'ruffle_freq': rng.uniform(2.2, 3.6),",
    "                'tone': tone, 'phase': rng.uniform(0, math.pi * 2),\n"
    "                'roll': math.radians(rng.uniform(-6.0, 6.0)),\n"
    "                'ruffle_freq': rng.uniform(2.2, 3.6),"
)

# Camera framing
s = s.replace(
    "PREVIEW_DIST = {'rose': 6.2, 'lotus': 6.5, 'lily': 5.9, 'tulip': 4.4, 'cherry': 3.9, 'daisy': 5.2}\n"
    "FRAME_DIR = Vector((0.36, -1.0, 0.26)).normalized()",
    "PREVIEW_DIST = {'rose': 5.5, 'lotus': 5.9, 'lily': 5.4, 'tulip': 4.0, 'cherry': 3.6, 'daisy': 4.8}\n"
    "FRAME_DIR = Vector((0.38, -1.0, 0.16)).normalized()"
)
s = s.replace("scn.view_settings.exposure = 0.4", "scn.view_settings.exposure = 0.5")
s = s.replace(
    "area('KEY', (3.4, -4.0, 4.9), 980, (1.0, 0.86, 0.72), 3.6)",
    "area('KEY', (3.4, -4.0, 4.9), 1150, (1.0, 0.86, 0.72), 3.6)"
)
s = s.replace(
    "area('RIM', (-1.6, 4.0, 4.3), 1350, (0.78, 0.88, 1.0), 2.6)",
    "area('RIM', (-1.6, 4.0, 4.3), 1650, (0.80, 0.88, 1.0), 2.6)"
)

# DOF setup
s = s.replace(
    "    cam.data.lens = 70\n    scn.camera = cam",
    "    cam.data.lens = 70\n"
    "    try:\n"
    "        cam.data.dof.use_dof = True\n"
    "        cam.data.dof.aperture_fstop = 3.5\n"
    "    except Exception:\n"
    "        pass\n"
    "    scn.camera = cam"
)
s = s.replace(
    "    frame_camera(f)\n    scn.render.film_transparent = transparent",
    "    frame_camera(f)\n"
    "    cam = bpy.data.objects.get('CAM_Studio')\n"
    "    if cam:\n"
    "        try:\n"
    "            cam.data.dof.use_dof = not small\n"
    "            target = Vector((0.0, 0.0, f['head_z'] + 0.10))\n"
    "            cam.data.dof.focus_distance = (cam.location - target).length\n"
    "            cam.data.dof.aperture_fstop = 3.5\n"
    "        except Exception:\n"
    "            pass\n"
    "    scn.render.film_transparent = transparent"
)

# Darker greener receptacle dome
s = s.replace(
    "    g = lathe_geo(dome, 28, lambda rf, zf: gradient(f['dome_stops'], 0.15 + 0.85 * rf))\n"
    "    add_geo(b, g)",
    "    deep = hex_lin('#1c2a13')\n"
    "    g = lathe_geo(dome, 28, lambda rf, zf: mix(mul(gradient(f['dome_stops'], 0.15 + 0.85 * rf), 0.82), deep, 0.40))\n"
    "    add_geo(b, g)"
)

# Larger bracts
s = s.replace(
    "            gg = ribbon_geo(base, az, br['length'], br['width'], br['e0'], br['e1'],\n"
    "                            0.32, 'bract', col, us=7, vs=4, insert=0.035, vein=0.22)",
    "            gg = ribbon_geo(base, az, br['length'] * 1.22, br['width'] * 1.15, br['e0'], br['e1'],\n"
    "                            0.32, 'bract', col, us=7, vs=4, insert=0.035, vein=0.22)"
)

# Thicker stems
s = s.replace(
    "        radii.append(f['stem']['radius'] * (1.0 - 0.35 * s) + 0.018 * max(0, (0.05 - s)) / 0.05)",
    "        radii.append(f['stem']['radius'] * 1.1 * (1.0 - 0.35 * s) + 0.018 * max(0, (0.05 - s)) / 0.05)"
)

# Petal subsurface and coat
s = s.replace(
    "    if emissive:\n"
    "        try:\n"
    "            bsdf.inputs['Emission Color'].default_value = (*hex_lin(emissive), 1.0)",
    "    if 'petals' in name:\n"
    "        try:\n"
    "            bsdf.inputs['Subsurface Weight'].default_value = 0.05\n"
    "            bsdf.inputs['Subsurface Radius'].default_value = (0.25, 0.09, 0.06)\n"
    "        except Exception:\n"
    "            pass\n"
    "        try:\n"
    "            bsdf.inputs['Coat Weight'].default_value = 0.10\n"
    "            bsdf.inputs['Coat Roughness'].default_value = 0.35\n"
    "        except Exception:\n"
    "            pass\n"
    "    if emissive:\n"
    "        try:\n"
    "            bsdf.inputs['Emission Color'].default_value = (*hex_lin(emissive), 1.0)"
)


def set_preview_t(text, fid, val):
    key = "'id': '%s'" % fid
    idx = text.index(key)
    m = re.search(r"'preview_t':\s*[0-9.]+", text[idx:])
    if not m:
        return text
    a = idx + m.start()
    b = idx + m.end()
    return text[:a] + "'preview_t': %s" % val + text[b:]


for fid, val in [('rose', 0.72), ('lotus', 0.8), ('lily', 0.88), ('tulip', 0.8), ('cherry', 0.95), ('daisy', 1.0)]:
    s = set_preview_t(s, fid, val)

open(p, 'w', encoding='utf-8').write(s)
print('global aesthetics patched')
