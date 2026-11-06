#!/usr/bin/env python3
"""render_blocks.py - render vanilla block/item models to isometric PNG icons.

blockrender.dev (the main icon source) is pinned to Minecraft 26.2, so ids added
in 26.3 have no icon.  This renderer walks the real 26.3 asset pack
(blockstates / models / textures from the vanilla jar) and rasterises the same
isometric view the game uses in the inventory.

Supported model features: parent chains, textures, elements with from/to,
per-face uv + uv rotation, element rotation, item model types
model / composite / select (special entity models are skipped).

Usage:
  python scripts/render_blocks.py --check          # validate against blockrender
  python scripts/render_blocks.py --ids FILE       # render ids listed in FILE
  python scripts/render_blocks.py stone grass_block  # render explicit ids
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png_util as P

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(os.environ["TEMP"], "mcassets263", "assets", "minecraft")
ICONS = os.path.join(ROOT, "public", "icons")

SIZE = 192
YAW = 135.0
PITCH = 30.0
MARGIN = 10

SHADE = {  # vanilla-ish face shading
    "up": 1.0, "down": 0.5,
    "north": 0.8, "south": 0.8,
    "east": 0.6, "west": 0.6,
}

_json_cache = {}


def load_json(path):
    if path not in _json_cache:
        with open(path, encoding="utf-8") as f:
            _json_cache[path] = json.load(f)
    return _json_cache[path]


# ------------------------------------------------------------------ model data

def resolve_model(mid, depth=0):
    """Follow the parent chain and return {'elements': [...], 'textures': {...}}."""
    mid = mid.split(":")[-1]
    path = os.path.join(ASSETS, "models", *mid.split("/")) + ".json"
    if depth > 20 or not os.path.exists(path):
        return {"elements": [], "textures": {}}
    j = load_json(path)
    parent = j.get("parent")
    if parent and not parent.startswith("builtin/"):
        base = resolve_model(parent, depth + 1)
        elements = j.get("elements", base["elements"])
        textures = dict(base["textures"])
    else:
        elements = j.get("elements", [])
        textures = {}
    textures.update(j.get("textures", {}))
    return {"elements": elements, "textures": textures}


def tex_path(ref, textures):
    guard = 0
    while isinstance(ref, str) and ref.startswith("#"):
        ref = textures.get(ref[1:])
        guard += 1
        if guard > 12:
            return None
    if not ref:
        return None
    ref = ref.split(":")[-1]
    p = os.path.join(ASSETS, "textures", *ref.split("/")) + ".png"
    return p if os.path.exists(p) else None


_tex_cache = {}


def load_texture(path):
    if isinstance(path, tuple):
        return path
    if path not in _tex_cache:
        w, h, px = P.decode(path)
        _tex_cache[path] = (w, h, px)
    return _tex_cache[path]


# ------------------------------------------------------------------- geometry

def face_corners(name, f, t):
    x1, y1, z1 = f
    x2, y2, z2 = t
    if name == "up":
        return [(x1, y2, z1), (x2, y2, z1), (x2, y2, z2), (x1, y2, z2)]
    if name == "down":
        return [(x1, y1, z2), (x2, y1, z2), (x2, y1, z1), (x1, y1, z1)]
    if name == "north":
        return [(x2, y2, z1), (x1, y2, z1), (x1, y1, z1), (x2, y1, z1)]
    if name == "south":
        return [(x1, y2, z2), (x2, y2, z2), (x2, y1, z2), (x1, y1, z2)]
    if name == "west":
        return [(x1, y2, z1), (x1, y2, z2), (x1, y1, z2), (x1, y1, z1)]
    if name == "east":
        return [(x2, y2, z2), (x2, y2, z1), (x2, y1, z1), (x2, y1, z2)]
    return []


def face_size(name, f, t):
    x1, y1, z1 = f
    x2, y2, z2 = t
    if name in ("up", "down"):
        return abs(x2 - x1), abs(z2 - z1)
    if name in ("north", "south"):
        return abs(x2 - x1), abs(y2 - y1)
    return abs(z2 - z1), abs(y2 - y1)


def rotate_point(p, origin, axis, angle):
    if not angle:
        return p
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)
    x, y, z = p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]
    if axis == "x":
        y, z = y * ca - z * sa, y * sa + z * ca
    elif axis == "y":
        x, z = x * ca + z * sa, -x * sa + z * ca
    else:
        x, y = x * ca - y * sa, x * sa + y * ca
    return [x + origin[0], y + origin[1], z + origin[2]]


def rotate_uv(uv, rot):
    rot = int(rot or 0) % 360
    if rot == 0:
        return uv
    u1, v1, u2, v2 = uv
    cu, cv = (u1 + u2) / 2.0, (v1 + v2) / 2.0
    pts = [(u1, v1), (u2, v1), (u2, v2), (u1, v2)]
    a = math.radians(-rot)
    ca, sa = math.cos(a), math.sin(a)
    out = []
    for u, v in pts:
        du, dv = u - cu, v - cv
        out.append((cu + du * ca - dv * sa, cv + du * sa + dv * ca))
    return out


def build_quads(elements, textures):
    """-> list of dicts: pts (4 x 3d), uvs (4 x 2d), tex path, shade."""
    quads = []
    for el in elements:
        f = el.get("from", [0, 0, 0])
        t = el.get("to", [16, 16, 16])
        rot = el.get("rotation")
        for name, fd in el.get("faces", {}).items():
            tex = tex_path(fd.get("texture"), textures)
            if not tex:
                continue
            pts = face_corners(name, f, t)
            if not pts:
                continue
            uv = fd.get("uv")
            if uv:
                uv = list(uv)
                if fd.get("rotation"):
                    uvs = rotate_uv(uv, fd["rotation"])
                else:
                    uvs = [
                        (uv[0], uv[1]),
                        (uv[2], uv[1]),
                        (uv[2], uv[3]),
                        (uv[0], uv[3]),
                    ]
            else:
                w, h = face_size(name, f, t)
                uvs = [(0, 0), (w, 0), (w, h), (0, h)]
            if rot:
                pts = [rotate_point(p, rot["origin"], rot.get("axis", "y"), rot.get("angle", 0)) for p in pts]
            quads.append({"pts": pts, "uvs": uvs, "tex": tex, "shade": SHADE[name], "uv_scale": 16})
    return quads


def transform_quads(quads, matrix):
    if matrix is None:
        return quads
    out = []
    for q in quads:
        nq = dict(q)
        nq["pts"] = [matrix(p) for p in q["pts"]]
        out.append(nq)
    return out


# ---------------------------------------------------------------- projection

def project(pts):
    """Model space (0..16) -> camera space; screen y is flipped later."""
    cy = math.cos(math.radians(YAW))
    sy = math.sin(math.radians(YAW))
    cp = math.cos(math.radians(PITCH))
    sp = math.sin(math.radians(PITCH))
    out = []
    for x, y, z in pts:
        x -= 8.0
        y -= 8.0
        z -= 8.0
        # yaw around Y
        x1 = x * cy + z * sy
        z1 = -x * sy + z * cy
        # pitch around X (view from above)
        y2 = y * cp - z1 * sp
        z2 = y * sp + z1 * cp
        out.append((x1, y2, z2))
    return out


def rasterize(quads, size=SIZE, margin=MARGIN):
    W = H = size
    color = [0.0] * (W * H * 3)
    alpha = [0.0] * (W * H)
    zbuf = [-1e18] * (W * H)

    projected = []
    xs, ys = [], []
    for q in quads:
        cam = project(q["pts"])
        screen = [(p[0], -p[1], p[2]) for p in cam]
        projected.append((screen, q))
        for sx, sy, _ in screen:
            xs.append(sx)
            ys.append(sy)
    if not xs:
        return W, H, bytes(W * H * 4)

    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    avail = size - 2 * margin
    scale = avail / max(maxx - minx, maxy - miny, 1e-6)
    ox = (size - (maxx - minx) * scale) / 2.0 - minx * scale
    oy = (size - (maxy - miny) * scale) / 2.0 - miny * scale

    for screen, q in projected:
        tq = [(sx * scale + ox, sy * scale + oy, d) for sx, sy, d in screen]
        tw, th, tpx = load_texture(q["tex"])
        frame = tw if th > tw else th
        for tri in ((0, 1, 2), (0, 2, 3)):
            _tri(tq, q, tri, tw, frame, tpx, color, alpha, zbuf, W, H)

    out = bytearray(W * H * 4)
    for i in range(W * H):
        if alpha[i] > 0:
            out[i * 4] = max(0, min(255, int(color[i * 3])))
            out[i * 4 + 1] = max(0, min(255, int(color[i * 3 + 1])))
            out[i * 4 + 2] = max(0, min(255, int(color[i * 3 + 2])))
            out[i * 4 + 3] = 255
    return W, H, bytes(out)


def _tri(pts, q, idx, tw, th, tpx, color, alpha, zbuf, W, H):
    p0, p1, p2 = (pts[i] for i in idx)
    u0, u1, u2 = (q["uvs"][i] for i in idx)
    area = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1])
    if abs(area) < 1e-9:
        return
    minx = max(0, int(math.floor(min(p0[0], p1[0], p2[0]))))
    maxx = min(W - 1, int(math.ceil(max(p0[0], p1[0], p2[0]))))
    miny = max(0, int(math.floor(min(p0[1], p1[1], p2[1]))))
    maxy = min(H - 1, int(math.ceil(max(p0[1], p1[1], p2[1]))))
    shade = q["shade"]
    inv = 1.0 / area
    for py in range(miny, maxy + 1):
        yc = py + 0.5
        for px in range(minx, maxx + 1):
            xc = px + 0.5
            w0 = ((p1[0] - xc) * (p2[1] - yc) - (p2[0] - xc) * (p1[1] - yc)) * inv
            w1 = ((p2[0] - xc) * (p0[1] - yc) - (p0[0] - xc) * (p2[1] - yc)) * inv
            w2 = 1.0 - w0 - w1
            if w0 < -1e-6 or w1 < -1e-6 or w2 < -1e-6:
                continue
            depth = w0 * p0[2] + w1 * p1[2] + w2 * p2[2]
            i = py * W + px
            if depth <= zbuf[i]:
                continue
            scale = q.get("uv_scale", 16)
            frame = min(tw, th)
            u = (w0 * u0[0] + w1 * u1[0] + w2 * u2[0]) / scale * tw
            v = (w0 * u0[1] + w1 * u1[1] + w2 * u2[1]) / scale * frame
            tx = int(u) % tw
            ty = int(v) % frame
            o = (ty * tw + tx) * 4
            a = tpx[o + 3]
            if a < 128:
                continue
            zbuf[i] = depth
            color[i * 3] = tpx[o] * shade
            color[i * 3 + 1] = tpx[o + 1] * shade
            color[i * 3 + 2] = tpx[o + 2] * shade
            alpha[i] = 1.0


# ------------------------------------------------------------------ item/block

def identity(p):
    return p


def quat_matrix(q, scale=(1, 1, 1), translation=(0, 0, 0), pivot=(0, 0, 0)):
    x, y, z, w = q

    def apply(p):
        # rotate around the pivot, then scale, then translate
        px, py, pz = p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]
        # quaternion rotation
        qv = (x, y, z)
        t = 2.0 * (qv[1] * pz - qv[2] * py,
                   qv[2] * px - qv[0] * pz,
                   qv[0] * py - qv[1] * px)
        rx = px + w * t[0] + (qv[1] * t[2] - qv[2] * t[1])
        ry = py + w * t[1] + (qv[2] * t[0] - qv[0] * t[2])
        rz = pz + w * t[2] + (qv[0] * t[1] - qv[1] * t[0])
        return [rx * scale[0] + pivot[0] + translation[0],
                ry * scale[1] + pivot[1] + translation[1],
                rz * scale[2] + pivot[2] + translation[2]]

    return apply


def model_quads_from_model_ref(ref, depth=0):
    """Resolve one item-model node (type model/select/composite/special)."""
    if depth > 12 or not isinstance(ref, dict):
        return []
    kind = ref.get("type", "minecraft:model")
    if kind == "minecraft:model":
        model = resolve_model(ref.get("model", ""))
        return build_quads(model["elements"], model["textures"])
    if kind == "minecraft:composite":
        out = []
        for sub in ref.get("models", []):
            out.extend(model_quads_from_model_ref(sub, depth + 1))
        return out
    if kind == "minecraft:select":
        cases = ref.get("cases") or []
        node = cases[0]["model"] if cases and isinstance(cases[0], dict) else ref.get("fallback")
        return model_quads_from_model_ref(node, depth + 1)
    return []


def apply_item_transform(quads, tr):
    if not tr:
        return quads
    lq = tr.get("left_rotation")
    rq = tr.get("right_rotation")
    scale = tr.get("scale", [1, 1, 1])
    trans = tr.get("translation", [0, 0, 0])
    m = identity
    if lq and list(lq) != [0, 0, 0, 1]:
        prev = m
        lm = quat_matrix(lq)
        m = lambda p, prev=prev, lm=lm: lm(prev(p))
    if rq and list(rq) != [0, 0, 0, 1]:
        prev = m
        rm = quat_matrix(rq)
        m = lambda p, prev=prev, rm=rm: rm(prev(p))
    if scale != [1, 1, 1] or trans != [0, 0, 0]:
        prev = m
        m = lambda p, prev=prev: [prev(p)[i] * scale[i] + trans[i] for i in range(3)]
    return transform_quads(quads, m)


def quads_for_item(item_id):
    p = os.path.join(ASSETS, "items", item_id + ".json")
    if not os.path.exists(p):
        return None
    node = load_json(p).get("model")
    if not isinstance(node, dict):
        return None
    # top level node may carry a transformation
    tr = node.get("transformation")
    body = dict(node)
    body.pop("transformation", None)
    quads = model_quads_from_model_ref(body)
    return apply_item_transform(quads, tr)


def quads_for_block(block_id):
    p = os.path.join(ASSETS, "blockstates", block_id + ".json")
    if not os.path.exists(p):
        return None
    j = load_json(p)
    if "variants" in j:
        variants = j["variants"]
        key = "" if "" in variants else sorted(variants)[0]
        v = variants[key]
        if isinstance(v, list):
            v = v[0]
        model = resolve_model(v["model"])
        quads = build_quads(model["elements"], model["textures"])
        rot = {}
        if v.get("x") or v.get("y"):
            rot = {"x": v.get("x", 0), "y": v.get("y", 0)}
        if rot:
            quads = apply_blockstate_rotation(quads, rot)
        return quads
    if "multipart" in j:
        out = []
        for part in j["multipart"]:
            v = part.get("apply")
            if isinstance(v, list):
                v = v[0]
            if not v:
                continue
            model = resolve_model(v["model"])
            out.extend(build_quads(model["elements"], model["textures"]))
        return out
    return None


def apply_blockstate_rotation(quads, rot):
    x = rot.get("x", 0) % 360
    y = rot.get("y", 0) % 360
    m = identity
    if y:
        prev = m
        m = lambda p, prev=prev, y=y: rotate_point(prev(p), [0, 0, 0], "y", y)
    if x:
        prev = m
        m = lambda p, prev=prev, x=x: rotate_point(prev(p), [0, 0, 0], "x", x)
    return transform_quads(quads, m)


def render_id(item_id, size=SIZE, out_path=None, force_block=False):
    quads = None
    if not force_block:
        quads = quads_for_item(item_id)
    if not quads:
        quads = quads_for_block(item_id)
    if not quads:
        return False
    w, h, px = rasterize(quads, size=size)
    if out_path:
        P.encode(out_path, w, h, px)
    return w, h, px


# ----------------------------------------------------------------------- main

def compare(img_a, img_b):
    """Mean absolute RGB difference (0..255) over the union silhouette."""
    wa, ha, pa = img_a
    wb, hb, pb = img_b
    if (wa, ha) != (wb, hb):
        return 999.0
    total = 0
    n = 0
    for i in range(wa * ha):
        a_a = pa[i * 4 + 3]
        a_b = pb[i * 4 + 3]
        if a_a < 16 and a_b < 16:
            continue
        n += 1
        if a_a < 16 or a_b < 16:
            total += 255
            continue
        total += abs(pa[i * 4] - pb[i * 4]) + abs(pa[i * 4 + 1] - pb[i * 4 + 1]) + abs(pa[i * 4 + 2] - pb[i * 4 + 2])
    return total / max(n, 1) / 3.0


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    if args[0] == "--check":
        tests = ["stone", "grass_block", "crafting_table", "oak_stairs", "oak_slab",
                 "oak_log", "furnace", "bookshelf", "sandstone", "chest"]
        for t in tests:
            ref = os.path.join(ICONS, t + ".png")
            if not os.path.exists(ref):
                print(f"{t:<16} (no reference)")
                continue
            try:
                img = render_id(t, size=SIZE)
            except Exception as e:  # noqa: BLE001
                print(f"{t:<16} ERROR {e}")
                continue
            if not img:
                print(f"{t:<16} render failed")
                continue
            diff = compare(img, load_texture(ref))
            print(f"{t:<16} diff={diff:6.2f}")
        return 0
    out_dir = ICONS
    ids = []
    if args[0] == "--ids":
        with open(args[1], encoding="utf-8") as f:
            ids = [l.strip() for l in f if l.strip()]
        if len(args) > 2:
            out_dir = args[2]
    else:
        ids = args
    ok = fail = 0
    failed = []
    for i in ids:
        try:
            img = render_id(i, size=SIZE)
        except Exception as e:  # noqa: BLE001
            print(f"{i}: ERROR {e}")
            fail += 1
            failed.append(i)
            continue
        if not img:
            fail += 1
            failed.append(i)
            continue
        P.encode(os.path.join(out_dir, i + ".png"), *img)
        ok += 1
    print(f"rendered {ok}, failed {fail}")
    if failed:
        print("failed ids:", ", ".join(failed))
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
