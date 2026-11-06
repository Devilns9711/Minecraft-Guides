// SSR smoke test — renders every component to catch runtime errors, verifies
// the icon manifest is in sync with public/icons, and that every recipe/UI id
// resolves to a real icon (PNG or package fallback).
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { makePlan } from './src/lib/anvilPlan.js'
import {
  convertCoordinates,
  portalBuildCheck,
  portalSearchRadius,
  searchSquare,
} from './src/lib/portalMath.js'

// --- icon manifest / files --------------------------------------------------
const iconsDir = join(process.cwd(), 'public', 'icons')

function walkIcons(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) return walkIcons(join(dir, entry.name), rel)
    return entry.name.endsWith('.png') ? [rel.slice(0, -4)] : []
  })
}

const onDisk = new Set(walkIcons(iconsDir))
const manifest = new Set(
  JSON.parse(readFileSync(new URL('./src/data/iconManifest.json', import.meta.url), 'utf8')),
)
const unlisted = [...onDisk].filter(f => !manifest.has(f))
const stale = [...manifest].filter(f => !onDisk.has(f))
if (unlisted.length || stale.length) {
  console.error('ICON MANIFEST OUT OF DATE — run: node scripts/generate_icon_manifest.mjs')
  if (unlisted.length) console.error('  not in manifest:', unlisted.slice(0, 20).join(', '))
  if (stale.length) console.error('  missing files:', stale.slice(0, 20).join(', '))
  process.exit(1)
}
console.log(`OK   icon manifest (${manifest.size} icons, in sync)`)

// Legacy block icon refs in BlockIcons.jsx still need their files.
const blockSrc = readFileSync(new URL('./src/components/icons/BlockIcons.jsx', import.meta.url), 'utf8')
const blockRefs = [...blockSrc.matchAll(/block\('([^']+)'\)/g)].map(m => m[1])
const missingBlockIcons = blockRefs.filter(f => !existsSync(join(iconsDir, f)))
if (missingBlockIcons.length) {
  console.error('MISSING BLOCK ICON FILES:', missingBlockIcons.join(', '))
  process.exit(1)
}
console.log(`OK   block icon refs (${blockRefs.length}, all present)`)

// --- collect every id used by generated recipe data -------------------------
const dataFiles = ['craftingRecipes', 'stonecuttingRecipes', 'cookingRecipes', 'smithingRecipes', 'specialRecipes']
const ids = new Set()
const addId = value => {
  if (typeof value !== 'string' || !value || value.startsWith('#')) return
  ids.add(value.replace(/^minecraft:/, ''))
}
for (const name of dataFiles) {
  const list = JSON.parse(readFileSync(new URL(`./src/data/${name}.json`, import.meta.url), 'utf8'))
  for (const recipe of list) {
    addId(recipe.id)
    addId(recipe.input)
    addId(recipe.output)
    addId(recipe.template)
    addId(recipe.baseRep)
    addId(recipe.additionRep)
    addId(recipe.result)
    for (const row of recipe.grid || []) for (const cell of row) addId(cell)
    for (const m of recipe.materials || []) addId(m.id)
    for (const r of recipe.results || []) addId(r.id)
  }
}

// Potion icons are nested paths (potions/water.png), not ids.
const potionFile = JSON.parse(readFileSync(new URL('./src/data/potions.json', import.meta.url), 'utf8'))
for (const potion of potionFile.potions) {
  for (const path of [potion.icon, potion.splashIcon, potion.lingeringIcon]) {
    if (path) ids.add(path.replace(/\.png$/, ''))
  }
  for (const variant of potion.variants) {
    for (const path of [variant.icon, variant.splashIcon, variant.lingeringIcon]) {
      if (path) ids.add(path.replace(/\.png$/, ''))
    }
  }
}

// Names used directly by the UI chrome (headings, stat cards, nav, guide icons).
const uiNames = [
  'Crafting Table', 'Diamond Pickaxe', 'Diamond', 'Diamond Sword', 'Wheat', 'Book',
  'Enchanted Book', 'Brewing Stand', 'Emerald', 'Anvil', 'Experience Bottle', 'Redstone',
  'Shield', 'Compass', 'Clock', 'Trident', 'Bow', 'Crossbow', 'Fishing Rod', 'Water Bottle',
  'Awkward Potion', 'Splash Potion', 'Lingering Potion', 'Turtle Shell', 'Slimeball',
  'Eye of Ender', 'Netherite Upgrade', 'TNT', 'Potion', 'Netherrack', 'Obsidian',
  'Flint and Steel',
]

// --- enchantment planner data + optimal anvil plans -------------------------
const enchantData = JSON.parse(
  readFileSync(new URL('./src/data/enchantments.json', import.meta.url), 'utf8'),
)
const itemProfiles = JSON.parse(
  readFileSync(new URL('./src/data/enchantableItems.json', import.meta.url), 'utf8'),
).items

for (const item of itemProfiles) {
  if (!item.enchants?.length) throw new Error(`${item.name}: no enchantments`)
  if (new Set(item.enchants.map(e => e.id)).size !== item.enchants.length) {
    throw new Error(`${item.name}: duplicate enchantment`)
  }
  for (const enchant of item.enchants) {
    const def = enchantData.enchantments[enchant.id]
    if (!def) throw new Error(`${item.name}: unknown enchantment ${enchant.id}`)
    if (enchant.level < 1 || enchant.level > def.maxLevel) {
      throw new Error(`${item.name}: ${enchant.id} level ${enchant.level} out of range`)
    }
  }
  uiNames.push(item.icon)
}

for (const item of itemProfiles) {
  const plan = makePlan(item.enchants, enchantData.enchantments)
  if (!Number.isFinite(plan.totalXp) || plan.totalXp <= 0) {
    throw new Error(`${item.name}: planner produced no cost`)
  }
  if (plan.operations.length !== item.enchants.length) {
    throw new Error(`${item.name}: expected ${item.enchants.length} anvil uses, got ${plan.operations.length}`)
  }
  if (plan.totalXp !== plan.verifiedTotal) {
    throw new Error(`${item.name}: plan total ${plan.totalXp} != step sum ${plan.verifiedTotal}`)
  }
  if (plan.maxStepXp >= 40) {
    throw new Error(`${item.name}: step costs ${plan.maxStepXp}, over the survival cap`)
  }
}
// Budget armor sets: Thorns III is deliberately optional (see item notes).
// Keep these totals pinned so a data edit cannot silently make the displayed
// plan more expensive than the known minimum.
const budgetArmor = {
  boots: { base: 49, withThorns: 66 },
  leggings: { base: 28, withThorns: 44 },
  chestplate: { base: 13, withThorns: 28 },
  helmet: { base: 27, withThorns: 45 },
}
for (const [id, expected] of Object.entries(budgetArmor)) {
  const item = itemProfiles.find(candidate => candidate.id === id)
  const plan = makePlan(item.enchants, enchantData.enchantments)
  if (plan.totalXp !== expected.base) {
    throw new Error(`${id} planner regression: expected ${expected.base} XP, got ${plan.totalXp}`)
  }
  const thornsPlan = makePlan(
    [...item.enchants, { id: 'thorns', level: 3 }],
    enchantData.enchantments,
  )
  if (thornsPlan.totalXp !== expected.withThorns) {
    throw new Error(`${id} + Thorns III: expected ${expected.withThorns} XP, got ${thornsPlan.totalXp}`)
  }
}
console.log(
  `OK   anvil plans (${itemProfiles.length} items, armor budget = ${Object.values(budgetArmor).map(v => v.base).join('/')} XP)`,
)

// --- portal coordinate math -------------------------------------------------
const portalCases = [
  { source: 'overworld', coords: { x: 1000, y: 64, z: -500 }, target: { x: 125, y: 64, z: -63 } },
  { source: 'overworld', coords: { x: -239, y: 70, z: 29 }, target: { x: -30, y: 70, z: 3 } },
  { source: 'nether', coords: { x: 125, y: 64, z: -300 }, target: { x: 1000, y: 64, z: -2400 } },
  { source: 'nether', coords: { x: -30, y: 70, z: 3 }, target: { x: -240, y: 70, z: 24 } },
]
for (const test of portalCases) {
  const converted = convertCoordinates(test.coords, test.source)
  for (const axis of ['x', 'y', 'z']) {
    if (converted.target[axis] !== test.target[axis]) {
      throw new Error(
        `portal conversion ${test.source} ${axis}: expected ${test.target[axis]}, got ${converted.target[axis]}`,
      )
    }
  }
}
const clamped = convertCoordinates({ x: 3_750_000, y: 64, z: -3_750_000 }, 'nether')
if (clamped.target.x !== 29_999_983 || clamped.target.z !== -29_999_984 || !clamped.clamped) {
  throw new Error(`portal world-border clamp failed: ${JSON.stringify(clamped.target)}`)
}
if (
  portalSearchRadius('nether', 'java') !== 16 ||
  portalSearchRadius('overworld', 'java') !== 128 ||
  portalSearchRadius('nether', 'bedrock') !== 128
) {
  throw new Error('portal search radius table is wrong')
}
const netherSquare = searchSquare({ x: 0, z: 0 }, 'nether', 'java')
if (netherSquare.minX !== -16 || netherSquare.maxX !== 16 || netherSquare.minZ !== -16 || netherSquare.maxZ !== 16) {
  throw new Error('portal search square is wrong')
}
const builds = [
  ['nether', 'java', 251, true],
  ['nether', 'java', 252, false],
  ['nether', 'bedrock', 123, true],
  ['nether', 'bedrock', 124, false],
  ['overworld', 'java', 315, true],
  ['overworld', 'java', 316, false],
  ['overworld', 'java', -64, true],
  ['overworld', 'java', -65, false],
]
for (const [dimension, edition, y, expected] of builds) {
  const check = portalBuildCheck(dimension, edition, y)
  if (check.ok !== expected) {
    throw new Error(`portal build check ${dimension}/${edition} Y=${y}: expected ${expected}, got ${check.ok}`)
  }
}
console.log('OK   portal math (8:1 conversion, floor, border clamp, search ranges, frame heights)')

// --- component render check -------------------------------------------------
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  ssr: { noExternal: ['minecraft-items-react'] },
})

async function render(path, label) {
  const mod = await server.ssrLoadModule(path)
  const Comp = mod.default
  const html = renderToString(React.createElement(Comp))
  console.log(`OK   ${label} (${html.length} chars)`)
  return html
}

try {
  const { resolveItem } = await server.ssrLoadModule('/src/components/icons/ItemIcon.jsx')
  const unresolved = [...ids, ...uiNames].filter(name => !resolveItem(name))
  if (unresolved.length) {
    throw new Error(`unresolved icons (${unresolved.length}): ${unresolved.join(', ')}`)
  }
  console.log(`OK   icon resolver (${ids.size} recipe ids + ${uiNames.length} UI names)`)

  await render('/src/App.jsx', 'App')
  const craftingHtml = await render('/src/components/CraftingGuide.jsx', 'CraftingGuide')
  if (
    !craftingHtml.includes('Recipe Browser') ||
    !craftingHtml.includes('1,243') ||
    !craftingHtml.includes('1,478')
  ) {
    throw new Error('CraftingGuide did not render the recipe browser header/counts')
  }
  const brewingHtml = await render('/src/components/BrewingGuide.jsx', 'BrewingGuide')
  if (
    !brewingHtml.includes('Brewing Guide') ||
    !brewingHtml.includes('Potion of Swiftness') ||
    !brewingHtml.includes('/icons/potions/water.png')
  ) {
    throw new Error('BrewingGuide did not render the potion data/icons')
  }
  const enchantHtml = await render('/src/components/EnchantmentGuide.jsx', 'EnchantmentGuide')
  if (
    !enchantHtml.includes('Enchantment Planner') ||
    !enchantHtml.includes('Anvil recipe') ||
    !enchantHtml.includes('Diamond Sword')
  ) {
    throw new Error('EnchantmentGuide did not render the item-first planner')
  }
  const villagerHtml = await render('/src/components/VillagerTrades.jsx', 'VillagerTrades')
  if (!villagerHtml.includes('/icons/')) {
    throw new Error('VillagerTrades rendered no real block icons')
  }
  const portalHtml = await render('/src/components/PortalCalculator.jsx', 'PortalCalculator')
  if (
    !portalHtml.includes('Portal Calculator') ||
    !portalHtml.includes('Ideal target') ||
    !portalHtml.includes('8:1 horizontal scale')
  ) {
    throw new Error('PortalCalculator did not render the coordinate calculator')
  }
  await render('/src/components/ToolModal.jsx', 'ToolModal (no tool prop)')
  console.log('ALL RENDERED OK')
} catch (err) {
  console.error('SMOKE TEST FAILED:', err)
  process.exitCode = 1
} finally {
  await server.close()
}
