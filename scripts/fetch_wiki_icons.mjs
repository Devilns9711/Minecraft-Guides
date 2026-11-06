#!/usr/bin/env node
/**
 * Fetch the handful of icon sprites blockrender.dev does not serve (banners,
 * shulker boxes, etc.) from the Minecraft Wiki. The CDN returns WebP, so each
 * image is converted to a real PNG with ffmpeg.
 */
import { writeFileSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const COLORS = ['White', 'Orange', 'Magenta', 'Light Blue', 'Yellow', 'Lime', 'Pink', 'Gray',
  'Light Gray', 'Cyan', 'Purple', 'Blue', 'Brown', 'Green', 'Red', 'Black']
const EXTRA = {
  conduit: 'File:Conduit.png',
  ender_chest: 'File:Ender Chest.png',
  wither_skeleton_skull: 'File:Wither Skeleton Skull (item) JE2.png',
  creeper_head: 'File:Creeper Head (item) JE2.png',
  decorated_pot: 'File:Decorated Pot (S) JE2.png',
  trapped_chest: 'File:Trapped Chest (S) JE1 BE1.png',
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Referer: 'https://minecraft.wiki/',
}

async function retry(fn, tries = 4) {
  let last
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (err) {
      last = err
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw last
}

async function imageUrl(title) {
  return retry(async () => {
    const api = 'https://minecraft.fandom.com/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=' + encodeURIComponent(title)
    const res = await fetch(api, { headers: HEADERS })
    const json = await res.json()
    const page = Object.values(json.query?.pages || {})[0]
    return page?.imageinfo?.[0]?.url
  })
}

async function download(id, title) {
  const webp = join(process.env.TEMP, `mc-icon-${id}.webp`)
  const png = join(process.cwd(), 'public', 'icons', `${id}.png`)
  try {
    const url = await imageUrl(title)
    if (!url) return `${id}: no image`
    const buf = await retry(async () => {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const b = Buffer.from(await res.arrayBuffer())
      if (b.subarray(0, 4).toString() !== 'RIFF') throw new Error('not WebP')
      return b
    })
    writeFileSync(webp, buf)
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webp, png])
    unlinkSync(webp)
    return `${id}: ${await import('node:fs').then(fs => fs.statSync(png).size)} bytes`
  } catch (err) {
    return `${id}: FAILED ${err.message}`
  }
}

const jobs = []
for (const color of COLORS) {
  const prefix = color.toLowerCase().replace(/ /g, '_')
  jobs.push(download(`${prefix}_banner`, `File:${color} Banner.png`))
  jobs.push(download(`${prefix}_shulker_box`, `File:${color} Shulker Box.png`))
}
for (const [id, title] of Object.entries(EXTRA)) jobs.push(download(id, title))

for (const result of await Promise.all(jobs)) console.log(result)
