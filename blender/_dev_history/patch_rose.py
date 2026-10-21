# -*- coding: utf-8 -*-
p = 'build_flowers.py'
s = open(p, encoding='utf-8').read()

# richer, broader, rounder rose petal outline
s = s.replace(
    "    if kind == 'rose':\n        base, k, e, tip = 0.16, 0.80, 0.50, 0.45",
    "    if kind == 'rose':\n        base, k, e, tip = 0.20, 0.86, 0.38, 0.10"
)

old_rings = """        'rings': [
            R(7, 0.300, 0.020, 0.72, 0.40, (48, 36), (10, -30), (0.30, 0.42), (0.00, 0.45),
              profile='rose', az_offset_deg=0.0, ruffle=0.022, us=16, vs=12),
            R(7, 0.230, 0.090, 0.62, 0.35, (62, 50), (26, -8), (0.32, 0.46), (0.08, 0.55),
              profile='rose', az_offset_deg=25.7, ruffle=0.022, us=16, vs=12),
            R(6, 0.155, 0.155, 0.47, 0.27, (75, 63), (46, 15), (0.34, 0.50), (0.20, 0.70),
              profile='rose', az_offset_deg=0.0, ruffle=0.02, us=14, vs=10),
            R(5, 0.085, 0.200, 0.32, 0.18, (84, 72), (66, 42), (0.36, 0.55), (0.35, 0.85),
              profile='rose', az_offset_deg=18.0, ruffle=0.018, us=12, vs=8),
        ],"""
new_rings = """        'rings': [
            R(9, 0.320, 0.020, 0.68, 0.55, (70, 54), (-2, -55), (0.38, 0.55), (0.00, 0.42),
              profile='rose', az_offset_deg=0.0, ruffle=0.028, us=18, vs=14),
            R(9, 0.250, 0.075, 0.58, 0.46, (80, 66), (22, -24), (0.42, 0.60), (0.08, 0.55),
              profile='rose', az_offset_deg=20.0, ruffle=0.028, us=18, vs=14),
            R(8, 0.170, 0.140, 0.46, 0.34, (86, 77), (48, 10), (0.46, 0.65), (0.20, 0.70),
              profile='rose', az_offset_deg=0.0, ruffle=0.024, us=16, vs=12),
            R(6, 0.090, 0.190, 0.32, 0.23, (89, 84), (70, 42), (0.50, 0.70), (0.35, 0.85),
              profile='rose', az_offset_deg=18.0, ruffle=0.02, us=14, vs=10),
        ],"""
if old_rings not in s:
    raise SystemExit('rose rings block not found')
s = s.replace(old_rings, new_rings)

s = s.replace(
    "        'preview_t': 0.72,\n        'stops': make_stops([(0.0, '#3b0714'), (0.34, '#a81d3e'), (0.70, '#e65573'), (1.0, '#ffb9c6')]),\n        'edge': hex_lin('#ffd9e0'),\n        'vein': 0.045,",
    "        'preview_t': 0.78,\n        'stops': make_stops([(0.0, '#2f0410'), (0.25, '#7c0b25'), (0.55, '#c31940'), (0.80, '#e84a67'), (1.0, '#f78fa3')]),\n        'edge': hex_lin('#ffc4d0'),\n        'vein': 0.05,"
)
s = s.replace(
    "        'dome': [(0.0, 0.240), (0.085, 0.208), (0.155, 0.160), (0.230, 0.095),\n                 (0.300, 0.030), (0.350, -0.030), (0.300, -0.090), (0.180, -0.145),\n                 (0.060, -0.180), (0.0, -0.190)],\n        'dome_stops': make_stops([(0.0, '#1c2914'), (0.45, '#35451f'), (0.8, '#5f5a2f'), (1.0, '#7f6d3f')]),\n        'bracts': {'count': 5, 'length': 0.34, 'width': 0.17, 'e0': -2, 'e1': -40,\n                    'r': 0.335, 'z': -0.02, 'color': ('#25351a', '#4e6031')},",
    "        'dome': [(0.0, 0.220), (0.06, 0.212), (0.12, 0.192), (0.18, 0.152),\n                 (0.25, 0.082), (0.32, 0.015), (0.37, -0.035), (0.33, -0.090),\n                 (0.20, -0.140), (0.07, -0.172), (0.0, -0.182)],\n        'dome_stops': make_stops([(0.0, '#10180d'), (0.5, '#26351a'), (0.85, '#3f4a25'), (1.0, '#5f5c32')]),\n        'bracts': {'count': 6, 'length': 0.44, 'width': 0.18, 'e0': 15, 'e1': -50,\n                    'r': 0.350, 'z': 0.0, 'color': ('#1d2c12', '#4c6030')},"
)
s = s.replace(
    "        'stem': {'radius': 0.050, 'bend': (0.16, -0.05), 'color_a': '#2b3b1e', 'color_b': '#5a6b3a',\n                  'leaves': [('t', 0.48, 210, 0.58, 1.0), ('t', 0.62, 40, 0.52, 0.95),\n                             ('t', 0.75, 150, 0.42, 0.82)],\n                  'leaf_col': ('#2b4020', '#5d7b3f'), 'thorns': 6},",
    "        'stem': {'radius': 0.055, 'bend': (0.16, -0.05), 'color_a': '#2b3b1e', 'color_b': '#5a6b3a',\n                  'leaves': [('t', 0.46, 210, 0.62, 1.1), ('t', 0.60, 40, 0.56, 1.0),\n                             ('t', 0.74, 150, 0.46, 0.88)],\n                  'leaf_col': ('#2b4020', '#5d7b3f'), 'thorns': 7},"
)
open(p, 'w', encoding='utf-8').write(s)
print('rose improved')
