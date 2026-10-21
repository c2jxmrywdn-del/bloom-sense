import re
import os

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_flowers.py')
s = open(path, encoding='utf-8').read()

new_R = '''def R(count, radius, z, length, width, closed, open_, cup, window, white_mix=0.0,
      profile='rose', notch=0.0, us=14, vs=10, ruffle=0.018, az_offset_deg=0.0):
    return {
        'count': count, 'r': radius, 'z': z, 'cl': length, 'ol': length * 1.045,
        'cw': width, 'ow': width * 1.08,
        'ce': closed, 'oe': open_, 'cc': cup[0], 'oc': cup[1],
        'window': window, 'white_mix': white_mix, 'profile': profile, 'notch': notch,
        'us': us, 'vs': vs, 'ruffle': ruffle,
        'az_offset': math.radians(az_offset_deg),
    }'''

new_resolve = '''def resolve_petals(f):
    rng = random.Random(1000 + len(f['id']) * 17 + sum(ord(c) for c in f['id']))
    petals = []
    cwf = CLOSED_WIDTH_FACTOR.get(f['id'], 0.95)
    ccf = CLOSED_CUP_FACTOR.get(f['id'], 0.9)
    clf = CLOSED_LEN_FACTOR.get(f['id'], 0.95)
    for ri, ring in enumerate(f['rings']):
        count = ring['count']
        slot_half = math.pi / count
        az_off = ring.get('az_offset', (ri % 2) * slot_half)
        for i in range(count):
            az = 2.0 * math.pi * (i + 0.5) / count + az_off + rng.uniform(-0.06, 0.06) * slot_half
            jitter = rng.uniform(-0.014, 0.014)
            tone = 1.0 + rng.uniform(-0.03, 0.03)
            pd = {
                'az': az,
                'r': ring['r'] + (0.0022 if i % 2 else -0.0015),
                'z': f['head_z'] + ring['z'] + rng.uniform(-0.002, 0.002),
                'cl': ring['cl'] * clf * (1 + rng.uniform(-0.012, 0.012)),
                'ol': ring['ol'] * (1 + rng.uniform(-0.012, 0.012)),
                'cw': ring['cw'] * cwf * (1 + rng.uniform(-0.015, 0.015)),
                'ow': ring['ow'] * (1 + rng.uniform(-0.015, 0.015)),
                'ce': (ring['ce'][0] + rng.uniform(-0.8, 0.4), ring['ce'][1] + rng.uniform(-0.8, 0.8)),
                'oe': (ring['oe'][0] + rng.uniform(-0.8, 0.8), ring['oe'][1] + rng.uniform(-1.0, 1.0)),
                'cc': ring['cc'] * ccf, 'oc': ring['oc'],
                'start': clamp(ring['window'][0] + jitter),
                'end': clamp(ring['window'][1] + jitter * 1.7),
                'profile': ring['profile'], 'notch': ring['notch'],
                'us': ring['us'], 'vs': ring['vs'],
                'slot_half': slot_half * 0.92,
                'ruffle': ring['ruffle'],
                'insert': 0.052,
                'white_mix': ring['white_mix'],
                'stops': f['stops'], 'edge': f['edge'],
                'vein': f['vein'], 'veins': f['veins'],
                'speckle': f['speckle'], 'speckle_color': f['speckle_color'],
                'tone': tone, 'phase': rng.uniform(0, math.pi * 2),
                'ruffle_freq': rng.uniform(2.2, 3.6),
                'seed': 31 + ri * 10 + i,
            }
            petals.append(pd)
    return petals'''

# Replace R helper
s = re.sub(r"def R\(.*?\n\n\nSTAMEN_CLOSED_LEN", new_R + "\n\n\nSTAMEN_CLOSED_LEN", s, flags=re.S)
# Replace resolve_petals
s = re.sub(r"def resolve_petals\(f\):.*?\n\n\ndef resolve_stamens", new_resolve + "\n\n\ndef resolve_stamens", s, flags=re.S)

# Closed factors: let per-layer slot clamp do the work
s = re.sub(r"CLOSED_WIDTH_FACTOR = \{.*?\n\}", "CLOSED_WIDTH_FACTOR = {\n    'rose': 0.95, 'lotus': 0.95, 'lily': 0.95,\n    'tulip': 0.95, 'cherry': 0.9, 'daisy': 0.98,\n}", s, flags=re.S)
s = re.sub(r"CLOSED_CUP_FACTOR = \{.*?\n\}", "CLOSED_CUP_FACTOR = {\n    'rose': 0.9, 'lotus': 0.9, 'lily': 0.9,\n    'tulip': 0.92, 'cherry': 0.85, 'daisy': 0.95,\n}", s, flags=re.S)
s = re.sub(r"CLOSED_LEN_FACTOR = \{.*?\n\}", "CLOSED_LEN_FACTOR = {\n    'rose': 0.95, 'lotus': 0.95, 'lily': 0.96,\n    'tulip': 0.95, 'cherry': 0.92, 'daisy': 0.97,\n}", s, flags=re.S)

# Broader, more visible leaves
s = s.replace("length * 0.34 * scale", "length * 0.52 * scale")

# Replace FLOWERS block
new_flowers = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'new_specs.py'), encoding='utf-8').read().strip()
start = s.index('FLOWERS = [')
marker = '# ---------------------------------------------------------------------------\n# resolved petal/stamen specs'
end = s.index(marker, start)
s = s[:start] + new_flowers + '\n\n\n' + s[end:]

open(path, 'w', encoding='utf-8').write(s)
print('redesign patched')
