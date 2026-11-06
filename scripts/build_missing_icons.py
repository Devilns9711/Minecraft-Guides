#!/usr/bin/env python3
"""build_missing_icons.py - finish the icon set for ids blockrender.dev 26.2 lacks.

Splits the remaining ids into:
  * flat item sprites  -> upscale the real item texture
  * everything else    -> isometric render from the 26.3 models
Reports whatever still cannot be produced (entity-only "special" models).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png_util as P
import render_blocks as R

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "public", "icons")
CACHE = os.path.join(ROOT, "scripts", "cache")
A = R.ASSETS
SIZE = 192


def item_model_type(i):
    p = os.path.join(A, "items", i + ".json")
    if not os.path.exists(p):
        return None, None
    j = json.load(open(p, encoding="utf-8"))
    node = j.get("model") or {}
    return node.get("type"), node


def classify(rem, assets):
    flat, render, special, bogus = [], [], [], []
    for i in rem:
        kinds = assets.get(i, [])
        kind, node = item_model_type(i)
        it = os.path.exists(os.path.join(A, "textures", "item", i + ".png"))
        if kind == "minecraft:special":
            special.append(i)
        elif kind in ("minecraft:model", "minecraft:select", "minecraft:composite"):
            render.append(i)
        elif it:
            flat.append(i)
        elif not kinds:
            bogus.append(i)
        else:
            special.append(i)
    return flat, render, special, bogus


def flat_icon(i, out_path):
    src = os.path.join(A, "textures", "item", i + ".png")
    w, h, px = P.decode(src)
    if h > w:  # animated strip -> first frame
        fh = w
        px = bytearray(b"".join(px[y * w * 4:(y + 1) * w * 4] for y in range(fh)))
        h = fh
    factor = max(1, SIZE // max(w, h))
    nw, nh, big = P.upscale(px, w, h, factor)
    # centre in a square canvas like the renders
    canvas = bytearray(SIZE * SIZE * 4)
    ox = (SIZE - nw) // 2
    oy = (SIZE - nh) // 2
    for y in range(nh):
        sy = y + oy
        if 0 <= sy < SIZE:
            start = ((sy) * SIZE + ox) * 4
            canvas[start:start + nw * 4] = big[y * nw * 4:(y + 1) * nw * 4]
    P.encode(out_path, SIZE, SIZE, canvas)


def main():
    rem = [l.strip() for l in open(os.path.join(CACHE, "gap_remaining.txt"), encoding="utf-8") if l.strip()]
    assets = json.load(open(os.path.join(CACHE, "gap_assets.json"), encoding="utf-8"))
    flat, render, special, bogus = classify(rem, assets)
    print(f"remaining {len(rem)}: flat={len(flat)} render={len(render)} special={len(special)} bogus={len(bogus)}")

    ok_flat = []
    for i in flat:
        flat_icon(i, os.path.join(ICONS, i + ".png"))
        ok_flat.append(i)
    print(f"flat icons: {len(ok_flat)}")

    ok_r = fail_r = 0
    failed = []
    for i in render:
        img = None
        try:
            img = R.render_id(i, size=SIZE)
        except Exception as e:  # noqa: BLE001
            print(f"  render ERROR {i}: {e}")
        if img:
            P.encode(os.path.join(ICONS, i + ".png"), *img)
            ok_r += 1
            continue
        # flat item sprite fallback (generated item models have no geometry)
        src = os.path.join(A, "textures", "item", i + ".png")
        if os.path.exists(src):
            flat_icon(i, os.path.join(ICONS, i + ".png"))
            ok_r += 1
            continue
        fail_r += 1
        failed.append(i)
    print(f"rendered: {ok_r}, render failed: {fail_r}")
    if failed:
        print("failed to render:", ", ".join(failed))
    print("\nspecial (entity models, still missing):", ", ".join(special))
    print("bogus (skipped):", ", ".join(bogus))


if __name__ == "__main__":
    main()
