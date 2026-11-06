#!/usr/bin/env python3
"""
download_icons.py - bulk-fetch REAL Minecraft icon PNGs into public/icons/.

Data sources (all authoritative):
  * mcmeta 26.3 datapack (extracted, passed as --datapack)   -> every item/block id
    referenced by any recipe or villager trade.
  * mcmeta registries branch (block/item data.json, cached)   -> route each id to the
    block endpoint (isometric render) or item endpoint (flat sprite).
  * blockrender.dev (pinned to Java 26.2)                     -> the actual PNGs.
  * package coverage: ids whose display name resolves to an
    minecraft-items-react export need no file (runtime uses the SVG).

Naming: <minecraft_id>.png (e.g. acacia_planks.png).

Output:
  * public/icons/<id>.png for every uncovered id
  * scripts/cache/icon_failures.json  -> ids that 404'd (26.3-new content,
    handled by a separate fallback step)

Exit code 0 = every needed id is covered (file or package).
"""
import argparse
import concurrent.futures
import glob
import json
import os
import re
import struct
import sys
import time
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "public", "icons")
CACHE = os.path.join(ROOT, "scripts", "cache")
PKG_ITEMS = os.path.join(ROOT, "node_modules", "minecraft-items-react", "dist", "items")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) icon-fetch"}
RENDER = "https://blockrender.dev/render/{}"
REG = "https://raw.githubusercontent.com/misode/mcmeta/registries/{}/data.json"


def fetch(url, tries=3, timeout=25):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return 404, b""
            last = e
        except Exception as e:  # noqa: BLE001
            last = e
        time.sleep(1.5 * (i + 1))
    return 0, str(last).encode()


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def png_ok(path):
    try:
        with open(path, "rb") as f:
            head = f.read(24)
        if head[:8] != b"\x89PNG\r\n\x1a\n":
            return False
        w, h = struct.unpack(">II", head[16:24])
        return w >= 8 and h >= 8
    except OSError:
        return False


def derive_pkg(id_):
    """Mirror of the runtime resolver rule: id -> display -> package export."""
    disp = id_.replace("minecraft:", "").replace("_", " ").title()
    return "Minecraft" + re.sub(r"[^a-zA-Z0-9]", "", disp)


# ---------------------------------------------------------------- collect ids
DENY_KEYS = {"type", "potion_contents", "potion", "potions", "effect", "effects",
             "enchantments", "options", "minecraft:stored_enchantments",
             "minecraft:suspicious_stew_effects", "pattern"}


def collect_ids(datapack):
    ids, tags = set(), set()

    def walk(node, key=None):
        if key in DENY_KEYS:
            return
        if isinstance(node, str):
            if node.startswith("#minecraft:"):
                tags.add(node[1:])
            elif node.startswith("minecraft:"):
                ids.add(node.split(":", 1)[1])
        elif isinstance(node, dict):
            for k, v in node.items():
                walk(v, k)
        elif isinstance(node, list):
            for v in node:
                walk(v, key)

    recs = sorted(glob.glob(os.path.join(datapack, "data", "minecraft", "recipe", "**", "*.json"), recursive=True))
    trades = sorted(glob.glob(os.path.join(datapack, "data", "minecraft", "villager_trade", "**", "*.json"), recursive=True))
    for p in recs + trades:
        walk(load(p))

    # tag expansion (for grid representatives) - tags live in data/<ns>/tags/<kind>/...
    tagmap = {}
    base = os.path.join(datapack, "data", "minecraft", "tags")
    for p in glob.glob(os.path.join(base, "**", "*.json"), recursive=True):
        rel = os.path.relpath(p, base).replace(os.sep, "/")[:-5]
        parts = rel.split("/")  # e.g. item/enchantable/armor
        if parts[0] not in ("item", "items", "block", "blocks"):
            continue
        key = "minecraft:" + ".".join(parts[1:])
        tagmap[key] = load(p)

    def expand(tag, depth=0):
        if depth > 8 or tag not in tagmap:
            return []
        out = []
        for v in tagmap[tag].get("values", []):
            if isinstance(v, dict):
                v = v.get("id", "")
            if v.startswith("#"):
                out += expand(v[1:], depth + 1)
            elif v.startswith("minecraft:"):
                out.append(v.split(":", 1)[1])
        return out

    expanded = set()
    for t in tags:
        expanded.update(expand(t))
    return ids, tags, expanded


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--datapack", required=True, help="extracted mcmeta 26.3 datapack root")
    ap.add_argument("--jobs", type=int, default=8)
    ap.add_argument("--dry", action="store_true", help="report only")
    args = ap.parse_args()

    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(ICONS, exist_ok=True)

    ids, tags, expanded = collect_ids(args.datapack)
    all_ids = sorted(ids | expanded)
    print(f"recipe/trade ids: {len(ids)}, tag-expanded add: {len(expanded)}, total: {len(all_ids)}")

    # registries: block vs item routing
    blocks, items = set(), set()
    for name, target in (("block", blocks), ("item", items)):
        cache_p = os.path.join(CACHE, f"registry_{name}.json")
        if not os.path.exists(cache_p):
            status, body = fetch(REG.format(name))
            if status != 200:
                print(f"FATAL: registry {name} fetch failed: {status}")
                return 2
            with open(cache_p, "wb") as f:
                f.write(body)
        target.update(load(cache_p))
    print(f"registry: {len(blocks)} blocks, {len(items)} items")

    # package exports
    pkg = {os.path.basename(p)[:-5] for p in glob.glob(os.path.join(PKG_ITEMS, "*.d.ts"))}
    have = {f[:-4] for f in os.listdir(ICONS) if f.endswith(".png")}

    need_pkg = need_file = 0
    todo = []
    for i in all_ids:
        if derive_pkg(i) in pkg:
            need_pkg += 1
            continue
        if i in have:
            need_file += 1
            continue
        todo.append(i)
    print(f"package-covered: {need_pkg} | file already present: {need_file} | to download: {len(todo)}")
    if args.dry:
        print("dry run, todo sample:", todo[:40])
        return 0

    def one(i):
        is_block = i in blocks
        order = ["block", "item"] if is_block else ["item", "block"]
        codes = []
        for kind in order:
            status, body = fetch(RENDER.format(f"{kind}/{i}.png?size=192"), tries=2)
            codes.append(f"{kind}:{status}")
            if status == 200 and body[:8] == b"\x89PNG\r\n\x1a\n":
                with open(os.path.join(ICONS, f"{i}.png"), "wb") as f:
                    f.write(body)
                return i, True, "/".join(codes)
        return i, False, "/".join(codes)

    ok = fail = 0
    failures = []
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as ex:
        futs = {ex.submit(one, i): i for i in todo}
        for n, fut in enumerate(concurrent.futures.as_completed(futs), 1):
            i, good, info = fut.result()
            if good:
                ok += 1
            else:
                fail += 1
                failures.append({"id": i, "kind": "block" if i in blocks else "item", "codes": info})
            if n % 100 == 0 or n == len(todo):
                print(f"  {n}/{len(todo)}  ok={ok} fail={fail}  {time.time()-t0:.0f}s", flush=True)

    with open(os.path.join(CACHE, "icon_failures.json"), "w", encoding="utf-8") as f:
        json.dump(failures, f, indent=1)
    print(f"DONE: downloaded {ok}, failed {fail}  ({time.time()-t0:.0f}s)")
    if failures:
        print("failures (need fallback):", ", ".join(f["id"] for f in failures[:60]),
              "..." if len(failures) > 60 else "")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
