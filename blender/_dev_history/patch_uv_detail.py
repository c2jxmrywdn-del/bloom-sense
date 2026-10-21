# -*- coding: utf-8 -*-
# Sculpt-level surface detail: per-petal UVs for veins, high frequency
# wrinkles and ruffled edges, a denser golden stamen crown and a reflexed
# inner petal collar that reveals the flower's heart.
p = 'build_flowers.py'
s = open(p, encoding='utf-8').read()

# --- petal UVs + micro wrinkles ---
s = s.replace(
    "    us, vs = pd['us'], pd['vs']\n    verts = []\n    cols = []",
    "    us, vs = pd['us'], pd['vs']\n    verts = []\n    cols = []\n    uvs = []",
)
s = s.replace(
    "            P = P + width_dir * (v * w_eff * 0.5) + normal_dir * (cup_off + ruf + ridge_off)\n            verts.append(P)\n            cols.append(petal_color(pd, se, v))",
    "            # high frequency longitudinal fold + rippled edge\n            fine = math.sin(se * 34.0 + pd['phase'] * 2.0) * (1.0 - v * v) * W * 0.007\n            edge_ripple = math.sin(se * 26.0 + pd['phase']) * (abs(v) ** 6) * W * pd['ruffle'] * 0.55\n            P = P + width_dir * (v * w_eff * 0.5) + normal_dir * (cup_off + ruf + ridge_off + fine + edge_ripple)\n            verts.append(P)\n            cols.append(petal_color(pd, se, v))\n            uvs.append((se, (v + 1.0) * 0.5))",
)
s = s.replace(
    "    return {'verts': verts, 'quads': quads, 'check_tris': check_tris, 'cols': cols}\n\n\ndef petal_color",
    "    return {'verts': verts, 'quads': quads, 'check_tris': check_tris, 'cols': cols, 'uvs': uvs}\n\n\ndef petal_color",
)

# --- stamen UVs (the same material; constant coordinates keep vein noise calm) ---
s = s.replace(
    "    return {'verts': verts, 'quads': quads, 'check_tris': check_tris, 'cols': cols}\n\ndef ribbon_geo",
    "    return {'verts': verts, 'quads': quads, 'check_tris': check_tris, 'cols': cols,\n            'uvs': [(0.5 + 0.25 * math.sin(i * 1.7), 0.5 + 0.25 * math.cos(i * 1.3)) for i in range(len(verts))]}\n\ndef ribbon_geo",
)

# --- carry UVs through morph parts ---
s = s.replace(
    "        parts.append({'label': 'petal_%02d' % i, 'kind': 'petal',\n                      'verts': g['verts'], 'quads': g['quads'],\n                      'check_tris': g['check_tris'], 'cols': g['cols']})",
    "        parts.append({'label': 'petal_%02d' % i, 'kind': 'petal',\n                      'verts': g['verts'], 'quads': g['quads'],\n                      'check_tris': g['check_tris'], 'cols': g['cols'], 'uvs': g.get('uvs', [])})",
)
s = s.replace(
    "        parts.append({'label': 'stamen_%02d' % i, 'kind': 'stamen',\n                      'verts': g['verts'], 'quads': g['quads'],\n                      'check_tris': g['check_tris'], 'cols': g['cols']})",
    "        parts.append({'label': 'stamen_%02d' % i, 'kind': 'stamen',\n                      'verts': g['verts'], 'quads': g['quads'],\n                      'check_tris': g['check_tris'], 'cols': g['cols'], 'uvs': g.get('uvs', [])})",
)

# --- build and assign the UV layer on the petal mesh ---
s = s.replace(
    "    parts0 = key_parts[0]\n    verts, faces, cols = [], [], []\n    for p in parts0:\n        off = len(verts)\n        verts.extend(p['verts'])\n        cols.extend(p['cols'])\n        faces.extend([tuple(i + off for i in q) for q in p['quads']])\n    petal_obj = new_mesh_object('petals', verts, faces, cols, mat_petal, collection, root)",
    "    parts0 = key_parts[0]\n    verts, faces, cols, uvs = [], [], [], []\n    for p in parts0:\n        off = len(verts)\n        verts.extend(p['verts'])\n        cols.extend(p['cols'])\n        uvs.extend(p.get('uvs') or [(0.5, 0.5)] * len(p['verts']))\n        faces.extend([tuple(i + off for i in q) for q in p['quads']])\n    petal_obj = new_mesh_object('petals', verts, faces, cols, mat_petal, collection, root)\n    uv_layer = petal_obj.data.uv_layers.new(name='UVMap')\n    for poly in petal_obj.data.polygons:\n        for li in poly.loop_indices:\n            vi = petal_obj.data.loops[li].vertex_index\n            uv_layer.data[li].uv = uvs[vi]",
)

# --- rose heart: denser stamens, reflexed inner collar, notched tips ---
s = s.replace(
    "R(9, 0.250, 0.075, 0.58, 0.46, (78, 104), (22, -24), (0.42, 0.60), (0.08, 0.55),\n              profile='rose', az_offset_deg=20.0, ruffle=0.03, us=20, vs=16, closed_len_scale=0.88),",
    "R(9, 0.250, 0.075, 0.58, 0.46, (78, 104), (22, -24), (0.42, 0.60), (0.08, 0.55),\n              profile='rose', az_offset_deg=20.0, ruffle=0.035, us=20, vs=16, closed_len_scale=0.88, notch=0.025),\n            R(9, 0.210, 0.108, 0.50, 0.40, (83, 106), (34, -12), (0.44, 0.62), (0.14, 0.62),\n              profile='rose', az_offset_deg=0.0, ruffle=0.035, us=20, vs=16, closed_len_scale=0.72, notch=0.03),",
)
s = s.replace(
    "R(8, 0.170, 0.140, 0.46, 0.34, (86, 94), (48, 10), (0.46, 0.65), (0.20, 0.70),\n              profile='rose', az_offset_deg=0.0, ruffle=0.026, us=18, vs=14, closed_len_scale=0.6),",
    "R(8, 0.158, 0.150, 0.38, 0.31, (86, 94), (28, -25), (0.46, 0.65), (0.20, 0.70),\n              profile='rose', az_offset_deg=0.0, ruffle=0.03, us=18, vs=14, closed_len_scale=0.55, notch=0.025),",
)
s = s.replace(
    "        'stamens': stamen_spec(34, 0.052, 0.212, 0.22, 0.012, 0.145, 0.0022,\n                               0.030, 0.012, (0.34, 0.98), '#e8c36b', '#a96a28', '#f5dd96'),\n        'pistil': {'length': 0.17, 'r': 0.004, 'color': '#c7d69b', 'stigma': '#9daa56'},",
    "        'stamens': stamen_spec(46, 0.055, 0.218, 0.27, 0.012, 0.165, 0.0026,\n                               0.036, 0.014, (0.30, 0.98), '#edca72', '#a55f1f', '#ffe5a3'),\n        'pistil': {'length': 0.21, 'r': 0.0045, 'color': '#c9d59a', 'stigma': '#a2a953'},",
)
s = s.replace(
    "        'dome_stops': make_stops([(0.0, '#10180d'), (0.5, '#26351a'), (0.85, '#3f4a25'), (1.0, '#5f5c32')]),",
    "        'dome_stops': make_stops([(0.0, '#1b0409'), (0.5, '#3a0710'), (0.82, '#352117'), (1.0, '#4a4a26')]),",
)
# petal outline: keep the tip a little wider and add subtle edge irregularity
s = s.replace(
    "    if kind == 'rose':\n        base, k, e, tip = 0.20, 0.86, 0.38, 0.10",
    "    if kind == 'rose':\n        base, k, e, tip = 0.22, 0.86, 0.38, 0.06",
)
open(p, 'w', encoding='utf-8').write(s)
print('uv / detail patch applied')
