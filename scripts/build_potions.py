#!/usr/bin/env python3
"""Build src/data/potions.json and tinted potion sprites from Minecraft 26.3 data.

Sources:
  * mcmeta 26.3 datapack  -> the brewing graph (279 minecraft:brewing recipes)
  * mcmeta 26.3 registries-> the exact 46 potion ids of the version
  * vanilla item textures -> potion.png / splash_potion.png / lingering_potion.png
                             plus potion_overlay.png, tinted per potion colour
  * minecraft.wiki        -> durations and effect colours (hardcoded tables below)

Output:
  * src/data/potions.json
  * public/icons/potions/<id>.png, <id>_splash.png, <id>_lingering.png  (128px)
"""
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png_util as P

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEX = os.path.join(ROOT, "scripts", "cache", "textures")
OUT_ICONS = os.path.join(ROOT, "public", "icons", "potions")
OUT_JSON = os.path.join(ROOT, "src", "data", "potions.json")

# ---------------------------------------------------------------- fixed tables
NO_EFFECT = "#385DC6"

COLORS = {
    "no_effect": NO_EFFECT,
    "speed": "#33EBFF",
    "slowness": "#8BAFE0",
    "strength": "#FFC700",
    "instant_health": "#F82423",
    "instant_damage": "#A9656A",
    "jump_boost": "#FDFF84",
    "regeneration": "#CD5CAB",
    "resistance": "#9146F0",
    "fire_resistance": "#FF9900",
    "water_breathing": "#98DAC0",
    "invisibility": "#F6F6F6",
    "night_vision": "#C2FF66",
    "weakness": "#484D48",
    "poison": "#87A363",
    "wither": "#736156",
    "luck": "#59C106",
    "slow_falling": "#F3CFB9",
    "infested": "#8C9B8C",
    "oozing": "#99FFA3",
    "weaving": "#78695A",
    "wind_charged": "#BDC9FF",
    "turtle_master": "#8D82E6",
    "turtle_master_2": "#8D85E6",
}

# base potion id -> (effect key, effect label, category, description)
EFFECTS = {
    "swiftness": ("speed", "Speed", "positive",
                  "Increases movement speed and sprint-jump distance by 20% per level."),
    "slowness": ("slowness", "Slowness", "negative",
                 "Reduces movement speed by 15% per level."),
    "leaping": ("jump_boost", "Jump Boost", "positive",
                "Increases jump height and reduces fall damage."),
    "strength": ("strength", "Strength", "positive",
                 "Adds 3 HP (1.5 hearts) of melee damage per level."),
    "healing": ("instant_health", "Instant Health", "positive",
                "Instantly restores 4 HP (2 hearts) per level."),
    "harming": ("instant_damage", "Instant Damage", "negative",
                "Instantly deals 6 HP (3 hearts) of damage per level."),
    "poison": ("poison", "Poison", "negative",
               "Drains 1 HP every 1.25 s, but never below 1 HP."),
    "regeneration": ("regeneration", "Regeneration", "positive",
                     "Restores 1 HP every 2.5 s (every 1.25 s at level II)."),
    "weakness": ("weakness", "Weakness", "negative",
                 "Reduces melee damage by 4 HP (2 hearts)."),
    "night_vision": ("night_vision", "Night Vision", "positive",
                     "Makes everything appear at full light level."),
    "invisibility": ("invisibility", "Invisibility", "positive",
                     "Hides the entity. Worn armour and held items stay visible."),
    "fire_resistance": ("fire_resistance", "Fire Resistance", "positive",
                        "Grants immunity to fire, lava, magma and blaze fireballs."),
    "water_breathing": ("water_breathing", "Water Breathing", "positive",
                        "Stops the air bar from draining underwater."),
    "slow_falling": ("slow_falling", "Slow Falling", "positive",
                     "Greatly slows falling and negates all fall damage."),
    "turtle_master": ("turtle_master", "Slowness IV + Resistance III", "mixed",
                      "Slowness IV and Resistance III at the same time."),
    "oozing": ("oozing", "Oozing", "negative",
               "When the entity dies, two slimes spawn."),
    "weaving": ("weaving", "Weaving", "negative",
                "When the entity dies it places cobwebs; it also moves through cobwebs without slowing."),
    "infested": ("infested", "Infested", "negative",
                 "Taking damage has a chance to spawn 1-2 silverfish."),
    "wind_charged": ("wind_charged", "Wind Charged", "mixed",
                     "Taking damage releases a wind burst that knocks nearby entities back."),
    "luck": ("luck", "Luck", "special",
             "Improves loot table rolls. Not brewable in survival."),
}

DURATION = {
    "swiftness": "3:00", "slowness": "1:30", "leaping": "3:00",
    "healing": "instant", "harming": "instant", "poison": "0:45",
    "regeneration": "0:45", "strength": "3:00", "weakness": "1:30",
    "night_vision": "3:00", "invisibility": "3:00", "fire_resistance": "3:00",
    "water_breathing": "3:00", "slow_falling": "1:30", "turtle_master": "0:20",
    "oozing": "3:00", "weaving": "3:00", "infested": "3:00",
    "wind_charged": "3:00", "luck": "5:00",
}

LONG_DURATION = {
    "swiftness": "8:00", "slowness": "4:00", "leaping": "8:00",
    "poison": "1:30", "regeneration": "1:30", "strength": "8:00",
    "weakness": "4:00", "night_vision": "8:00", "invisibility": "8:00",
    "fire_resistance": "8:00", "water_breathing": "8:00",
    "slow_falling": "4:00", "turtle_master": "0:40",
}

STRONG_DURATION = {
    "healing": "instant", "harming": "instant", "swiftness": "1:30",
    "leaping": "1:30", "poison": "0:21", "regeneration": "0:22",
    "strength": "1:30", "slowness": "0:20", "turtle_master": "0:20",
}

STRONG_LABEL = {
    "healing": "Instant Health II",
    "harming": "Instant Damage II",
    "swiftness": "Speed II",
    "leaping": "Jump Boost II",
    "poison": "Poison II",
    "regeneration": "Regeneration II",
    "strength": "Strength II",
    "slowness": "Slowness IV",
    "turtle_master": "Slowness VI + Resistance IV",
}

BASE_TITLES = {
    "water": "Water Bottle",
    "mundane": "Mundane Potion",
    "thick": "Thick Potion",
    "awkward": "Awkward Potion",
}

BASE_DESC = {
    "water": "The starting point for every potion. Fill a glass bottle from a water source or a cauldron.",
    "mundane": "A dud potion. Brewed from water with redstone, glowstone, sugar or most other ingredients.",
    "thick": "A useless potion brewed from water and glowstone dust.",
    "awkward": "The base for every useful potion. Brewed from water and nether wart.",
}

# canonical corruption source when several routes exist
CORRUPT_PREF = {
    "slowness": "swiftness",
    "harming": "healing",
    "invisibility": "night_vision",
}

REAGENT_RANK = {"nether_wart": 0, "redstone": 0, "glowstone_dust": 1}


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def read_edges(datapack):
    edges = []
    for p in sorted(glob.glob(os.path.join(datapack, "data", "minecraft", "recipe", "brewing", "*.json"))):
        j = load(p)
        inp = j.get("input", {})
        out = j.get("output", {})
        ic = inp.get("potion_contents") or {}
        oc = ((out.get("components") or {}).get("minecraft:potion_contents") or {})
        in_item = inp.get("item", "").split(":")[-1]
        out_item = out.get("id", "").split(":")[-1]
        in_pot = (ic.get("potion") or ic.get("potions") or "").split(":")[-1]
        out_pot = (oc.get("potion") or "").split(":")[-1]
        reagent = j.get("reagent", {}).get("item", "").split(":")[-1]
        edges.append({
            "in_item": in_item, "in_potion": in_pot,
            "reagent": reagent,
            "out_item": out_item, "out_potion": out_pot,
        })
    return edges


def best_paths(edges, potion_ids):
    """Shortest brewing path from water for every potion, with stable tie-breaks."""
    # drinkable adjacency only
    adj = {}
    for e in edges:
        if e["in_item"] != "potion" or e["out_item"] != "potion":
            continue
        adj.setdefault(e["in_potion"], []).append((e["reagent"], e["out_potion"]))

    def rank(p):
        if p in ("swiftness", "healing"):
            return 0
        if p in ("leaping", "poison"):
            return 1
        return 2

    paths = {"water": []}
    # repeated relaxation: prefer fewer steps, then lower path rank
    improved = True
    guard = 0
    while improved and guard < 50:
        improved = False
        guard += 1
        for src, steps in list(paths.items()):
            for reagent, dst in adj.get(src, []):
                cand = steps + [(reagent, dst)]
                cur = paths.get(dst)
                better = cur is None
                if cur is not None:
                    if len(cand) < len(cur):
                        better = True
                    elif len(cand) == len(cur):
                        key_c = (REAGENT_RANK.get(reagent, 3), rank(dst), tuple(rank(s[1]) for s in cand))
                        key_o = (REAGENT_RANK.get(cur[-1][0], 3), rank(dst), tuple(rank(s[1]) for s in cur))
                        better = key_c < key_o
                if better:
                    paths[dst] = cand
                    improved = True

    # sanity: every potion except luck reachable
    missing = [p for p in potion_ids if p not in paths and p != "luck"]
    if missing:
        raise SystemExit(f"unreachable potions: {missing}")
    return paths


def hex_to_rgb(h):
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def make_icons(potion_ids):
    os.makedirs(OUT_ICONS, exist_ok=True)
    base = {}
    for name in ("potion", "splash_potion", "lingering_potion"):
        w, h, px = P.decode(os.path.join(TEX, f"{name}.png"))
        base[name] = (w, h, px)
    ow, oh, overlay = P.decode(os.path.join(TEX, "potion_overlay.png"))
    assert (ow, oh) == (16, 16), (ow, oh)

    for pid in potion_ids:
        color = potion_color(pid)
        tinted = P.tint(overlay, ow, oh, hex_to_rgb(color))
        for form, key in (("", "potion"), ("_splash", "splash_potion"), ("_lingering", "lingering_potion")):
            w, h, px = base[key]
            out = P.composite(px, tinted, w, h)
            nw, nh, big = P.upscale(out, w, h, 8)
            P.encode(os.path.join(OUT_ICONS, f"{pid}{form}.png"), nw, nh, big)


def potion_color(pid):
    base = pid.split("_", 1)[1] if pid.startswith(("long_", "strong_")) else pid
    if base in BASE_TITLES:
        return NO_EFFECT
    key = EFFECTS[base][0]
    if pid == "strong_turtle_master":
        return COLORS["turtle_master_2"]
    return COLORS[key]


def main():
    datapack = sys.argv[1] if len(sys.argv) > 1 else glob.glob(
        os.path.join(os.environ["TEMP"], "mcmeta263", "*"))[0]
    reg_path = os.path.join(ROOT, "scripts", "cache", "potion_registry_263.json")
    if not os.path.exists(reg_path):
        raise SystemExit("missing scripts/cache/potion_registry_263.json")
    potion_ids = load(reg_path)

    edges = read_edges(datapack)
    print(f"brewing edges: {len(edges)}")

    # verify effect ingredient table against the data
    ingredient_of = {}
    corruption_of = {}
    variant_of = {}
    for e in edges:
        if e["in_item"] != "potion" or e["out_item"] != "potion":
            continue
        if e["in_potion"] == "awkward" and e["out_potion"] in EFFECTS:
            ingredient_of[e["out_potion"]] = e["reagent"]
        if e["reagent"] == "fermented_spider_eye":
            corruption_of.setdefault(e["out_potion"], []).append(e["in_potion"])
        if e["reagent"] in ("redstone", "glowstone_dust") and e["out_potion"].startswith(("long_", "strong_")):
            variant_of[e["out_potion"]] = (e["reagent"], e["in_potion"])

    # some effect potions are reached by corruption only (weakness, harming)
    for pid, srcs in corruption_of.items():
        if pid in EFFECTS and pid not in ingredient_of and pid != "weakness":
            pass  # harming: corruption from healing; handled below

    splash_ids = {e["out_potion"] for e in edges if e["in_item"] == "potion" and e["out_item"] == "splash_potion"}
    lingering_ids = {e["out_potion"] for e in edges if e["in_item"] == "splash_potion" and e["out_item"] == "lingering_potion"}

    paths = best_paths(edges, potion_ids)

    def variant_ids(base):
        return [p for p in potion_ids if p in (f"long_{base}", f"strong_{base}")]

    def mk_path(pid):
        steps = paths.get(pid, [])
        out = [{"reagent": None, "potion": "water"}]
        for reagent, dst in steps:
            out.append({"reagent": reagent, "potion": dst})
        return out

    entries = []

    # ---- base potions
    for pid in ("water", "mundane", "thick", "awkward"):
        steps = paths.get(pid, [])
        entries.append({
            "id": pid,
            "name": BASE_TITLES[pid],
            "shortName": BASE_TITLES[pid],
            "effect": "No effect",
            "effectLabel": "No effect",
            "category": "base",
            "color": NO_EFFECT,
            "description": BASE_DESC[pid],
            "duration": None,
            "instant": False,
            "brewable": True,
            "icon": f"potions/{pid}.png",
            "splashIcon": f"potions/{pid}_splash.png",
            "lingeringIcon": f"potions/{pid}_lingering.png",
            "splash": pid in splash_ids,
            "lingering": pid in lingering_ids,
            "path": mk_path(pid),
            "variants": [],
            "corruptsTo": [] if pid == "water" else sorted({c for c, srcs in corruption_of.items() if pid in srcs}),
        })

    # ---- effect potions
    for pid in EFFECTS:
        ekey, label, category, desc = EFFECTS[pid]
        color = COLORS["turtle_master"] if pid == "turtle_master" else COLORS[ekey]
        variants = []
        for vid in variant_ids(pid):
            reagent, _src = variant_of.get(vid, (None, None))
            if vid.startswith("long_"):
                vkind, vdur, vlabel = "extended", LONG_DURATION.get(pid), label
            else:
                vkind, vdur, vlabel = "enhanced", STRONG_DURATION.get(pid), STRONG_LABEL.get(pid, label)
            variants.append({
                "id": vid,
                "kind": vkind,
                "reagent": reagent,
                "duration": vdur,
                "effectLabel": vlabel,
                "icon": f"potions/{vid}.png",
                "splashIcon": f"potions/{vid}_splash.png",
                "lingeringIcon": f"potions/{vid}_lingering.png",
            })
        alts = []
        for src in corruption_of.get(pid, []):
            if src == CORRUPT_PREF.get(pid) or src in ("water", "mundane", "thick", "awkward"):
                continue
            if src.startswith(("long_", "strong_")):
                continue
            if src in alts:
                continue
            alts.append(src)
        entries.append({
            "id": pid,
            "name": f"Potion of {title_of(pid)}",
            "shortName": title_of(pid),
            "effect": label,
            "effectLabel": label,
            "category": category,
            "color": color,
            "description": desc,
            "duration": DURATION.get(pid),
            "instant": DURATION.get(pid) == "instant",
            "brewable": pid in ingredient_of or pid in corruption_of,
            "icon": f"potions/{pid}.png",
            "splashIcon": f"potions/{pid}_splash.png",
            "lingeringIcon": f"potions/{pid}_lingering.png",
            "splash": pid in splash_ids,
            "lingering": pid in lingering_ids,
            "path": mk_path(pid) if pid != "luck" else [],
            "variants": variants,
            "corruptsTo": sorted({c for c, srcs in corruption_of.items() if pid in srcs}),
            "alternativeFrom": [f"Potion of {title_of(a)}" for a in alts],
        })

    make_icons(potion_ids)

    data = {
        "version": "26.3",
        "source": "miscode/mcmeta 26.3 datapack (data_version 5023) + vanilla textures",
        "potions": entries,
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    print(f"wrote {OUT_JSON} ({len(entries)} potions)")
    print(f"icons: {len(os.listdir(OUT_ICONS))} files")


def title_of(pid):
    return {
        "healing": "Healing", "harming": "Harming",
        "turtle_master": "the Turtle Master",
        "infested": "Infestation", "wind_charged": "Wind Charging",
    }.get(pid, pid.replace("_", " ").title())


if __name__ == "__main__":
    main()
