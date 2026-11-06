#!/usr/bin/env python3
"""
build_data.py - transform the pinned Minecraft 26.3 datapack (misode/mcmeta
@ 538b2b16 = Java 26.3 release, data_version 5023) into the site's JSON data files.

Outputs (src/data/):
  craftingRecipes.json      all crafting-table grid recipes (shaped/shapeless/
                            transmute/dye/imbue/decorated-pot)
  stonecuttingRecipes.json  grouped by input: input -> all products
  cookingRecipes.json       furnace / blast furnace / smoker / campfire
  smithingRecipes.json      smithing transforms + armor trims
  specialRecipes.json       recipes the game defines dynamically (repair, banners,
                            maps, fireworks...) with an accurate note instead of a
                            fake grid

Every icon id written here is guaranteed to exist in public/icons/ or be covered
by the minecraft-items-react package (download_icons.py uses the same walk).
"""
import argparse
import glob
import json
import os
import sys

TITLES = {}


def title(i):
    if i not in TITLES:
        TITLES[i] = i.replace("minecraft:", "").replace("_", " ").title()
    return TITLES[i]


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save(p, obj):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)


def clean(i):
    if isinstance(i, str) and i.startswith("minecraft:"):
        return i.split(":", 1)[1]
    return i


class Datapack:
    def __init__(self, root):
        self.tagmap = {}
        base = os.path.join(root, "data", "minecraft", "tags")
        for p in glob.glob(os.path.join(base, "**", "*.json"), recursive=True):
            rel = os.path.relpath(p, base).replace(os.sep, "/")[:-5]
            parts = rel.split("/")
            if parts[0] not in ("item", "items", "block", "blocks"):
                continue
            self.tagmap["minecraft:" + ".".join(parts[1:])] = load(p)
        self._cache = {}

    def expand(self, tag, depth=0):
        """tag: 'minecraft:planks' (no leading #) -> [ids]"""
        if depth > 8:
            return []
        if tag in self._cache:
            return self._cache[tag]
        out = []
        if tag in self.tagmap:
            for v in self.tagmap[tag].get("values", []):
                if isinstance(v, dict):
                    v = v.get("id", "")
                if v.startswith("#"):
                    out += self.expand(v[1:], depth + 1)
                elif v.startswith("minecraft:"):
                    out += [v.split(":", 1)[1]]
        self._cache[tag] = out
        return out


def ing(node, dp):
    """normalize one ingredient node -> (rep_id|None, is_tag, alternatives)"""
    if isinstance(node, str):
        if node.startswith("#"):
            ex = dp.expand(node[1:])
            return (ex[0] if ex else None, True, ex)
        return (clean(node), False, [clean(node)])
    if isinstance(node, dict):
        if "tag" in node:
            ex = dp.expand(node["tag"])
            return (ex[0] if ex else None, True, ex)
        if "id" in node or "item" in node:
            v = clean(node.get("id") or node.get("item"))
            return (v, False, [v])
        return (None, False, [])
    if isinstance(node, list) and node:
        rep, is_tag, _ = ing(node[0], dp)
        alts = []
        for n in node:
            r, t, a = ing(n, dp)
            alts += a
        return (rep, is_tag, alts)
    return (None, False, [])


def tag_leaf(node):
    """human leaf name of a tag node: '#minecraft:planks' -> 'planks'"""
    if isinstance(node, str) and node.startswith("#"):
        s = node[1:]
    elif isinstance(node, dict) and "tag" in node:
        s = node["tag"]
    elif isinstance(node, list) and node:
        return tag_leaf(node[0])
    else:
        return None
    leaf = s.split(".")[-1].split("/")[-1].split(":")[-1]
    return leaf.replace("_", " ").title()


def label_of(node, dp):
    rep, is_tag, _ = ing(node, dp)
    if rep is None:
        return None, None, False
    if is_tag:
        return rep, f"{tag_leaf(node)} (any)", True
    return rep, title(rep), False


# ------------------------------------------------------------------ category
FOOD = ("bread", "cake", "cookie", "pumpkin_pie", "mushroom_stew", "beetroot_soup",
        "rabbit_stew", "suspicious_stew", "golden_apple")
EQUIP_END = ("pickaxe", "axe", "shovel", "hoe", "sword", "helmet", "chestplate",
             "leggings", "boots", "crossbow", "bow", "trident", "shield", "mace",
             "shears", "fishing_rod", "spyglass", "brush", "arrow")
EQUIP_EXACT = ("flint_and_steel", "carrot_on_a_stick", "warped_fungus_on_a_stick",
               "bone_meal")
REDSTONE = ("redstone", "repeater", "comparator", "piston", "dispenser", "dropper",
            "hopper", "observer", "daylight_detector", "target", "note_block",
            "jukebox", "lever", "tripwire", "crafter", "weighted")


def categorize(i, blocks):
    # transportation first (rails ARE blocks, boats are items)
    if i.endswith(("boat", "raft", "minecart", "rail", "saddle")):
        return "transportation"
    if i in EQUIP_EXACT or i.endswith(EQUIP_END):
        return "equipment"
    if i in FOOD or i.endswith(FOOD):
        return "food"
    if any(s in i for s in REDSTONE):
        return "redstone"
    if i in blocks:
        return "building"
    return "misc"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--datapack", required=True)
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument("--out", default=os.path.join(here, "..", "src", "data"))
    args = ap.parse_args()

    dp = Datapack(args.datapack)
    blocks = set(load(os.path.join(here, "cache", "registry_block.json")))

    files = sorted(glob.glob(os.path.join(args.datapack, "data", "minecraft", "recipe", "*.json")))
    crafting, stone, cooking, smithing, special = [], [], [], [], []

    def cell(node):
        rep, _, _ = ing(node, dp)
        return rep

    def mats(nodes):
        seen, out = set(), []
        for n in nodes:
            rep, lab, any_ = label_of(n, dp)
            if rep is None or lab is None or lab in seen:
                continue
            seen.add(lab)
            out.append({"id": rep, "label": lab, "any": any_})
        return out

    def add_grid(name, rid, rows, nodes, qty, station, category, kind, note=None):
        e = {
            "name": name, "id": rid, "grid": rows, "materials": mats(nodes),
            "quantity": qty, "station": station, "category": category, "kind": kind,
        }
        if note:
            e["note"] = note
        crafting.append(e)

    for f in files:
        j = load(f)
        t = j.get("type", "").split(":")[-1]
        r = j.get("result") or {}
        rid = clean(r.get("id")) if isinstance(r, dict) else None
        qty = r.get("count", 1) if isinstance(r, dict) else 1

        if t in ("crafting_shaped", "crafting_shapeless"):
            if t == "crafting_shaped":
                rows = []
                for row in j["pattern"]:
                    rr = []
                    for ch in row:
                        rr.append(None if ch == " " else cell(j["key"][ch]))
                    rows.append(rr)
                nodes = [j["key"][ch] for row in j["pattern"] for ch in row if ch != " "]
                station = ("Inventory 2×2" if max(len(r_) for r_ in rows) <= 2 and len(rows) <= 2
                           else "Crafting Table")
            else:
                nodes = j.get("ingredients", [])
                n = len(nodes)
                cols = 3 if n > 4 else (2 if n >= 3 else max(n, 1))
                reps = [cell(x) for x in nodes]
                rows, cur = [], []
                for v in reps:
                    cur.append(v)
                    if len(cur) == cols:
                        rows.append(cur)
                        cur = []
                if cur:
                    rows.append(cur)
                station = "Inventory 2×2" if n <= 4 else "Crafting Table"
            cat = j.get("category") or (categorize(rid or "", blocks) if rid else "misc")
            if cat == "blocks":
                cat = "building"
            note = None
            comps = r.get("components") if isinstance(r, dict) else None
            if comps and "minecraft:suspicious_stew_effects" in comps:
                eff = comps["minecraft:suspicious_stew_effects"][0]
                note = f"{title(eff['id'])} effect ({eff['duration']}s)"
            add_grid(title(rid) if rid else title(os.path.basename(f)[:-5]),
                     rid, rows, nodes, qty, station, cat, t.split("_")[-1], note)

        elif t == "stonecutting":
            src, lab, _ = label_of(j["ingredient"], dp)
            if src:
                stone.append((src, lab, {"id": rid, "name": title(rid), "count": qty}))

        elif t in ("smelting", "blasting", "smoking", "campfire_cooking"):
            src, lab, _ = label_of(j["ingredient"], dp)
            cooking.append({
                "station": {"smelting": "Furnace", "blasting": "Blast Furnace",
                            "smoking": "Smoker", "campfire_cooking": "Campfire"}[t],
                "input": src, "inputLabel": lab,
                "output": rid, "outputLabel": title(rid), "count": qty,
                "time": j.get("cookingtime", 200) / 20,
                "xp": j.get("experience", 0),
                "category": j.get("category"),
            })

        elif t in ("smithing_transform", "smithing_trim"):
            smithing.append({
                "kind": "trim" if t.endswith("trim") else "transform",
                "template": clean(j["template"]),
                "base": j["base"], "baseRep": cell(j["base"]),
                "addition": j["addition"], "additionRep": cell(j["addition"]),
                "result": rid,
                "name": (title(rid) if rid else
                         title(clean(j["template"])).replace(" Smithing Template", "")),
                "quantity": qty,
            })

        elif t.startswith("crafting_special"):
            special.append(make_special(t.replace("crafting_special_", ""), j, dp))

        elif t == "crafting_transmute":
            if rid is None:
                # map_cloning: input map + 1..8 empty maps -> same amount of maps
                lo = j.get("material_count", {}).get("min", 1)
                hi = j.get("material_count", {}).get("max", lo)
                add_grid(title(os.path.basename(f)[:-5]), None,
                         [[cell(j["input"]), cell(j["material"])]],
                         [j["input"], j["material"]], qty, "Crafting Table",
                         "misc", "transmute",
                         f"Clones a map using {lo}–{hi} empty maps (result count follows).")
            else:
                add_grid(title(rid), rid, [[cell(j["input"]), cell(j["material"])]],
                         [j["input"], j["material"]], qty, "Crafting Table",
                         j.get("category") or categorize(rid, blocks), "transmute")

        elif t == "crafting_dye":
            add_grid(title(rid), rid, [[cell(j["target"]), cell(j["dye"])]],
                     [j["target"], j["dye"]], qty, "Crafting Table",
                     j.get("category") or "equipment", "dye")

        elif t == "crafting_imbue":
            add_grid(title(rid), rid, [[cell(j["source"]), cell(j["material"])]],
                     [j["source"], j["material"]], qty, "Crafting Table", "equipment",
                     "imbue",
                     "Any lingering potion infuses 8 arrows (matches the potion's effect).")

        elif t == "crafting_decorated_pot":
            slots = [cell(j[k]) for k in ("front", "back", "left", "right")]
            add_grid(title(rid), rid, [[slots[0], slots[1]], [slots[2], slots[3]]],
                     [j["front"]], qty, "Crafting Table", "building", "pot",
                     "Four sherds or bricks in any layout; patterns follow slot placement.")

    # ---- stonecutting grouped by input
    groups = {}
    for src, lab, out in stone:
        groups.setdefault((src, lab), []).append(out)
    stone_out = sorted(
        ({"input": k[0], "label": k[1],
          "results": sorted(v, key=lambda x: x["name"])} for k, v in groups.items()),
        key=lambda x: x["label"] or "")

    # duplicate special recipes (16 banner-copy files) collapse into one card
    dedup, seen_special = [], set()
    for s in special:
        if s["name"] in seen_special:
            continue
        seen_special.add(s["name"])
        dedup.append(s)
    special = dedup

    cooking.sort(key=lambda x: (x["station"], x["inputLabel"] or ""))
    smithing.sort(key=lambda x: x["name"])
    crafting.sort(key=lambda x: x["name"])
    special.sort(key=lambda x: x["name"])

    os.makedirs(args.out, exist_ok=True)
    save(os.path.join(args.out, "craftingRecipes.json"), crafting)
    save(os.path.join(args.out, "stonecuttingRecipes.json"), stone_out)
    save(os.path.join(args.out, "cookingRecipes.json"), cooking)
    save(os.path.join(args.out, "smithingRecipes.json"), smithing)
    save(os.path.join(args.out, "specialRecipes.json"), special)

    cats, stations = {}, {}
    for c in crafting:
        cats[c["category"]] = cats.get(c["category"], 0) + 1
        stations[c["station"]] = stations.get(c["station"], 0) + 1
    print(f"crafting: {len(crafting)}  cats={cats}  stations={stations}")
    print(f"stonecutting: {len(stone_out)} inputs ({sum(len(g['results']) for g in stone_out)} products)")
    print(f"cooking: {len(cooking)}  smithing: {len(smithing)}  special: {len(special)}")
    return 0


def make_special(kind, j, dp):
    def rep(node):
        r, _, _ = ing(node, dp)
        return r

    def pair(a, b):
        return [[rep(a), rep(b)]]

    cards = {
        "repairitem": {
            "name": "Repair & Merge Items",
            "note": "Place two damaged tools, weapons or armor of the same kind in the grid "
                    "(optionally with iron ingots, diamonds or other repair materials) to repair "
                    "them or merge their enchantments.",
        },
        "bannerduplicate": {
            "name": "Copy a Banner",
            "grid": pair("#minecraft:banners", "#minecraft:banners"),
            "nodes": ["#minecraft:banners"],
            "note": "Banner + identical banner copies the pattern (works for every color).",
        },
        "bookcloning": {
            "name": "Copy a Written Book",
            "grid": pair(j.get("source"), j.get("material", "#minecraft:book_cloning_target")),
            "nodes": [j.get("source"), j.get("material", "#minecraft:book_cloning_target")],
            "note": "Written Book + Book copies every written page.",
        },
        "mapextending": {
            "name": "Extend a Map",
            "grid": pair(j.get("map", "#minecraft:extendable_maps"), j.get("material")),
            "nodes": [j.get("map", "#minecraft:extendable_maps"), j.get("material")],
            "note": "Filled Map + Paper adds one zoom level. The Cartography Table can also "
                    "extend, lock and copy maps.",
        },
        "shielddecoration": {
            "name": "Banner on a Shield",
            "grid": pair(j.get("target"), j.get("banner", "#minecraft:banners")),
            "nodes": [j.get("target"), j.get("banner", "#minecraft:banners")],
            "note": "Shield + Banner copies the banner pattern onto the shield.",
        },
        "firework_rocket": {
            "name": "Firework Rocket",
            "grid": pair(j.get("shell"), j.get("fuel")),
            "nodes": [j.get("shell"), j.get("fuel"), j.get("star")],
            "note": "Paper + Gunpowder makes 3 rockets; add a Firework Star for a colored "
                    "explosion. Extra gunpowder = higher flight.",
        },
        "firework_star": {
            "name": "Firework Star",
            "grid": pair(j.get("fuel"), j.get("dye", "#minecraft:dyes")),
            "nodes": [j.get("fuel"), j.get("dye", "#minecraft:dyes")],
            "note": "Gunpowder + Dye makes a Firework Star. Optional modifiers: Shape "
                    "(Feather, Creeper Head, Fire Charge or Gold Nugget), Trail (Diamond), "
                    "Twinkle (Glowstone Dust).",
        },
        "firework_star_fade": {
            "name": "Fade Firework Star",
            "grid": pair(j.get("target"), j.get("dye", "#minecraft:dyes")),
            "nodes": [j.get("target"), j.get("dye", "#minecraft:dyes")],
            "note": "Firework Star + Dye adds a second, fading color to the explosion.",
        },
    }
    card = dict(cards.get(kind, {"name": title(kind), "note": "Special recipe."}))
    card["kind"] = kind
    if "grid" in card:
        seen, m = set(), []
        for n in card.pop("nodes", []):
            rep_, lab, any_ = label_of(n, dp)
            if rep_ and lab and lab not in seen:
                seen.add(lab)
                m.append({"id": rep_, "label": lab, "any": any_})
        card["materials"] = m
        # drop unresolvable cells (empty tag expansions)
        if not any(c for row in card["grid"] for c in row):
            card.pop("grid")
    else:
        card["materials"] = []
    return card


if __name__ == "__main__":
    sys.exit(main())
