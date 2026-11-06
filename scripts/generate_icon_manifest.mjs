#!/usr/bin/env node
/** Regenerate src/data/iconManifest.json from public/icons (recursive). */
import { readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const iconsDir = join(root, 'public', 'icons')

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    if (!entry.name.endsWith('.png')) return []
    return [relative(iconsDir, full).replaceAll('\\', '/').replace(/\.png$/, '')]
  })
}

const icons = walk(iconsDir).sort()
writeFileSync(
  join(root, 'src', 'data', 'iconManifest.json'),
  JSON.stringify(icons, null, 0) + '\n',
)
console.log(`icon manifest: ${icons.length} icons`)
