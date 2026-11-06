#!/usr/bin/env python3
"""render_chests.py - render chest-type icons (chests are entity models, so the
block models are only particle placeholders).  Geometry follows vanilla
ModelChest: base 14x10x14, lid 14x5x14, knob 2x4x1, standard box unwrap.

Validated against the blockrender icons for chest / trapped_chest / ender_chest,
then applied to the copper chest variants (26.3 colours, no blockrender icon).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png_util as P
import render_blocks as R

A = R.ASSETS
ICONS = R.ICONS
TEX = os.path.join(A, "textures", "entity", "chest")


def box_quads(quads, f, t, tex, u0, v0):
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


def chest_quads(tex_path, size=64):
    quads = []
    box_quads(quads, [1, 0, 1], [15, 10, 15], tex_path, 0, 19)   # base
    box_quads(quads, [1, 10, 1], [15, 15, 15], tex_path, 0, 0)   # lid
    box_quads(quads, [7, 8, 0], [9, 12, 1], tex_path, 0, 0)      # knob
    return quads


def main():
    check = {
        "chest": "normal.png",
        "trapped_chest": "trapped.png",
        "ender_chest": "ender.png",
    }
    for item_id, tex in check.items():
        ref = os.path.join(ICONS, item_id + ".png")
        if not os.path.exists(ref):
            print(f"{item_id}: no reference")
            continue
        quads = chest_quads(os.path.join(TEX, tex))
        img = R.rasterize(quads, size=192)
        ref_img = P.decode(ref)
        print(f"{item_id:<16} diff={R.compare(img, ref_img):6.2f}")

    targets = {
        "copper_chest": "copper.png",
        "exposed_copper_chest": "copper_exposed.png",
        "weathered_copper_chest": "copper_weathered.png",
        "oxidized_copper_chest": "copper_oxidized.png",
        "waxed_copper_chest": "copper.png",
        "waxed_exposed_copper_chest": "copper_exposed.png",
        "waxed_weathered_copper_chest": "copper_weathered.png",
        "waxed_oxidized_copper_chest": "copper_oxidized.png",
    }
    for item_id, tex in targets.items():
        quads = chest_quads(os.path.join(TEX, tex))
        img = R.rasterize(quads, size=192)
        P.encode(os.path.join(ICONS, item_id + ".png"), *img)
    print(f"wrote {len(targets)} copper chest icons")


if __name__ == "__main__":
    main()
