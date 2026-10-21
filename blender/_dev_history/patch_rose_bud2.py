# -*- coding: utf-8 -*-
p = 'build_flowers.py'
s = open(p, encoding='utf-8').read()

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
s = s.replace(
    "(68, 102), (-2, -55), (0.38, 0.55), (0.00, 0.42),\n              profile='rose', az_offset_deg=0.0, ruffle=0.028, us=18, vs=14)",
    "(68, 100), (-2, -55), (0.38, 0.55), (0.00, 0.42),\n              profile='rose', az_offset_deg=0.0, ruffle=0.028, us=18, vs=14, closed_len_scale=0.98)",
)
s = s.replace(
    "(78, 110), (22, -24), (0.42, 0.60), (0.08, 0.55),\n              profile='rose', az_offset_deg=20.0, ruffle=0.028, us=18, vs=14)",
    "(78, 104), (22, -24), (0.42, 0.60), (0.08, 0.55),\n              profile='rose', az_offset_deg=20.0, ruffle=0.028, us=18, vs=14, closed_len_scale=0.85)",
)
s = s.replace(
    "(84, 118), (48, 10), (0.46, 0.65), (0.20, 0.70),\n              profile='rose', az_offset_deg=0.0, ruffle=0.024, us=16, vs=12)",
    "(84, 96), (48, 10), (0.46, 0.65), (0.20, 0.70),\n              profile='rose', az_offset_deg=0.0, ruffle=0.024, us=16, vs=12, closed_len_scale=0.55)",
)
s = s.replace(
    "(88, 124), (70, 42), (0.50, 0.70), (0.35, 0.85),\n              profile='rose', az_offset_deg=18.0, ruffle=0.02, us=14, vs=10)",
    "(89, 86), (70, 42), (0.50, 0.70), (0.35, 0.85),\n              profile='rose', az_offset_deg=18.0, ruffle=0.02, us=14, vs=10, closed_len_scale=0.18)",
)
open(p, 'w', encoding='utf-8').write(s)
print('rose bud2 patch applied')
