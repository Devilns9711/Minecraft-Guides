#!/usr/bin/env python3
"""render_villagers.py - render the real villager appearance for each profession.

Uses the exact 26.3 VillagerModel geometry (head / hat / nose / body / jacket /
arms / legs) with the actual game textures: the base villager skin composited
with the biome type layer and the profession overlay layer, just like
VillagerRenderer + VillagerProfessionLayer do in game.

Output: public/icons/villagers/<profession>.png (256x256)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png_util as P
import render_blocks as R

ROOT = R.ROOT
A = R.ASSETS
OUT = os.path.join(ROOT, "public", "icons", "villagers")
V = os.path.join(A, "textures", "entity", "villager")
WANDERING = os.path.join(A, "textures", "entity", "wandering_trader", "wandering_trader.png")

PROFESSIONS = [
    "armorer", "butcher", "cartographer", "cleric", "farmer", "fisherman",
    "fletcher", "leatherworker", "librarian", "mason", "nitwit", "shepherd",
    "toolsmith", "weaponsmith",
]

SIZE = 256


def composite_tex(base_path, overlays):
    w, h, base = P.decode(base_path)
    for path in overlays:
        if not os.path.exists(path):
            continue
        ow, oh, opx = P.decode(path)
        if (ow, oh) == (w, h):
            base = P.composite(base, opx, w, h)
    return (w, h, base)


def box(quads, f, t, tex, u0, v0):
    """standard vanilla box unwrap (entity texture space, 64px UVs)"""
    dx, dy, dz = t[0] - f[0], t[1] - f[1], t[2] - f[2]
    regions = {
        "east": (u0, v0 + dz, u0 + dz, v0 + dz + dy),
        "north": (u0 + dz, v0 + dz, u0 + dz + dx, v0 + dz + dy),
        "west": (u0 + dz + dx, v0 + dz, u0 + dz + dx + dz, v0 + dz + dy),
        "south": (u0 + dz + dx + dz, v0 + dz, u0 + dz + dx + dz + dx, v0 + dz + dy),
        "up": (u0 + dz, v0, u0 + dz + dx, v0 + dz),
        "down": (u0 + dz + dx, v0, u0 + dz + dx + dx, v0 + dz),
    }
    for name, (u1, v1, u2, v2) in regions.items():
        pts = R.face_corners(name, f, t)
        if not pts:
            continue
        uvs = [(u1, v1), (u2, v1), (u2, v2), (u1, v2)]
        quads.append({"pts": pts, "uvs": uvs, "tex": tex, "shade": R.SHADE[name], "uv_scale": 64})


def villager_quads(tex):
    q = []
    # entity y grows downwards; block y = 24 - entity_y (feet at 0)
    box(q, [4, 24, 4], [12, 34, 12], tex, 0, 0)          # head
    box(q, [3.49, 23.49, 3.49], [12.51, 34.51, 12.51], tex, 32, 0)  # hat
    box(q, [7, 23, 2], [9, 27, 4], tex, 24, 0)           # nose
    box(q, [4, 12, 5], [12, 24, 11], tex, 16, 20)        # body
    box(q, [3.5, 4, 4.5], [12.5, 24, 11.5], tex, 0, 38)  # jacket / robe
    # arms: box(-8,-2,-2,4,8,4) at pose (0,3,-1) rotated -0.75 rad (crossed arms)
    arm_pivot = (8, 21, 7)
    for x1, x2 in ((0, 4), (12, 16)):
        sub = []
        box(sub, [x1, 15, 5], [x2, 23, 9], tex, 44, 22)
        for quad in sub:
            quad["pts"] = [R.rotate_point(p, arm_pivot, "x", 42.97) for p in quad["pts"]]
        q.extend(sub)
    box(q, [4, 0, 6], [8, 12, 10], tex, 0, 22)           # right leg
    box(q, [8, 0, 6], [12, 12, 10], tex, 0, 22)          # left leg
    return q


def render_profession(prof):
    base = os.path.join(V, "villager.png")
    overlays = [
        os.path.join(V, "type", "plains.png"),
        os.path.join(V, "profession", prof + ".png"),
    ]
    tex = composite_tex(base, overlays)
    quads = villager_quads(tex)
    return R.rasterize(quads, size=SIZE, margin=18)


def main():
    os.makedirs(OUT, exist_ok=True)
    for prof in PROFESSIONS:
        img = render_profession(prof)
        P.encode(os.path.join(OUT, prof + ".png"), *img)
        print(f"wrote {prof}.png")
    if os.path.exists(WANDERING):
        w, h, px = P.decode(WANDERING)
        quads = villager_quads((w, h, px))
        img = R.rasterize(quads, size=SIZE, margin=18)
        P.encode(os.path.join(OUT, "wandering_trader.png"), *img)
        print("wrote wandering_trader.png")


if __name__ == "__main__":
    main()
