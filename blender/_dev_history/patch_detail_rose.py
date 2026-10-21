# -*- coding: utf-8 -*-
p = 'build_flowers.py'
s = open(p, encoding='utf-8').read()

# support per-ring closed length scaling
if 'closed_len_scale=1.0' not in s:
    s = s.replace(
        "      profile='rose', notch=0.0, us=14, vs=10, ruffle=0.018, az_offset_deg=0.0):",
        "      profile='rose', notch=0.0, us=14, vs=10, ruffle=0.018, az_offset_deg=0.0,\n      closed_len_scale=1.0):",
    )
    s = s.replace(
        "        'us': us, 'vs': vs, 'ruffle': ruffle,\n        'az_offset': math.radians(az_offset_deg),",
        "        'us': us, 'vs': vs, 'ruffle': ruffle,\n        'az_offset': math.radians(az_offset_deg),\n        'closed_len_scale': closed_len_scale,",
    )
    s = s.replace(
        "'cl': ring['cl'] * clf * (1 + rng.uniform(-0.012, 0.012)),",
        "'cl': ring['cl'] * clf * ring.get('closed_len_scale', 1.0) * (1 + rng.uniform(-0.012, 0.012)),",
    )

s = s.replace("    'rose': 0.62, 'lotus': 0.95, 'lily': 0.96,", "    'rose': 0.95, 'lotus': 0.95, 'lily': 0.96,")

# The rose is rebuilt as a lush peony-like bloom: 26 petals in three layers,
# plus a real golden stamen crown and pistil. Inner layers are allowed to
# shorten in the bud so the outer petals can fold over them without collisions.
old_rings = s[s.index("        'rings': [", s.index("'id': 'rose'")):s.index("        'dome':", s.index("'id': 'rose'"))]
new_rings = """        'rings': [
            R(9, 0.320, 0.020, 0.68, 0.55, (68, 100), (-2, -55), (0.38, 0.55), (0.00, 0.42),
              profile='rose', az_offset_deg=0.0, ruffle=0.03, us=20, vs=16, closed_len_scale=1.0),
            R(9, 0.250, 0.075, 0.58, 0.46, (78, 104), (22, -24), (0.42, 0.60), (0.08, 0.55),
              profile='rose', az_offset_deg=20.0, ruffle=0.03, us=20, vs=16, closed_len_scale=0.88),
            R(8, 0.170, 0.140, 0.46, 0.34, (86, 94), (48, 10), (0.46, 0.65), (0.20, 0.70),
              profile='rose', az_offset_deg=0.0, ruffle=0.026, us=18, vs=14, closed_len_scale=0.6),
        ],
"""
s = s.replace(old_rings, new_rings)

# leave an open, detailed golden heart at the center
s = s.replace(
    "        'bracts': {'count': 6, 'length': 0.44, 'width': 0.18, 'e0': 15, 'e1': -50,\n                    'r': 0.350, 'z': 0.0, 'color': ('#1d2c12', '#4c6030')},\n        'stamens': None,",
    "        'bracts': {'count': 6, 'length': 0.44, 'width': 0.18, 'e0': 15, 'e1': -50,\n                    'r': 0.350, 'z': 0.0, 'color': ('#1d2c12', '#4c6030')},\n        'stamens': stamen_spec(34, 0.052, 0.212, 0.22, 0.012, 0.145, 0.0022,\n                               0.030, 0.012, (0.34, 0.98), '#e8c36b', '#a96a28', '#f5dd96'),\n        'pistil': {'length': 0.17, 'r': 0.004, 'color': '#c7d69b', 'stigma': '#9daa56'},"
)

# warmer, deeper petal gradient
s = s.replace(
    "        'stops': make_stops([(0.0, '#3b0714'), (0.34, '#a81d3e'), (0.70, '#e65573'), (1.0, '#ffb9c6')]),",
    "        'stops': make_stops([(0.0, '#320310'), (0.28, '#8a0b28'), (0.58, '#cf2345'), (0.82, '#ef5c73'), (1.0, '#f9a0b1')]),"
)

open(p, 'w', encoding='utf-8').write(s)
print('rose detail patch applied')
