#!/usr/bin/env node
/**
 * download_missing_icons.mjs - fill every recipe icon gap with a real PNG.
 *
 * Scans the generated recipe data for item/block ids that do not yet have a
 * file in public/icons, then downloads each one from blockrender.dev. Blocks
 * are tried as isometric block renders first, items as flat sprites first.
 *
 * Usage: node scripts/download_missing_icons.mjs [--dry]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const ICONS = join(ROOT, 'public', 'icons')
const CACHE = join(ROOT, 'scripts', 'cache')
const DRY = process.argv.includes('--dry')
const CONCURRENCY = 8

mkdirSync(ICONS, { recursive: true })

const have = new Set(readdirSync(ICONS).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)))
const blocks = new Set(JSON.parse(readFileSync(join(CACHE, 'registry_block.json'), 'utf8')))

const used = new Set()
const add = v => {
  if (typeof v !== 'string' || !v) return
  used.add(v.replace(/^minecraft:/, ''))
}

const dataFiles = ['craftingRecipes', 'stonecuttingRecipes', 'cookingRecipes', 'smithingRecipes', 'specialRecipes']
for (const name of dataFiles) {
  const list = JSON.parse(readFileSync(join(ROOT, 'src', 'data', `${name}.json`), 'utf8'))
  for (const recipe of list) {
    add(recipe.id)
    add(recipe.input)
    add(recipe.output)
    add(recipe.template)
    add(recipe.baseRep)
    add(recipe.additionRep)
    add(recipe.result)
    for (const row of recipe.grid || []) for (const cell of row) add(cell)
    for (const m of recipe.materials || []) add(m.id)
    for (const r of recipe.results || []) add(r.id)
  }
}

// names used by the UI chrome (hero, headings, stat cards)
for (const name of ['Crafting Table', 'Diamond Pickaxe', 'Diamond', 'Diamond Sword', 'Wheat',
  'Book', 'Enchanted Book', 'Brewing Stand', 'Emerald', 'Anvil', 'Experience Bottle', 'Redstone']) {
  add(name.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
}

const todo = [...used].filter(id => !have.has(id))
console.log(`ids used: ${used.size} | already have: ${used.size - todo.length} | missing: ${todo.length}`)
if (DRY) {
  console.log(todo.slice(0, 80).join(', '))
  process.exit(0)
}

async function fetchPng(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 minecraft-guides icon-fetch' } })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length > 100 && buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' ? buf : null
  } catch {
    return null
  }
}

async function one(id) {
  const order = blocks.has(id) ? ['block', 'item'] : ['item', 'block']
  for (const kind of order) {
    const buf = await fetchPng(`https://blockrender.dev/render/${kind}/${id}.png?size=192`)
    if (buf) {
      writeFileSync(join(ICONS, `${id}.png`), buf)
      return { id, ok: true, kind }
    }
  }
  return { id, ok: false }
}

const failures = []
let done = 0
let ok = 0
const queue = [...todo]
const started = Date.now()

async function worker() {
  while (queue.length) {
    const id = queue.shift()
    const result = await one(id)
    done++
    if (result.ok) ok++
    else failures.push(id)
    if (done % 50 === 0 || done === todo.length) {
      console.log(`  ${done}/${todo.length}  ok=${ok} fail=${failures.length}  ${Math.round((Date.now() - started) / 1000)}s`)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))
writeFileSync(join(CACHE, 'icon_failures_download.json'), JSON.stringify(failures, null, 1))
console.log(`DONE: downloaded ${ok}, failed ${failures.length}`)
if (failures.length) console.log('failed:', failures.join(', '))
