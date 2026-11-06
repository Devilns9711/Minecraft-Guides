import { useState } from 'react'

import {
  MinecraftApple,
  MinecraftBlazePowder,
  MinecraftBook,
  MinecraftBread,
  MinecraftBrewingStand,
  MinecraftBow,
  MinecraftCake,
  MinecraftCoal,
  MinecraftCrossbowStandby,
  MinecraftDiamond,
  MinecraftDiamondAxe,
  MinecraftDiamondBoots,
  MinecraftDiamondChestplate,
  MinecraftDiamondHelmet,
  MinecraftDiamondHoe,
  MinecraftDiamondLeggings,
  MinecraftDiamondPickaxe,
  MinecraftDiamondShovel,
  MinecraftDiamondSword,
  MinecraftEgg,
  MinecraftEmerald,
  MinecraftEnchantedBook,
  MinecraftEndCrystal,
  MinecraftEnderEye,
  MinecraftElytra,
  MinecraftExperienceBottle,
  MinecraftFeather,
  MinecraftFermentedSpiderEye,
  MinecraftFishingRod,
  MinecraftFlint,
  MinecraftGhastTear,
  MinecraftGlassBottle,
  MinecraftGlisteringMelonSlice,
  MinecraftGlowstoneDust,
  MinecraftGoldenCarrot,
  MinecraftGoldIngot,
  MinecraftGunpowder,
  MinecraftIronIngot,
  MinecraftLingeringPotion,
  MinecraftMagmaCream,
  MinecraftMilkBucket,
  MinecraftNetheriteIngot,
  MinecraftNetheriteUpgradeSmithingTemplate,
  MinecraftNetherWart,
  MinecraftPhantomMembrane,
  MinecraftPufferfish,
  MinecraftPotion,
  MinecraftQuartz,
  MinecraftRedstone,
  MinecraftSlimeBall,
  MinecraftSplashPotion,
  MinecraftSpiderEye,
  MinecraftStick,
  MinecraftString,
  MinecraftSugar,
  MinecraftTurtleHelmet,
  MinecraftTrident,
  MinecraftWheat,
} from 'minecraft-items-react'

import { UnknownBlock } from './BlockIcons'
import iconFiles from '../../data/iconManifest.json'

// Every icon file we actually ship, so the resolver can pick a real PNG
// without firing 404 requests for items the package already provides.
const FILES = new Set(iconFiles)

// Real Minecraft item icons from minecraft-items-react, kept as a fallback for
// the few UI names that have no PNG (potions, mainly).
const ITEMS = {
  MinecraftApple,
  MinecraftBlazePowder,
  MinecraftBook,
  MinecraftBread,
  MinecraftBrewingStand,
  MinecraftBow,
  MinecraftCake,
  MinecraftCoal,
  MinecraftCrossbowStandby,
  MinecraftDiamond,
  MinecraftDiamondAxe,
  MinecraftDiamondBoots,
  MinecraftDiamondChestplate,
  MinecraftDiamondHelmet,
  MinecraftDiamondHoe,
  MinecraftDiamondLeggings,
  MinecraftDiamondPickaxe,
  MinecraftDiamondShovel,
  MinecraftDiamondSword,
  MinecraftEgg,
  MinecraftEmerald,
  MinecraftEnchantedBook,
  MinecraftEndCrystal,
  MinecraftEnderEye,
  MinecraftElytra,
  MinecraftExperienceBottle,
  MinecraftFeather,
  MinecraftFermentedSpiderEye,
  MinecraftFishingRod,
  MinecraftFlint,
  MinecraftGhastTear,
  MinecraftGlassBottle,
  MinecraftGlisteringMelonSlice,
  MinecraftGlowstoneDust,
  MinecraftGoldenCarrot,
  MinecraftGoldIngot,
  MinecraftGunpowder,
  MinecraftIronIngot,
  MinecraftLingeringPotion,
  MinecraftMagmaCream,
  MinecraftMilkBucket,
  MinecraftNetheriteIngot,
  MinecraftNetheriteUpgradeSmithingTemplate,
  MinecraftNetherWart,
  MinecraftPhantomMembrane,
  MinecraftPufferfish,
  MinecraftPotion,
  MinecraftQuartz,
  MinecraftRedstone,
  MinecraftSlimeBall,
  MinecraftSplashPotion,
  MinecraftSpiderEye,
  MinecraftStick,
  MinecraftString,
  MinecraftSugar,
  MinecraftTurtleHelmet,
  MinecraftTrident,
  MinecraftWheat,
}

const PACKAGE_BY_KEY = new Map(
  Object.entries(ITEMS).map(([name, Component]) => [name.slice('Minecraft'.length).toLowerCase(), Component]),
)

// Display names whose slug is not the Minecraft id (or whose id has no PNG).
const NAME_TO_ID = {
  'water bottle': 'glass_bottle',
  'awkward potion': 'potion',
  'bottle o enchanting': 'experience_bottle',
  "bottle o' enchanting": 'experience_bottle',
  'eye of ender': 'ender_eye',
  slimeball: 'slime_ball',
  'turtle shell': 'turtle_helmet',
  'netherite upgrade': 'netherite_upgrade_smithing_template',
}

// Explicit fallbacks for the handful of new/variant ids that blockrender.dev
// does not have a render for yet. They still use a real Minecraft asset.
const FAMILY = [
  [/^poplar_(.+)$/, m => `cherry_${m[1]}`],
  [/^stripped_poplar_(.+)$/, m => `stripped_cherry_${m[1]}`],
  [/^(.+)_concrete_(?:slab|stairs)$/, m => `${m[1]}_concrete`],
  [/^(.+)_wool_(?:slab|stairs)$/, m => `${m[1]}_wool`],
  [/^(.+)_cushion$/, m => `${m[1]}_wool`],
  [/^(?:waxed_)?(?:exposed_|weathered_|oxidized_)?copper_chest$/, () => 'chest'],
  [/^(?:waxed_)?(exposed_|weathered_|oxidized_)?copper_golem_statue$/, m => (m[1] ? `${m[1]}copper` : 'copper_block')],
  [/^straw_bed$/, () => 'white_bed'],
  [/^shelf_mushroom$/, () => 'brown_mushroom'],
  [/^(?:waxed_)?(?:exposed_|weathered_|oxidized_)?copper_door$/, () => 'copper_trapdoor'],
]

const VARIANT_SUFFIX = /_(?:slab|stairs|wall|fence|fence_gate|button|pressure_plate|door|trapdoor|sign|hanging_sign|shelf)$/

function slugify(value) {
  return String(value)
    .replace(/^minecraft:/, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function titleize(id) {
  return id
    .split('_')
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

function packageIcon(name) {
  if (!name) return null
  return PACKAGE_BY_KEY.get(name.toLowerCase().replace(/[^a-z0-9]/g, '')) || null
}

function fileFor(id) {
  if (FILES.has(id)) return id

  for (const [pattern, replacement] of FAMILY) {
    const match = id.match(pattern)
    if (match) {
      const candidate = replacement(match)
      if (FILES.has(candidate)) return candidate
    }
  }

  // generic variant fallback: black_concrete_slab -> black_concrete,
  // polished_blackstone_brick_slab -> polished_blackstone_brick -> polished_blackstone
  let base = id
  while (VARIANT_SUFFIX.test(base)) {
    base = base.replace(VARIANT_SUFFIX, '')
    if (FILES.has(base)) return base
    if (base.endsWith('_brick')) {
      const bricks = `${base}s`
      if (FILES.has(bricks)) return bricks
    }
  }
  return null
}

/**
 * Resolve a display name or Minecraft id to either a PNG icon or a package
 * component. Prefers the downloaded PNGs (consistent isometric blocks + real
 * item sprites), then the package, then a related vanilla asset.
 */
export function resolveItem(name) {
  if (!name) return null
  const raw = String(name).replace(/^minecraft:/, '')

  // Explicit icon paths such as potions/swiftness.png (used by the brewing data).
  const iconPath = raw.replace(/\.png$/i, '')
  if (iconPath.includes('/')) {
    return FILES.has(iconPath) ? { id: iconPath, file: iconPath, package: null } : null
  }

  const id = NAME_TO_ID[raw.toLowerCase()] || slugify(raw)
  const file = fileFor(id)
  const pkg = packageIcon(raw) || packageIcon(titleize(id))
  if (file) return { id, file, package: pkg }
  if (pkg) return { id, file: null, package: pkg }
  return null
}

function PngIcon({ file, id, size, className, style, alt, fallback }) {
  const [failed, setFailed] = useState(false)
  if (failed) return fallback
  return (
    <img
      src={`/icons/${file}.png`}
      alt={alt ?? titleize(id)}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        objectFit: 'contain',
        verticalAlign: 'middle',
        ...style,
      }}
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

/**
 * Renders the real Minecraft icon for an item/block name or id.
 * Unknown names fall back to a neutral '?' cube (or nothing with
 * fallback="none") so the UI never shows a broken image.
 */
export default function ItemIcon({ name, size = 28, className, style, alt, fallback = 'crate' }) {
  const resolved = resolveItem(name)
  const empty = fallback === 'none' ? null : <UnknownBlock size={size} className={className} style={style} />

  if (!resolved) return empty

  const PackageIcon = resolved.package
  if (resolved.file) {
    return (
      <PngIcon
        key={resolved.file}
        file={resolved.file}
        id={resolved.id}
        size={size}
        className={className}
        style={style}
        alt={alt}
        fallback={PackageIcon ? <PackageIcon size={size} className={className} style={style} alt={alt} /> : empty}
      />
    )
  }

  return <PackageIcon size={size} className={className} style={style} alt={alt} />
}
