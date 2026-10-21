#!/usr/bin/env python3
"""
BloomSense - procedural botanical atelier
Builds six detailed, morph-animated flowers in Blender, validates petal
self-intersection across the full bloom animation, exports GLB models and
renders gallery previews.

Run:
  blender -b --factory-startup -P build_flowers.py -- [--only rose,lotus] [--no-render]

Design notes:
  * Every petal is a parametric surface grown from a socket on a receptacle dome.
    The first few percent of its length is embedded in the dome (a real joint,
    not a floating shell).
  * Blooming is baked into 6 morph targets. All in-between states are checked
    with BVH triangle tests so petals never pass through each other.
  * Stamens also morph; they stay tucked inside the closed bud and splay open
    with the flower.
"""

import bpy
import math
import os
import sys
import json
import random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)
MODELS_DIR = os.path.join(PROJECT, "public", "models", "flowers")
PREVIEW_DIR = os.path.join(PROJECT, "public", "previews")
VERIFY_DIR = os.path.join(HERE, "verify")
RENDER_DIR = os.path.join(HERE, "renders")
for d in (MODELS_DIR, PREVIEW_DIR, VERIFY_DIR, RENDER_DIR):
    os.makedirs(d, exist_ok=True)

KEY_T = [i / 6.0 for i in range(7)]
KEY_NAMES = ["b%d" % i for i in range(1, 7)]

# ---------------------------------------------------------------------------
# small math / color helpers
# ---------------------------------------------------------------------------

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(x):
    x = clamp(x)
    return x * x * (3.0 - 2.0 * x)


def srgb_to_linear(c):
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def hex_lin(h):
    h = h.lstrip('#')
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4))


def mix(a, b, t):
    t = clamp(t)
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


def mul(a, f):
    return (clamp(a[0] * f), clamp(a[1] * f), clamp(a[2] * f))


def gradient(stops, x):
    """stops: list of (pos, linear rgb)"""
    x = clamp(x)
    if x <= stops[0][0]:
        return stops[0][1]
    for i in range(1, len(stops)):
        if x <= stops[i][0]:
            p0, c0 = stops[i - 1]
            p1, c1 = stops[i]
            f = (x - p0) / max(1e-9, p1 - p0)
            return mix(c0, c1, smoothstep(f))
    return stops[-1][1]


def make_stops(pairs):
    return [(p, hex_lin(c)) for p, c in pairs]


def hash01(*args):
    """deterministic pseudo random in [0,1)"""
    h = 2166136261
    for a in args:
        h ^= int((a * 10000) + 12345) & 0xffffffff
        h = (h * 16777619) & 0xffffffff
    return (h & 0xffffff) / float(0x1000000)


def basis_from_axis(axis):
    n = axis.normalized()
    helper = Vector((0, 0, 1)) if abs(n.dot(Vector((0, 0, 1)))) < 0.92 else Vector((0, 1, 0))
    a = n.cross(helper).normalized()
    b = n.cross(a).normalized()
    return a, b, n


def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


# ---------------------------------------------------------------------------
# geometry builders
# ---------------------------------------------------------------------------

BOW_BY_PROFILE = {'rose': 8.0, 'lotus': 10.0, 'lily': 11.0, 'tulip': 14.0, 'cherry': 7.0, 'daisy': 3.0}
RIDGE_BY_PROFILE = {'rose': 0.035, 'lotus': 0.045, 'lily': 0.075, 'tulip': 0.05, 'cherry': 0.03, 'daisy': 0.01}


def width_profile(kind, s):
    s = clamp(s)
    if kind == 'rose':
        base, k, e, tip = 0.22, 0.86, 0.38, 0.06
    elif kind == 'lotus':
        base, k, e, tip = 0.10, 0.86, 0.62, 0.90
    elif kind == 'lily':
        base, k, e, tip = 0.08, 0.90, 0.68, 0.92
    elif kind == 'tulip':
        base, k, e, tip = 0.18, 0.82, 0.48, 0.28
    elif kind == 'cherry':
        base, k, e, tip = 0.20, 0.78, 0.48, 0.55
    elif kind == 'daisy':
        base, k, e, tip = 0.10, 0.90, 0.78, 0.65
    elif kind == 'leaf':
        base, k, e, tip = 0.10, 1.00, 0.60, 0.95
    else:  # bract
        base, k, e, tip = 0.18, 0.85, 0.60, 0.70
    w = base + (1.0 - base) * (math.sin(math.pi * (s ** k)) ** e)
    w *= 1.0 - tip * smoothstep((s - 0.82) / 0.18)
    return max(0.015, w)


def petal_geo(pd, t):
    """Return dict with verts, quads, check_tris, cols for one petal at time t."""
    q = smoothstep(clamp((t - pd['start']) / max(1e-6, pd['end'] - pd['start'])))
    e0 = math.radians(lerp(pd['ce'][0], pd['oe'][0], q))
    e1 = math.radians(lerp(pd['ce'][1], pd['oe'][1], q))
    L = lerp(pd['cl'], pd['ol'], q)
    W = lerp(pd['cw'], pd['ow'], q)
    cup = lerp(pd['cc'], pd['oc'], q) * 1.15
    bow = math.radians(BOW_BY_PROFILE.get(pd['profile'], 0.0))
    ridge = RIDGE_BY_PROFILE.get(pd['profile'], 0.0)
    az = pd['az']
    radial = Vector((math.cos(az), math.sin(az), 0.0))
    tangent = Vector((-math.sin(az), math.cos(az), 0.0))
    up = Vector((0.0, 0.0, 1.0))
    base = Vector((pd['r'] * math.cos(az), pd['r'] * math.sin(az), pd['z'])) - radial * pd['insert']

    def elev_curve(ss):
        return e0 + (e1 - e0) * (ss ** 1.3) + bow * math.sin(math.pi * ss)

    N = 44
    pts = [base.copy()]
    for i in range(1, N + 1):
        sm = (i - 0.5) / N
        e = elev_curve(sm)
        pts.append(pts[-1] + (radial * math.cos(e) + up * math.sin(e)) * (L / N))
    normals = []
    for i in range(N + 1):
        s = i / N
        e = elev_curve(s)
        normals.append((-radial * math.sin(e) + up * math.cos(e)).normalized())

    def sample(s):
        s = clamp(s)
        f = s * N
        i = min(int(f), N - 1)
        a = f - i
        return pts[i].lerp(pts[i + 1], a), normals[i].lerp(normals[i + 1], a).normalized()

    us, vs = pd['us'], pd['vs']
    verts = []
    cols = []
    uvs = []
    lateral_axis = Vector((tangent.x, tangent.y, 0.0)).normalized()
    slot_half = pd['slot_half'] * (0.70 if pd['profile'] == 'tulip' else 0.86)
    tan_slot = math.tan(slot_half)
    for iu in range(us + 1):
        s = iu / us
        for iv in range(vs + 1):
            v = -1.0 + 2.0 * iv / vs
            se = s
            if pd['notch'] > 0.0:
                se = s - pd['notch'] * (max(0.0, s - 0.55) / 0.45) ** 1.5 * math.exp(-(v / 0.28) ** 2)
            P, Nn = sample(se)
            e_local = elev_curve(se)
            radial_dist = math.hypot(P.x, P.y)
            w_full = W * width_profile(pd['profile'], se)
            # Keep the entire petal inside its exclusive azimuthal wedge.
            # This is the structural guarantee against petal-petal clipping.
            w_eff = w_full
            for _ in range(3):
                cup_off = cup * (w_eff * 0.5)
                ruffle_off = abs(math.sin(v * math.pi * pd['ruffle_freq'] + pd['phase'] + se * 4.0)) * pd['ruffle'] * W * 0.055
                r_edge = max(0.012, radial_dist - (cup_off + ruffle_off) * math.sin(e_local))
                w_eff = min(w_full, 2.0 * r_edge * tan_slot)
            cup_shape = 0.62 * (v * v) + 0.38 * (v ** 4)
            cup_off = cup * cup_shape * w_eff * 0.5
            ruf = (math.sin(v * math.pi * pd['ruffle_freq'] + pd['phase'] + se * 4.0)
                   * pd['ruffle'] * (v * v) * W * 0.055)
            ridge_off = ridge * ((1.0 - v * v) ** 2) * w_eff * 0.45
            roll = pd.get('roll', 0.0)
            width_dir = lateral_axis * math.cos(roll) + Nn * math.sin(roll)
            normal_dir = -lateral_axis * math.sin(roll) + Nn * math.cos(roll)
            # high frequency longitudinal fold + rippled edge
            fine = math.sin(se * 34.0 + pd['phase'] * 2.0) * (1.0 - v * v) * W * 0.007
            edge_ripple = math.sin(se * 26.0 + pd['phase']) * (abs(v) ** 6) * W * pd['ruffle'] * 0.55
            P = P + width_dir * (v * w_eff * 0.5) + normal_dir * (cup_off + ruf + ridge_off + fine + edge_ripple)
            verts.append(P)
            cols.append(petal_color(pd, se, v))
            uvs.append((se, (v + 1.0) * 0.5))

    quads = []
    for iu in range(us):
        for iv in range(vs):
            a = iu * (vs + 1) + iv
            b = (iu + 1) * (vs + 1) + iv
            c = (iu + 1) * (vs + 1) + iv + 1
            d = iu * (vs + 1) + iv + 1
            quads.append((a, b, c, d))

    check_tris = []
    for iu in range(2, us):  # skip the socket rows hidden inside the receptacle
        for iv in range(vs):
            a = iu * (vs + 1) + iv
            b = (iu + 1) * (vs + 1) + iv
            c = (iu + 1) * (vs + 1) + iv + 1
            d = iu * (vs + 1) + iv + 1
            check_tris.append((a, b, c))
            check_tris.append((a, c, d))
    return {'verts': verts, 'quads': quads, 'check_tris': check_tris, 'cols': cols, 'uvs': uvs}


def petal_color(pd, s, v):
    c = gradient(pd['stops'], s)
    if pd['white_mix'] > 0:
        c = mix(c, (0.96, 0.93, 0.9), pd['white_mix'])
    # per petal tone variation
    c = mul(c, pd['tone'])
    # darker at the socket for depth
    c = mix(mul(c, 0.72), c, smoothstep(s / 0.14))
    # subtle edge light
    c = mix(c, pd['edge'], 0.04 * (v * v) * smoothstep(s / 0.5))
    # veins running along the petal
    if pd['vein'] > 0:
        vein = 0.5 + 0.5 * math.cos(v * pd['veins'] * math.pi * 2.0 + pd['phase'])
        c = mul(c, 1.0 - pd['vein'] * (vein ** 3) * smoothstep((s - 0.08) / 0.3))
    # modest saturation lift so petals read richly through AgX
    lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    c = tuple(clamp(lum + (x - lum) * 1.22) for x in c)
    # sparse speckles (lily)
    if pd['speckle'] > 0 and 0.08 < s < 0.5:
        h = hash01(pd['seed'], s * 7.3, v * 4.1)
        if h < pd['speckle']:
            c = mix(c, pd['speckle_color'], 0.72)
    return tuple(clamp(x) for x in c)


def stamen_geo(pd, t):
    q = smoothstep(clamp((t - pd['start']) / max(1e-6, pd['end'] - pd['start'])))
    az = pd['az']
    radial = Vector((math.cos(az), math.sin(az), 0.0))
    up = Vector((0, 0, 1))
    base = Vector((pd['r'] * math.cos(az), pd['r'] * math.sin(az), pd['z']))
    spread = lerp(pd['spread_closed'], pd['spread_open'], q)
    grow = lerp(pd.get('closed_len', 0.3), 1.0, q)
    size_scale = 0.22 + 0.78 * q
    L = pd['length'] * grow * (0.96 + 0.04 * q)
    p0 = base
    p1 = base + up * (L * 0.55) + radial * (spread * 0.22)
    p2 = base + up * L + radial * spread
    pts = []
    n = 9
    for i in range(n + 1):
        s = i / n
        pts.append((1 - s) ** 2 * p0 + 2 * (1 - s) * s * p1 + s * s * p2)
    radii = [pd['fil_r'] * size_scale * (1.0 - 0.45 * i / n) for i in range(n + 1)]
    filament = tube_geo(pts, radii, sides=5, color_a=pd['fil_col_a'], color_b=pd['fil_col_b'])
    verts = list(filament['verts'])
    quads = list(filament['quads'])
    cols = list(filament['cols'])
    # anther
    tangent = (p2 - p1).normalized()
    center = p2 + tangent * (pd['anther_len'] * size_scale * 0.28)
    ell = ellipsoid_geo(center, tangent, pd['anther_len'] * size_scale, pd['anther_w'] * size_scale,
                        pd['anther_col'], highlight=pd['anther_hi'], sides=7, rings=5)
    off = len(verts)
    verts.extend(ell['verts'])
    cols.extend(ell['cols'])
    quads.extend([tuple(i + off for i in qd) for qd in ell['quads']])
    check_tris = []
    for qd in quads:
        if len(qd) == 3:
            check_tris.append((qd[0], qd[1], qd[2]))
        else:
            check_tris.append((qd[0], qd[1], qd[2]))
            check_tris.append((qd[0], qd[2], qd[3]))
    return {'verts': verts, 'quads': quads, 'check_tris': check_tris, 'cols': cols}


def ribbon_geo(base, az, length, width, e0_deg, e1_deg, cup, profile, color,
               us=8, vs=4, insert=0.02, ruffle=0.0, vein=0.0):
    """Static leaf / bract surface."""
    radial = Vector((math.cos(az), math.sin(az), 0.0))
    tangent = Vector((-math.sin(az), math.cos(az), 0.0))
    up = Vector((0, 0, 1))
    base = Vector(base) - radial * insert
    e0 = math.radians(e0_deg)
    e1 = math.radians(e1_deg)
    N = 28
    pts = [base.copy()]
    for i in range(1, N + 1):
        sm = (i - 0.5) / N
        e = e0 + (e1 - e0) * sm
        pts.append(pts[-1] + (radial * math.cos(e) + up * math.sin(e)) * (length / N))
    normals = []
    for i in range(N + 1):
        e = e0 + (e1 - e0) * (i / N)
        normals.append((-radial * math.sin(e) + up * math.cos(e)).normalized())

    def sample(s):
        s = clamp(s)
        f = s * N
        i = min(int(f), N - 1)
        a = f - i
        return pts[i].lerp(pts[i + 1], a), normals[i].lerp(normals[i + 1], a).normalized()

    verts, cols = [], []
    c_base, c_tip = color
    for iu in range(us + 1):
        s = iu / us
        for iv in range(vs + 1):
            v = -1.0 + 2.0 * iv / vs
            P, Nn = sample(s)
            w = width * width_profile(profile, s)
            cup_off = cup * (v * v) * w * 0.5
            ruf = math.sin(v * math.pi * 3.0 + s * 4.0) * ruffle * (v * v) * w * 0.08
            pos = P + tangent * (v * w * 0.5) + Nn * (cup_off + ruf)
            verts.append(pos)
            col = mix(c_base, c_tip, smoothstep(s))
            if vein > 0:
                mid = 1.0 - abs(v) ** 0.55
                col = mix(col, mul(col, 0.68), vein * mid)
            cols.append(tuple(clamp(x) for x in col))
    quads = []
    for iu in range(us):
        for iv in range(vs):
            a = iu * (vs + 1) + iv
            b = (iu + 1) * (vs + 1) + iv
            c = (iu + 1) * (vs + 1) + iv + 1
            d = iu * (vs + 1) + iv + 1
            quads.append((a, b, c, d))
    return {'verts': verts, 'quads': quads, 'cols': cols}


def tube_geo(pts, radii, sides=8, color_a=(0.1, 0.2, 0.08), color_b=(0.2, 0.35, 0.12), cap=True):
    verts, cols, quads = [], [], []
    n = len(pts)
    prev_side = None
    for i, P in enumerate(pts):
        if i == 0:
            tangent = (pts[1] - pts[0]).normalized()
        elif i == n - 1:
            tangent = (pts[-1] - pts[-2]).normalized()
        else:
            tangent = (pts[i + 1] - pts[i - 1]).normalized()
        if prev_side is None:
            ref = Vector((0, 0, 1))
            if abs(tangent.dot(ref)) > 0.93:
                ref = Vector((0, 1, 0))
            side = tangent.cross(ref).normalized()
        else:
            side = (prev_side - tangent * prev_side.dot(tangent))
            if side.length < 1e-5:
                ref = Vector((0, 0, 1))
                if abs(tangent.dot(ref)) > 0.93:
                    ref = Vector((0, 1, 0))
                side = tangent.cross(ref)
            side.normalize()
        prev_side = side.copy()
        normal = side.cross(tangent).normalized()
        r = radii[i]
        for j in range(sides):
            a = 2 * math.pi * j / sides
            verts.append(P + (side * math.cos(a) + normal * math.sin(a)) * r)
            f = i / max(1, (n - 1))
            col = mix(color_a, color_b, smoothstep(f))
            # small irregular tint
            tt = 0.96 + 0.08 * hash01(i, j, 4)
            cols.append(tuple(clamp(c * tt) for c in col))
    for i in range(n - 1):
        for j in range(sides):
            a = i * sides + j
            b = i * sides + (j + 1) % sides
            c = (i + 1) * sides + (j + 1) % sides
            d = (i + 1) * sides + j
            quads.append((a, b, c, d))
    if cap:
        # simple fans, hidden inside sockets/pods in practice
        center_bottom = len(verts)
        verts.append(pts[0])
        cols.append(color_a)
        for j in range(sides):
            quads.append((center_bottom, (j + 1) % sides, j))
        center_top = len(verts)
        verts.append(pts[-1])
        cols.append(color_b)
        base = (n - 1) * sides
        for j in range(sides):
            quads.append((center_top, base + j, base + (j + 1) % sides))
    return {'verts': verts, 'quads': quads, 'cols': cols}


def ellipsoid_geo(center, axis, length, width, color, highlight=None, sides=8, rings=6):
    center = Vector(center)
    axis = Vector(axis).normalized()
    a, b, _ = basis_from_axis(axis)
    verts, cols, quads = [], [], []
    for i in range(rings + 1):
        v = math.pi * i / rings
        z = math.cos(v) * length * 0.5
        rr = math.sin(v) * width * 0.5
        for j in range(sides):
            u = 2 * math.pi * j / sides
            verts.append(center + axis * z + a * (math.cos(u) * rr) + b * (math.sin(u) * rr))
            col = color
            if highlight and math.sin(v) > 0.55:
                col = mix(color, highlight, 0.55 * math.sin(v))
            cols.append(tuple(clamp(x) for x in col))
    for i in range(rings):
        for j in range(sides):
            A = i * sides + j
            B = i * sides + (j + 1) % sides
            C = (i + 1) * sides + (j + 1) % sides
            D = (i + 1) * sides + j
            quads.append((A, B, C, D))
    return {'verts': verts, 'quads': quads, 'cols': cols}


def lathe_geo(profile, segments, color_fn):
    """profile: [(r,z)] with r=0 at ends. color_fn(r_frac, z_frac) -> rgb."""
    verts, cols, quads = [], [], []
    rings = []
    first_pole = None
    last_pole = None
    zs = [p[1] for p in profile]
    zmin, zmax = min(zs), max(zs)
    for idx, (r, z) in enumerate(profile):
        if r <= 1e-6:
            if idx == 0:
                first_pole = len(verts)
                verts.append(Vector((0, 0, z)))
                cols.append(color_fn(0.0, (z - zmin) / max(1e-6, zmax - zmin)))
            elif idx == len(profile) - 1:
                last_pole = len(verts)
                verts.append(Vector((0, 0, z)))
                cols.append(color_fn(0.0, (z - zmin) / max(1e-6, zmax - zmin)))
            continue
        ring = []
        for j in range(segments):
            a = 2 * math.pi * j / segments
            p = Vector((r * math.cos(a), r * math.sin(a), z))
            ring.append(len(verts))
            verts.append(p)
            cols.append(color_fn(min(1.0, r / max(1e-6, max(pp[0] for pp in profile))),
                                 (z - zmin) / max(1e-6, zmax - zmin)))
        rings.append((ring, r, z))
    for i in range(len(rings) - 1):
        r0, r1 = rings[i][0], rings[i + 1][0]
        for j in range(segments):
            A = r0[j]
            B = r0[(j + 1) % segments]
            C = r1[(j + 1) % segments]
            D = r1[j]
            quads.append((A, B, C, D))
    if first_pole is not None and rings:
        r0 = rings[0][0]
        for j in range(segments):
            quads.append((first_pole, r0[(j + 1) % segments], r0[j]))
    if last_pole is not None and rings:
        rN = rings[-1][0]
        for j in range(segments):
            quads.append((last_pole, rN[j], rN[(j + 1) % segments]))
    return {'verts': verts, 'quads': quads, 'cols': cols}


def cone_geo(base, direction, length, radius, color_a, color_b, sides=4):
    base = Vector(base)
    direction = Vector(direction).normalized()
    a, b, _ = basis_from_axis(direction)
    tip = base + direction * length
    verts, cols, quads = [], [], []
    for j in range(sides):
        ang = 2 * math.pi * j / sides
        verts.append(base + a * math.cos(ang) * radius + b * math.sin(ang) * radius)
        cols.append(color_a)
    ti = len(verts)
    verts.append(tip)
    cols.append(color_b)
    ci = len(verts)
    verts.append(base)
    cols.append(color_a)
    for j in range(sides):
        quads.append((j, (j + 1) % sides, ti))
        quads.append((ci, (j + 1) % sides, j))
    return {'verts': verts, 'quads': quads, 'cols': cols}


def add_geo(builder, geo, label=None, kind='static', checkable=False):
    off = len(builder['verts'])
    builder['verts'].extend(geo['verts'])
    builder['cols'].extend(geo['cols'])
    builder['faces'].extend([tuple(i + off for i in q) for q in geo['quads']])
    if label is not None:
        tris = []
        for q in geo['quads']:
            if len(q) == 3:
                tris.append((q[0] + off, q[1] + off, q[2] + off))
            else:
                tris.append((q[0] + off, q[1] + off, q[2] + off))
                tris.append((q[0] + off, q[2] + off, q[3] + off))
        builder.setdefault('parts', []).append({
            'label': label, 'kind': kind,
            'verts_off': off, 'verts_count': len(geo['verts']),
            'tris': tris, 'checkable': checkable,
            'world_verts': [v.copy() for v in geo['verts']],
        })


# ---------------------------------------------------------------------------
# flower recipes
# ---------------------------------------------------------------------------

def R(count, radius, z, length, width, closed, open_, cup, window, white_mix=0.0,
      profile='rose', notch=0.0, us=14, vs=10, ruffle=0.018, az_offset_deg=0.0,
      closed_len_scale=1.0):
    return {
        'count': count, 'r': radius, 'z': z, 'cl': length, 'ol': length * 1.045,
        'cw': width, 'ow': width * 1.08,
        'ce': closed, 'oe': open_, 'cc': cup[0], 'oc': cup[1],
        'window': window, 'white_mix': white_mix, 'profile': profile, 'notch': notch,
        'us': us, 'vs': vs, 'ruffle': ruffle,
        'az_offset': math.radians(az_offset_deg),
        'closed_len_scale': closed_len_scale,
    }


STAMEN_CLOSED_LEN = {'lily': 0.06, 'tulip': 0.02, 'cherry': 0.03, 'lotus': 0.32}


def stamen_spec(count, r, z, length, spread_closed, spread_open, fil_r,
                anther_len, anther_w, window, fil_col, anther_col,
                fil_col_b=None, anther_hi='#ffd9a0', closed_len=0.3):
    return {
        'count': count, 'r': r, 'z': z, 'length': length,
        'spread_closed': spread_closed, 'spread_open': spread_open,
        'fil_r': fil_r, 'anther_len': anther_len, 'anther_w': anther_w,
        'window': window, 'fil_col_a': hex_lin(fil_col),
        'fil_col_b': hex_lin(fil_col_b or fil_col), 'anther_col': hex_lin(anther_col),
        'anther_hi': hex_lin(anther_hi), 'closed_len': closed_len,
    }


FLOWERS = [
    {
        'id': 'rose',
        'name': '焰影玫瑰',
        'latin': 'Rosa × damascena',
        'accent': '#ff6f8d',
        'head_z': 2.08,
        'preview_t': 0.78,
        'stops': make_stops([(0.0, '#2f0410'), (0.25, '#7c0b25'), (0.55, '#c31940'), (0.80, '#e84a67'), (1.0, '#f78fa3')]),
        'edge': hex_lin('#ffc4d0'),
        'vein': 0.05,
        'veins': 7,
        'speckle': 0.0,
        'speckle_color': hex_lin('#7f1028'),
        'tone': 1.0,
        'rings': [
            R(9, 0.320, 0.020, 0.68, 0.55, (68, 100), (-2, -55), (0.38, 0.55), (0.00, 0.42),
              profile='rose', az_offset_deg=0.0, ruffle=0.03, us=20, vs=16, closed_len_scale=1.0),
            R(9, 0.250, 0.075, 0.58, 0.46, (78, 104), (22, -24), (0.42, 0.60), (0.08, 0.55),
              profile='rose', az_offset_deg=20.0, ruffle=0.035, us=20, vs=16, closed_len_scale=0.88, notch=0.025),
            R(8, 0.158, 0.150, 0.40, 0.31, (86, 94), (48, 10), (0.46, 0.65), (0.20, 0.70),
              profile='rose', az_offset_deg=0.0, ruffle=0.03, us=18, vs=14, closed_len_scale=0.55, notch=0.025),
        ],
        'dome': [(0.0, 0.220), (0.06, 0.212), (0.12, 0.192), (0.18, 0.152),
                 (0.25, 0.082), (0.32, 0.015), (0.37, -0.035), (0.33, -0.090),
                 (0.20, -0.140), (0.07, -0.172), (0.0, -0.182)],
        'dome_stops': make_stops([(0.0, '#1b0409'), (0.5, '#3a0710'), (0.82, '#352117'), (1.0, '#4a4a26')]),
        'bracts': {'count': 6, 'length': 0.44, 'width': 0.18, 'e0': 15, 'e1': -50,
                    'r': 0.350, 'z': 0.0, 'color': ('#1d2c12', '#4c6030')},
        'stamens': stamen_spec(30, 0.070, 0.218, 0.27, 0.010, 0.140, 0.0024,
                               0.034, 0.0115, (0.30, 0.98), '#edca72', '#a55f1f', '#ffe5a3'),
        'pistil': {'length': 0.21, 'r': 0.0045, 'color': '#c9d59a', 'stigma': '#a2a953'},
        'stem': {'radius': 0.055, 'bend': (0.16, -0.05), 'color_a': '#2b3b1e', 'color_b': '#5a6b3a',
                  'leaves': [('t', 0.46, 210, 0.62, 1.1), ('t', 0.60, 40, 0.56, 1.0),
                             ('t', 0.74, 150, 0.46, 0.88)],
                  'leaf_col': ('#2b4020', '#5d7b3f'), 'thorns': 7},
    },
    {
        'id': 'lotus',
        'name': '月露莲华',
        'latin': 'Nelumbo nucifera',
        'accent': '#ff9fc1',
        'head_z': 2.12,
        'preview_t': 0.8,
        'stops': make_stops([(0.0, '#fdf5ea'), (0.42, '#f6c9d4'), (0.78, '#f195b2'), (1.0, '#ff6f9d')]),
        'edge': hex_lin('#fff0f4'),
        'vein': 0.04,
        'veins': 6,
        'speckle': 0.0,
        'speckle_color': hex_lin('#b34d68'),
        'tone': 1.0,
        'rings': [
            R(6, 0.370, 0.020, 0.72, 0.33, (42, 28), (8, -16), (0.28, 0.35), (0.0, 0.50),
              profile='lotus', az_offset_deg=0.0, ruffle=0.02, us=16, vs=12),
            R(6, 0.310, 0.070, 0.64, 0.31, (56, 44), (24, 2), (0.30, 0.40), (0.08, 0.60),
              white_mix=0.04, profile='lotus', az_offset_deg=30.0, ruffle=0.02, us=16, vs=12),
            R(6, 0.250, 0.120, 0.54, 0.28, (68, 58), (42, 24), (0.32, 0.45), (0.18, 0.72),
              white_mix=0.10, profile='lotus', az_offset_deg=0.0, ruffle=0.018, us=14, vs=10),
            R(6, 0.200, 0.170, 0.42, 0.22, (78, 70), (58, 44), (0.34, 0.50), (0.30, 0.85),
              white_mix=0.18, profile='lotus', az_offset_deg=30.0, ruffle=0.016, us=12, vs=8),
        ],
        'dome': [(0.0, 0.190), (0.20, 0.172), (0.25, 0.130), (0.31, 0.083),
                 (0.37, 0.033), (0.43, -0.020), (0.39, -0.080), (0.25, -0.140),
                 (0.08, -0.175), (0.0, -0.185)],
        'dome_stops': make_stops([(0.0, '#2f3d1d'), (0.5, '#4e5c2a'), (0.82, '#7b7138'), (1.0, '#a08a4c')]),
        'pod': {'r_base': 0.145, 'r_top': 0.175, 'z_base': 0.140, 'z_top': 0.340,
                'colors': ('#d9b24e', '#f1d67d'), 'seed_count': 9, 'seed_col': '#5a3b18'},
        'bracts': {'count': 4, 'length': 0.40, 'width': 0.22, 'e0': -10, 'e1': -42,
                    'r': 0.420, 'z': -0.02, 'color': ('#33471f', '#657437')},
        'stamens': None,
        'stem': {'radius': 0.055, 'bend': (0.10, 0.03), 'color_a': '#3b4a24', 'color_b': '#6a7745',
                  'leaves': [], 'leaf_col': ('#33411f', '#61723b'), 'thorns': 0},
    },
    {
        'id': 'lily',
        'name': '鎏金百合',
        'latin': 'Lilium candidum',
        'accent': '#f4c68a',
        'head_z': 2.12,
        'preview_t': 0.88,
        'stops': make_stops([(0.0, '#f6eccd'), (0.40, '#fff0d7'), (0.72, '#fbd3ce'), (1.0, '#e78b9d')]),
        'edge': hex_lin('#fff7e6'),
        'vein': 0.035,
        'veins': 5,
        'speckle': 0.055,
        'speckle_color': hex_lin('#a44558'),
        'tone': 1.0,
        'rings': [
            R(6, 0.110, 0.080, 0.70, 0.30, (87, 83), (48, -15), (0.46, 0.56), (0.0, 0.85),
              profile='lily', az_offset_deg=0.0, ruffle=0.03, us=16, vs=12),
        ],
        'dome': [(0.0, 0.145), (0.06, 0.140), (0.10, 0.120), (0.14, 0.085),
                 (0.18, 0.040), (0.205, -0.005), (0.17, -0.060), (0.09, -0.115),
                 (0.03, -0.145), (0.0, -0.155)],
        'dome_stops': make_stops([(0.0, '#35471f'), (0.55, '#617333'), (1.0, '#969255')]),
        'bracts': {'count': 3, 'length': 0.26, 'width': 0.14, 'e0': 8, 'e1': -25,
                    'r': 0.17, 'z': -0.01, 'color': ('#41532a', '#71823f')},
        'stamens': stamen_spec(6, 0.030, 0.090, 0.32, 0.016, 0.15, 0.0045,
                               0.046, 0.020, (0.52, 1.0), '#f0e7bd', '#b76627', '#f5d090'),
        'pistil': {'length': 0.36, 'r': 0.005, 'color': '#cfdca2', 'stigma': '#9fae58'},
        'stem': {'radius': 0.036, 'bend': (0.12, 0.02), 'color_a': '#3e5124', 'color_b': '#72813f',
                  'leaves': [('t', 0.52, 260, 0.46, 0.8), ('t', 0.64, 90, 0.40, 0.72),
                             ('t', 0.76, 170, 0.34, 0.6)],
                  'leaf_col': ('#34451f', '#6b7c3d'), 'thorns': 0},
    },
    {
        'id': 'tulip',
        'name': '琥珀郁金',
        'latin': 'Tulipa gesneriana',
        'accent': '#ff9a63',
        'head_z': 2.08,
        'preview_t': 0.8,
        'stops': make_stops([(0.0, '#f6c35b'), (0.40, '#ff8a4d'), (0.80, '#ef4b4b'), (1.0, '#c92648')]),
        'edge': hex_lin('#ffe6b4'),
        'vein': 0.03,
        'veins': 5,
        'speckle': 0.0,
        'speckle_color': hex_lin('#b6243e'),
        'tone': 1.0,
        'rings': [
            R(6, 0.110, 0.080, 0.60, 0.34, (87, 74), (64, 26), (0.55, 0.62), (0.0, 0.85),
              profile='tulip', az_offset_deg=0.0, ruffle=0.012, us=16, vs=12),
        ],
        'dome': [(0.0, 0.145), (0.06, 0.140), (0.10, 0.120), (0.14, 0.085),
                 (0.18, 0.030), (0.17, -0.040), (0.10, -0.100), (0.03, -0.140), (0.0, -0.150)],
        'dome_stops': make_stops([(0.0, '#2f411f'), (0.55, '#55672b'), (1.0, '#8a884b')]),
        'bracts': {'count': 3, 'length': 0.25, 'width': 0.13, 'e0': 2, 'e1': -28,
                    'r': 0.165, 'z': -0.01, 'color': ('#43522a', '#73833f')},
        'stamens': stamen_spec(6, 0.016, 0.085, 0.25, 0.010, 0.055, 0.004,
                               0.026, 0.013, (0.55, 1.0), '#e9e2b4', '#d8a12c', '#f4d783'),
        'pistil': {'length': 0.24, 'r': 0.005, 'color': '#c8d79a', 'stigma': '#8f9d4c'},
        'stem': {'radius': 0.046, 'bend': (0.18, 0.06), 'color_a': '#405226', 'color_b': '#758642',
                  'leaves': [('t', 0.18, 80, 0.62, 1.25), ('t', 0.28, 250, 0.56, 1.1),
                             ('t', 0.60, 30, 0.40, 0.8)],
                  'leaf_col': ('#31461f', '#647a39'), 'thorns': 0},
    },
    {
        'id': 'cherry',
        'name': '春雪樱',
        'latin': 'Prunus serrulata',
        'accent': '#ffb3c7',
        'head_z': 2.15,
        'preview_t': 0.95,
        'stops': make_stops([(0.0, '#f7a9c1'), (0.42, '#ffc3d5'), (0.78, '#ffe9ef'), (1.0, '#fff8fa')]),
        'edge': hex_lin('#fff4f7'),
        'vein': 0.03,
        'veins': 6,
        'speckle': 0.0,
        'speckle_color': hex_lin('#d76f8c'),
        'tone': 1.0,
        'rings': [
            R(5, 0.105, 0.085, 0.58, 0.46, (80, 68), (26, 14), (0.35, 0.16), (0.0, 0.75),
              profile='cherry', notch=0.16, ruffle=0.022, us=16, vs=12),
        ],
        'dome': [(0.0, 0.110), (0.05, 0.105), (0.10, 0.088), (0.14, 0.058),
                 (0.175, 0.018), (0.165, -0.035), (0.10, -0.092), (0.04, -0.125), (0.0, -0.135)],
        'dome_stops': make_stops([(0.0, '#493925'), (0.5, '#6b5a34'), (1.0, '#9c7d52')]),
        'bracts': {'count': 5, 'length': 0.23, 'width': 0.07, 'e0': -8, 'e1': -34,
                    'r': 0.145, 'z': -0.005, 'color': ('#56392b', '#7b5c3b')},
        'stamens': stamen_spec(16, 0.040, 0.065, 0.30, 0.012, 0.145, 0.0028,
                               0.020, 0.011, (0.4, 1.0), '#f6ecd6', '#dfb44e', '#f7dd8f'),
        'pistil': {'length': 0.27, 'r': 0.004, 'color': '#d9c9a2', 'stigma': '#b39c56'},
        'stem': {'radius': 0.055, 'bend': (0.24, -0.08), 'color_a': '#4a3827', 'color_b': '#7f6247',
                  'leaves': [('t', 0.46, 30, 0.48, 0.9), ('t', 0.58, 160, 0.44, 0.8),
                             ('t', 0.70, 280, 0.38, 0.7), ('t', 0.82, 90, 0.32, 0.6)],
                  'leaf_col': ('#3d4a24', '#758344'), 'thorns': 0, 'woody': True},
    },
    {
        'id': 'daisy',
        'name': '浮光雏菊',
        'latin': 'Bellis perennis',
        'accent': '#ffd76e',
        'head_z': 2.10,
        'preview_t': 1.0,
        'stops': make_stops([(0.0, '#fff4da'), (0.5, '#fffdf5'), (1.0, '#ffffff')]),
        'edge': hex_lin('#ffffff'),
        'vein': 0.02,
        'veins': 4,
        'speckle': 0.0,
        'speckle_color': hex_lin('#d9c38c'),
        'tone': 1.0,
        'rings': [
            R(16, 0.220, 0.070, 0.52, 0.14, (84, 80), (10, 4), (0.12, 0.08), (0.0, 0.65),
              profile='daisy', az_offset_deg=0.0, ruffle=0.012, us=12, vs=5),
            R(16, 0.180, 0.100, 0.44, 0.12, (82, 76), (18, 12), (0.10, 0.06), (0.12, 0.78),
              profile='daisy', az_offset_deg=11.25, ruffle=0.012, us=12, vs=5),
        ],
        'dome': [(0.0, 0.130), (0.07, 0.125), (0.14, 0.105), (0.21, 0.065),
                 (0.27, 0.015), (0.25, -0.045), (0.16, -0.100), (0.07, -0.140), (0.0, -0.155)],
        'dome_stops': make_stops([(0.0, '#35461f'), (0.5, '#596a2f'), (0.82, '#8e8748'), (1.0, '#b7a45e')]),
        'disc': {'r': 0.180, 'z_top': 0.170, 'height': 0.070,
                 'stops': make_stops([(0.0, '#d79a1e'), (0.55, '#efbb36'), (1.0, '#f8d86b')]),
                 'floret_count': 54, 'floret_col': '#c07917', 'floret_hi': '#f6d269'},
        'bracts': {'count': 10, 'length': 0.28, 'width': 0.07, 'e0': 2, 'e1': -26,
                    'r': 0.270, 'z': 0.015, 'color': ('#3a4c25', '#667738')},
        'stamens': None,
        'stem': {'radius': 0.036, 'bend': (0.14, 0.04), 'color_a': '#3b4d23', 'color_b': '#70803f',
                  'leaves': [('t', 0.30, 120, 0.42, 0.9), ('t', 0.46, 290, 0.38, 0.8),
                             ('t', 0.62, 60, 0.32, 0.7)],
                  'leaf_col': ('#33461f', '#61733a'), 'thorns': 0},
    },
]


# ---------------------------------------------------------------------------
# resolved petal/stamen specs + scene assembly
# ---------------------------------------------------------------------------

CLOSED_WIDTH_FACTOR = {
    'rose': 0.95, 'lotus': 0.95, 'lily': 0.95,
    'tulip': 0.62, 'cherry': 0.9, 'daisy': 0.98,
}
CLOSED_CUP_FACTOR = {
    'rose': 0.6, 'lotus': 0.9, 'lily': 0.9,
    'tulip': 0.25, 'cherry': 0.85, 'daisy': 0.95,
}
CLOSED_LEN_FACTOR = {
    'rose': 0.95, 'lotus': 0.95, 'lily': 0.96,
    'tulip': 0.95, 'cherry': 0.92, 'daisy': 0.97,
}


def resolve_petals(f):
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
                'cl': ring['cl'] * clf * ring.get('closed_len_scale', 1.0) * (1 + rng.uniform(-0.012, 0.012)),
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
                'roll': math.radians((0.0 if f['id'] == 'tulip' else rng.uniform(-6.0, 6.0))),
                'ruffle_freq': rng.uniform(2.2, 3.6),
                'seed': 31 + ri * 10 + i,
            }
            petals.append(pd)
    return petals


def resolve_stamens(f):
    s = f.get('stamens')
    if not s:
        return []
    out = []
    for i in range(s['count']):
        ang = 2 * math.pi * i / s['count'] + (i % 2) * 0.06
        jitter = (hash01(i, 17) - 0.5) * 0.01
        out.append({
            **s,
            'az': ang,
            'r': s['r'] + (hash01(i, 2) - 0.5) * 0.004,
            'z': f['head_z'] + s['z'] + (hash01(i, 3) - 0.5) * 0.004,
            'length': s['length'] * (0.96 + 0.08 * hash01(i, 5)),
            'closed_len': STAMEN_CLOSED_LEN.get(f['id'], s.get('closed_len', 0.3)),
            'start': clamp(s['window'][0] + jitter),
            'end': clamp(s['window'][1] + jitter),
        })
    return out


def build_morph_parts(f, petals, stamens, t):
    parts = []
    for i, pd in enumerate(petals):
        g = petal_geo(pd, t)
        parts.append({'label': 'petal_%02d' % i, 'kind': 'petal',
                      'verts': g['verts'], 'quads': g['quads'],
                      'check_tris': g['check_tris'], 'cols': g['cols'], 'uvs': g.get('uvs', [])})
    for i, sd in enumerate(stamens):
        g = stamen_geo(sd, t)
        parts.append({'label': 'stamen_%02d' % i, 'kind': 'stamen',
                      'verts': g['verts'], 'quads': g['quads'],
                      'check_tris': g['check_tris'], 'cols': g['cols'], 'uvs': g.get('uvs', [])})
    return parts


def build_core(f):
    b = {'verts': [], 'faces': [], 'cols': [], 'parts': []}
    hz = f['head_z']
    dome = [(r, hz + z) for (r, z) in f['dome']]
    zmin = min(p[1] for p in dome)
    zmax = max(p[1] for p in dome)
    deep = hex_lin('#1c2a13')
    g = lathe_geo(dome, 28, lambda rf, zf: mix(mul(gradient(f['dome_stops'], 0.15 + 0.85 * rf), 0.82), deep, 0.40))
    add_geo(b, g)
    # bracts around the receptacle
    br = f.get('bracts')
    if br:
        for i in range(br['count']):
            az = 2 * math.pi * i / br['count'] + 0.21 + math.radians((i % 2) * 9)
            base = Vector((br['r'] * math.cos(az), br['r'] * math.sin(az), hz + br['z']))
            col = (hex_lin(br['color'][0]), hex_lin(br['color'][1]))
            gg = ribbon_geo(base, az, br['length'] * 1.22, br['width'] * 1.15, br['e0'], br['e1'],
                            0.32, 'bract', col, us=7, vs=4, insert=0.035, vein=0.22)
            add_geo(b, gg)
    # lotus pod + seeds
    if 'pod' in f:
        pod = f['pod']
        prof = [(0.0, hz + pod['z_base']),
                (pod['r_base'] * 0.55, hz + pod['z_base'] + 0.005),
                (pod['r_base'], hz + pod['z_base'] + 0.03),
                (pod['r_top'], hz + pod['z_top'] - 0.02),
                (pod['r_top'], hz + pod['z_top']),
                (pod['r_top'] * 0.55, hz + pod['z_top'] + 0.012),
                (0.0, hz + pod['z_top'] + 0.016)]
        stops = make_stops([(0, pod['colors'][0]), (1, pod['colors'][1])])
        gp = lathe_geo(prof, 26, lambda rf, zf: gradient(stops, 0.2 + 0.8 * zf))
        add_geo(b, gp)
        n = pod['seed_count']
        for i in range(n):
            ang = i * 2.399963 + 0.4
            rr = 0.035 + 0.075 * math.sqrt((i + 0.5) / n)
            pos = Vector((rr * math.cos(ang), rr * math.sin(ang), hz + pod['z_top'] + 0.017))
            gg = ellipsoid_geo(pos, Vector((0, 0, 1)), 0.016, 0.023,
                               hex_lin(pod['seed_col']), highlight=hex_lin('#8b6230'), sides=7, rings=4)
            add_geo(b, gg)
    # daisy disc and florets
    if 'disc' in f:
        d = f['disc']
        prof = [(0.0, hz + d['z_top'] - d['height']),
                (d['r'] * 0.52, hz + d['z_top'] - d['height'] * 0.6),
                (d['r'] * 0.85, hz + d['z_top'] - d['height'] * 0.2),
                (d['r'], hz + d['z_top'] - 0.01),
                (d['r'] * 0.72, hz + d['z_top'] + 0.025),
                (d['r'] * 0.38, hz + d['z_top'] + 0.038),
                (0.0, hz + d['z_top'] + 0.042)]
        gd = lathe_geo(prof, 30, lambda rf, zf: gradient(d['stops'], 0.25 + 0.75 * zf))
        add_geo(b, gd)
        n = d['floret_count']
        for i in range(n):
            rr = d['r'] * 0.82 * math.sqrt((i + 0.5) / n)
            ang = i * 2.399963 + 0.8
            dome_h = hz + d['z_top'] + 0.012 - (rr / max(1e-5, d['r'])) ** 2 * 0.018
            pos = Vector((rr * math.cos(ang), rr * math.sin(ang), dome_h))
            gg = ellipsoid_geo(pos, Vector((0, 0, 1)), 0.02, 0.017,
                               hex_lin(d['floret_col']), highlight=hex_lin(d['floret_hi']), sides=6, rings=4)
            add_geo(b, gg)
    # pistil
    pis = f.get('pistil')
    if pis:
        pts = []
        n = 9
        for i in range(n + 1):
            s = i / n
            pts.append(Vector((0.0, 0.0, hz + 0.12 + pis['length'] * s)))
        gg = tube_geo(pts, [pis['r']] * len(pts), sides=5,
                      color_a=hex_lin(pis['color']), color_b=hex_lin(pis['color']))
        add_geo(b, gg)
        for i in range(3):
            ang = 2 * math.pi * i / 3
            pos = Vector((0.012 * math.cos(ang), 0.012 * math.sin(ang),
                          hz + 0.12 + pis['length'] + 0.006))
            gg = ellipsoid_geo(pos, Vector((0.4 * math.cos(ang), 0.4 * math.sin(ang), 1.0)),
                               0.03, 0.018, hex_lin(pis['stigma']), highlight=hex_lin('#e4e0a5'),
                               sides=6, rings=4)
            add_geo(b, gg)
    return b


def stem_point(f, t):
    bend = f['stem']['bend']
    x = bend[0] * math.sin(math.pi * t) * (0.35 + 0.65 * t)
    y = bend[1] * math.sin(math.pi * t) * (0.35 + 0.65 * t)
    z = 0.01 + (f['head_z'] - 0.03) * t
    return Vector((x, y, z))


def build_stem(f):
    b = {'verts': [], 'faces': [], 'cols': [], 'parts': []}
    n = 30
    pts = [stem_point(f, i / n) for i in range(n + 1)]
    radii = []
    for i in range(n + 1):
        s = i / n
        radii.append(f['stem']['radius'] * 1.1 * (1.0 - 0.35 * s) + 0.018 * max(0, (0.05 - s)) / 0.05)
    g = tube_geo(pts, radii, sides=8,
                 color_a=hex_lin(f['stem']['color_a']), color_b=hex_lin(f['stem']['color_b']),
                 cap=True)
    add_geo(b, g)
    # leaves
    for (mode, tv, az_deg, length, scale) in f['stem'].get('leaves', []):
        t = tv if mode == 't' else tv / 100.0
        base = stem_point(f, clamp(t))
        az = math.radians(az_deg)
        outward = Vector((math.cos(az), math.sin(az), 0))
        base = base + outward * (f['stem']['radius'] * 0.55)
        col = (hex_lin(f['stem']['leaf_col'][0]), hex_lin(f['stem']['leaf_col'][1]))
        gg = ribbon_geo(base, az, length * scale, length * 0.52 * scale,
                        -18, -55, 0.28, 'leaf', col, us=9, vs=4, insert=0.03, vein=0.22)
        add_geo(b, gg)
    # thorns
    for i in range(f['stem'].get('thorns', 0)):
        t = 0.06 + 0.52 * (i / max(1, f['stem']['thorns'] - 1))
        P = stem_point(f, t)
        az = 2 * math.pi * i * 0.618 + 0.7
        outward = Vector((math.cos(az), math.sin(az), 0))
        direction = (outward * 0.8 + Vector((0, 0, 0.6))).normalized()
        gg = cone_geo(P + outward * 0.02, direction, 0.065, 0.018,
                      hex_lin(f['stem']['color_a']), hex_lin('#8c6a4a'), sides=4)
        add_geo(b, gg)
    return b


# ---------------------------------------------------------------------------
# Blender objects / materials
# ---------------------------------------------------------------------------

def make_material(name, roughness=0.48, sheen=0.0, metallic=0.0, emissive=None, emissive_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = False
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    try:
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Col'
    except Exception:
        vc = nt.nodes.new('ShaderNodeAttribute')
        vc.attribute_name = 'Col'
    color_out = vc.outputs.get('Color') or vc.outputs[0]
    nt.links.new(color_out, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    try:
        bsdf.inputs['Sheen Weight'].default_value = sheen
        bsdf.inputs['Sheen Roughness'].default_value = 0.55
    except Exception:
        pass
    try:
        bsdf.inputs['Specular IOR Level'].default_value = 0.45
    except Exception:
        pass
    if 'petals' in name:
        try:
            bsdf.inputs['Subsurface Weight'].default_value = 0.05
            bsdf.inputs['Subsurface Radius'].default_value = (0.25, 0.09, 0.06)
        except Exception:
            pass
        try:
            bsdf.inputs['Coat Weight'].default_value = 0.10
            bsdf.inputs['Coat Roughness'].default_value = 0.35
        except Exception:
            pass
    if emissive:
        try:
            bsdf.inputs['Emission Color'].default_value = (*hex_lin(emissive), 1.0)
            bsdf.inputs['Emission Strength'].default_value = emissive_strength
        except Exception:
            pass
    mat.diffuse_color = (0.5, 0.4, 0.42, 1)
    return mat


def assign_color_attribute(mesh, cols):
    attr = mesh.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
    for i, c in enumerate(cols):
        attr.data[i].color = (c[0], c[1], c[2], 1.0)
    try:
        mesh.color_attributes.active_color = attr
        mesh.color_attributes.render_color_index = 0
    except Exception:
        pass
    return attr


def new_mesh_object(name, verts, faces, cols, material, collection, parent):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    mesh.update(calc_edges=True)
    for poly in mesh.polygons:
        poly.use_smooth = True
    assign_color_attribute(mesh, cols)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.data.materials.append(material)
    obj.parent = parent
    return obj


def build_flower_objects(f, petals, stamens, key_parts, collection):
    hz = f['head_z']
    root = bpy.data.objects.new('FLOWER_' + f['id'], None)
    collection.objects.link(root)
    root.empty_display_type = 'ARROWS'
    root.empty_display_size = 0.3
    root['flower_id'] = f['id']
    root['name_zh'] = f['name']
    root['latin'] = f['latin']
    root['petals'] = len(petals)
    root['stamens'] = len(stamens)
    root['bloomKeys'] = 6
    root['accent'] = f['accent']

    mat_petal = make_material('M_' + f['id'] + '_petals', roughness=0.46, sheen=0.55)
    mat_core = make_material('M_' + f['id'] + '_core', roughness=0.58, sheen=0.2)
    mat_stem = make_material('M_' + f['id'] + '_stem', roughness=0.7, sheen=0.1)

    parts0 = key_parts[0]
    verts, faces, cols, uvs = [], [], [], []
    for p in parts0:
        off = len(verts)
        verts.extend(p['verts'])
        cols.extend(p['cols'])
        uvs.extend(p.get('uvs') or [(0.5, 0.5)] * len(p['verts']))
        faces.extend([tuple(i + off for i in q) for q in p['quads']])
    petal_obj = new_mesh_object('petals', verts, faces, cols, mat_petal, collection, root)
    uv_layer = petal_obj.data.uv_layers.new(name='UVMap')
    for poly in petal_obj.data.polygons:
        for li in poly.loop_indices:
            vi = petal_obj.data.loops[li].vertex_index
            uv_layer.data[li].uv = uvs[vi]

    # shape keys
    petal_obj.shape_key_add(name='Basis', from_mix=False)
    for ki in range(1, 7):
        kb = petal_obj.shape_key_add(name=KEY_NAMES[ki - 1], from_mix=False)
        kverts = []
        for p in key_parts[ki]:
            kverts.extend(p['verts'])
        if len(kverts) != len(verts):
            raise RuntimeError('Shape key topology mismatch on ' + f['id'])
        for i, v in enumerate(kverts):
            kb.data[i].co = v
    for kb in petal_obj.data.shape_keys.key_blocks:
        kb.value = 0.0

    core = build_core(f)
    core_obj = new_mesh_object('core', core['verts'], core['faces'], core['cols'],
                               mat_core, collection, root)
    stem = build_stem(f)
    stem_obj = new_mesh_object('stem', stem['verts'], stem['faces'], stem['cols'],
                               mat_stem, collection, root)
    return root, petal_obj, core_obj, stem_obj


# ---------------------------------------------------------------------------
# intersection validation
# ---------------------------------------------------------------------------

def bbox_overlap(a, b):
    amin = Vector((min(v.x for v in a), min(v.y for v in a), min(v.z for v in a)))
    amax = Vector((max(v.x for v in a), max(v.y for v in a), max(v.z for v in a)))
    bmin = Vector((min(v.x for v in b), min(v.y for v in b), min(v.z for v in b)))
    bmax = Vector((max(v.x for v in b), max(v.y for v in b), max(v.z for v in b)))
    return not (amax.x < bmin.x or bmax.x < amin.x or
                amax.y < bmin.y or bmax.y < amin.y or
                amax.z < bmin.z or bmax.z < amin.z)


def interpolate_parts(pa, pb, f):
    out = []
    for A, B in zip(pa, pb):
        vs = [A['verts'][i].lerp(B['verts'][i], f) for i in range(len(A['verts']))]
        out.append({'label': A['label'], 'kind': A['kind'], 'verts': vs,
                    'check_tris': A['check_tris']})
    return out


def check_morph(f, key_parts):
    """Check petals/stamens at all morph keys and interpolated in-betweens."""
    report = {'flower': f['id'], 'samples': 0, 'conflicts': [], 'pairs_checked': 0,
              'by_t': {}, 'conflict_pairs': 0}
    samples = []
    for ki in range(6):
        for fpos in (0.34, 0.67, 1.0):
            samples.append((KEY_T[ki] + (KEY_T[ki + 1] - KEY_T[ki]) * fpos,
                            interpolate_parts(key_parts[ki], key_parts[ki + 1], fpos)))
    samples.append((1.0, key_parts[-1]))
    for t, parts in samples:
        report['samples'] += 1
        trees = []
        for p in parts:
            if p['kind'] not in ('petal', 'stamen'):
                continue
            tris = p['check_tris']
            if not tris:
                continue
            tree = BVHTree.FromPolygons(p['verts'], tris, all_triangles=True)
            trees.append((p, tree))
        for i in range(len(trees)):
            for j in range(i + 1, len(trees)):
                A, TA = trees[i]
                B, TB = trees[j]
                if not bbox_overlap(A['verts'], B['verts']):
                    continue
                report['pairs_checked'] += 1
                ov = TA.overlap(TB)
                if ov:
                    idxs = set()
                    for ia, ib in ov[:8]:
                        idxs.update(A['check_tris'][ia])
                        idxs.update(B['check_tris'][ib])
                    zvals = [A['verts'][i].z for i in idxs if i < len(A['verts'])]
                    zvals += [B['verts'][i].z for i in idxs if i < len(B['verts'])]
                    report['conflicts'].append({
                        't': round(t, 4), 'a': A['label'], 'b': B['label'],
                        'n': len(ov),
                        'zmin': round(min(zvals), 3) if zvals else None,
                        'zmax': round(max(zvals), 3) if zvals else None,
                    })
                    report['conflict_pairs'] += 1
                    report['by_t'][round(t, 3)] = report['by_t'].get(round(t, 3), 0) + 1
    return report


# ---------------------------------------------------------------------------
# studio / renders / export
# ---------------------------------------------------------------------------

PREVIEW_DIST = {'rose': 5.5, 'lotus': 5.9, 'lily': 5.4, 'tulip': 4.0, 'cherry': 3.6, 'daisy': 4.8}
FRAME_DIR = Vector((0.38, -1.0, 0.16)).normalized()


def frame_camera(f):
    cam = bpy.data.objects.get('CAM_Studio')
    if not cam:
        return
    target = Vector((0.0, 0.0, f['head_z'] + 0.10))
    dist = PREVIEW_DIST.get(f['id'], 5.5)
    cam.location = target + FRAME_DIR * dist
    cam.data.lens = 70
    look_at(cam, target)
    back = bpy.data.objects.get('BACKDROP')
    if back:
        back.location = target - FRAME_DIR * 12.0
        d = cam.location - back.location
        back.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    acc = bpy.data.objects.get('ACCENT')
    if acc:
        acc.location = target + Vector((0.0, 0.25, 0.22))
        acc.data.color = hex_lin(f['accent'])
        acc.data.energy = 26


def setup_studio():
    scn = bpy.context.scene
    scn.render.engine = 'BLENDER_EEVEE'
    scn.render.resolution_x = 720
    scn.render.resolution_y = 900
    scn.render.resolution_percentage = 100
    scn.render.image_settings.file_format = 'PNG'
    scn.render.image_settings.color_mode = 'RGBA'
    scn.render.image_settings.color_depth = '8'
    scn.render.image_settings.compression = 65
    scn.render.film_transparent = True
    try:
        scn.eevee.taa_render_samples = 72
    except Exception:
        pass
    try:
        scn.eevee.use_gtao = True
    except Exception:
        pass
    try:
        scn.view_settings.view_transform = 'AgX'
        scn.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        pass
    try:
        scn.view_settings.exposure = 0.5
    except Exception:
        pass
    world = bpy.data.worlds.new('BLOOM_WORLD')
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (0.004, 0.006, 0.011, 1.0)
    bg.inputs['Strength'].default_value = 0.35
    scn.world = world

    # camera
    cam_data = bpy.data.cameras.new('CAM_Studio')
    cam = bpy.data.objects.new('CAM_Studio', cam_data)
    scn.collection.objects.link(cam)
    cam.data.lens = 70
    try:
        cam.data.dof.use_dof = True
        cam.data.dof.aperture_fstop = 3.5
    except Exception:
        pass
    scn.camera = cam

    # backdrop with a soft radial vignette, far behind the flower
    bm = bpy.data.meshes.new('BACKDROP')
    bm.from_pydata([(-20, -20, 0), (20, -20, 0), (20, 20, 0), (-20, 20, 0)], [], [(0, 1, 2, 3)])
    bm.update()
    back = bpy.data.objects.new('BACKDROP', bm)
    scn.collection.objects.link(back)
    mat = bpy.data.materials.new('M_BACKDROP')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tex = nt.nodes.new('ShaderNodeTexCoord')
    sub = nt.nodes.new('ShaderNodeVectorMath')
    sub.operation = 'SUBTRACT'
    sub.inputs[1].default_value = (0.5, 0.5, 0.5)
    length = nt.nodes.new('ShaderNodeVectorMath')
    length.operation = 'LENGTH'
    mapr = nt.nodes.new('ShaderNodeMapRange')
    mapr.inputs['From Min'].default_value = 0.0
    mapr.inputs['From Max'].default_value = 0.74
    mapr.inputs['To Min'].default_value = 0.0
    mapr.inputs['To Max'].default_value = 1.0
    mapr.clamp = True
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    e0 = ramp.color_ramp.elements[0]
    e0.position = 0.0
    e0.color = (0.022, 0.030, 0.036, 1.0)
    e1 = ramp.color_ramp.elements[1]
    e1.position = 0.55
    e1.color = (0.0035, 0.0050, 0.0065, 1.0)
    e2 = ramp.color_ramp.elements.new(1.0)
    e2.color = (0.0007, 0.0010, 0.0014, 1.0)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = 1.0
    nt.links.new(tex.outputs['Generated'], sub.inputs[0])
    nt.links.new(sub.outputs['Vector'], length.inputs[0])
    nt.links.new(length.outputs['Value'], mapr.inputs['Value'])
    nt.links.new(mapr.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    back.data.materials.append(mat)
    try:
        back.visible_shadow = False
    except Exception:
        pass

    # lights
    def area(name, loc, energy, color, size, target=(0, 0, 2.1)):
        data = bpy.data.lights.new(name, 'AREA')
        data.energy = energy
        data.shape = 'DISK'
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        scn.collection.objects.link(obj)
        obj.location = loc
        look_at(obj, target)
        return obj
    area('KEY', (3.4, -4.0, 4.9), 1150, (1.0, 0.86, 0.72), 3.6)
    area('FILL', (-4.5, -2.2, 2.8), 360, (0.60, 0.78, 1.0), 4.5)
    area('RIM', (-1.6, 4.0, 4.3), 1650, (0.80, 0.88, 1.0), 2.6)
    data = bpy.data.lights.new('ACCENT', 'POINT')
    data.energy = 26
    data.color = (1.0, 0.55, 0.55)
    data.shadow_soft_size = 0.5
    acc = bpy.data.objects.new('ACCENT', data)
    scn.collection.objects.link(acc)
    acc.location = (0, 0.3, 2.4)

    frame_camera(FLOWERS[0])
    return cam


def set_bloom(obj, t):
    if not obj.data.shape_keys:
        return
    keys = [obj.data.shape_keys.key_blocks.get(n) for n in KEY_NAMES]
    for kb in keys:
        if kb:
            kb.value = 0.0
    x = t * 6.0
    if x <= 0.0:
        return
    if x < 1.0:
        keys[0].value = x
        return
    if x >= 6.0:
        keys[5].value = 1.0
        return
    i = int(x) - 1
    frac = x - int(x)
    keys[i].value = 1.0 - frac
    keys[i + 1].value = frac


def export_flower(f, root, collection):
    bpy.ops.object.select_all(action='DESELECT')
    def sel(o):
        o.select_set(True)
        for ch in o.children:
            sel(ch)
    sel(root)
    bpy.context.view_layer.objects.active = root
    path = os.path.join(MODELS_DIR, f['id'] + '.glb')
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_morph=True,
        export_morph_normal=True,
        export_morph_tangent=False,
        export_animations=False,
        export_texcoords=True,
        export_normals=True,
        export_attributes=True,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
    )
    return path


def render_flower(f, objects, target_t, out_path, transparent=True, samples=32, small=False):
    scn = bpy.context.scene
    scn.render.resolution_x = 720
    scn.render.resolution_y = 900
    if small:
        scn.render.resolution_x = 520
        scn.render.resolution_y = 650
    back = bpy.data.objects.get('BACKDROP')
    if back:
        back.hide_render = bool(transparent)
    frame_camera(f)
    cam = bpy.data.objects.get('CAM_Studio')
    if cam:
        try:
            cam.data.dof.use_dof = not small
            target = Vector((0.0, 0.0, f['head_z'] + 0.10))
            cam.data.dof.focus_distance = (cam.location - target).length
            cam.data.dof.aperture_fstop = 3.5
        except Exception:
            pass
    scn.render.film_transparent = transparent
    scn.render.image_settings.color_mode = 'RGBA' if transparent else 'RGB'
    try:
        scn.eevee.taa_render_samples = samples
    except Exception:
        pass
    scn.render.filepath = out_path
    for obj in objects:
        if obj.type == 'MESH':
            set_bloom(obj, target_t)
    bpy.ops.render.render(write_still=True)
    scn.render.film_transparent = True
    scn.render.image_settings.color_mode = 'RGBA'


def main():
    argv = sys.argv
    if '--' in argv:
        argv = argv[argv.index('--') + 1:]
    else:
        argv = []
    only = None
    do_render = True
    for a in argv:
        if a.startswith('--only='):
            only = set(a.split('=', 1)[1].split(','))
        if a == '--no-render':
            do_render = False

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.unit_settings.system = 'METRIC'
    root_collection = scn.collection
    all_flowers = []
    reports = []
    summary = []

    for f in FLOWERS:
        if only and f['id'] not in only:
            continue
        print('\n=== BUILDING %s ===' % f['id'])
        col = bpy.data.collections.new('FLOWER_' + f['id'])
        root_collection.children.link(col)
        petals = resolve_petals(f)
        stamens = resolve_stamens(f)
        key_parts = [build_morph_parts(f, petals, stamens, t) for t in KEY_T]
        # sanity: all keys have identical part structure
        for ki, parts in enumerate(key_parts):
            assert len(parts) == len(key_parts[0]), 'part count mismatch'
            for pa, pb in zip(parts, key_parts[0]):
                assert len(pa['verts']) == len(pb['verts']), 'vertex count mismatch'
        print('  petals:', len(petals), 'stamens:', len(stamens))
        report = check_morph(f, key_parts)
        reports.append(report)
        print('  intersection samples:', report['samples'],
              'pairs:', report['pairs_checked'],
              'conflicts:', report['conflict_pairs'])
        if report['conflicts']:
            print('    by_t:', report['by_t'])
            for c in report['conflicts'][:8]:
                print('    CONFLICT', c)
        root, petal_obj, core_obj, stem_obj = build_flower_objects(f, petals, stamens, key_parts, col)
        path = export_flower(f, root, col)
        size = os.path.getsize(path)
        print('  exported:', path, '%.2f MB' % (size / 1024 / 1024))
        vcount = len(petal_obj.data.vertices) + len(core_obj.data.vertices) + len(stem_obj.data.vertices)
        summary.append({'id': f['id'], 'name': f['name'], 'latin': f['latin'],
                        'petals': len(petals), 'stamens': len(stamens),
                        'verts': vcount, 'glb_mb': round(size / 1024 / 1024, 3),
                        'intersections': len(report['conflicts'])})
        all_flowers.append({'spec': f, 'collection': col, 'objects': [petal_obj, core_obj, stem_obj],
                            'root': root, 'report': report})

    # studio + previews
    cam = setup_studio()
    master_blend = os.path.join(HERE, 'flowers_master.blend')
    if do_render:
        for fl in all_flowers:
            for other in all_flowers:
                other['collection'].hide_render = (other is not fl)
                other['root'].hide_set(other is not fl)
            preview_path = os.path.join(PREVIEW_DIR, fl['spec']['id'] + '.png')
            print('Rendering preview', fl['spec']['id'])
            render_flower(fl['spec'], fl['objects'], fl['spec']['preview_t'], preview_path,
                          transparent=True, samples=72, small=False)
            for state, t in (('closed', 0.0), ('half', 0.5), ('open', 1.0)):
                vpath = os.path.join(VERIFY_DIR, '%s_%s.png' % (fl['spec']['id'], state))
                prev_transparent = bpy.context.scene.render.film_transparent
                # opaque neutral background for geometry inspection
                render_flower(fl['spec'], fl['objects'], t, vpath,
                              transparent=False, samples=24, small=True)
            for other in all_flowers:
                other['collection'].hide_render = False
                other['root'].hide_set(False)
                for obj in other['objects']:
                    if obj.type == 'MESH':
                        set_bloom(obj, 0.0)

    # arrange for the master file and save
    for other in all_flowers:
        other['collection'].hide_render = False
        other['root'].hide_set(False)
    for idx, fl in enumerate(all_flowers):
        fl['root'].location.x = (idx - (len(all_flowers) - 1) / 2.0) * 2.6
    cam.location = (0, -19.0, 6.5)
    cam.data.lens = 70
    look_at(cam, (0, 0, 1.1))
    bpy.ops.wm.save_as_mainfile(filepath=master_blend)
    print('Saved master:', master_blend)

    # write report
    rep = {'flowers': summary, 'reports': reports}
    with open(os.path.join(HERE, 'verification_report.json'), 'w', encoding='utf-8') as fp:
        json.dump(rep, fp, indent=2, ensure_ascii=False)
    with open(os.path.join(HERE, 'verification_summary.txt'), 'w', encoding='utf-8') as fp:
        fp.write('BloomSense flower validation\n')
        for s in summary:
            fp.write('%-8s petals=%-3d stamens=%-3d verts=%-6d glb=%.2fMB intersections=%d\n' %
                     (s['id'], s['petals'], s['stamens'], s['verts'], s['glb_mb'], s['intersections']))
    print('\nDONE')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
