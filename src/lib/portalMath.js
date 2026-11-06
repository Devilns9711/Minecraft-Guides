// Nether portal coordinate math.
//
// Minecraft scales X and Z by 8 between the Overworld and the Nether, keeps Y
// unchanged, and floors the result when entering the Nether. The destination
// is also clamped to the world border. See the Minecraft Wiki:
// https://minecraft.wiki/w/Nether_Portal#Coordinate_conversion

export const WORLD_BORDER = Object.freeze({
  min: -29_999_984,
  max: 29_999_983,
})

export const DIMENSIONS = Object.freeze({
  overworld: {
    id: 'overworld',
    name: 'Overworld',
    icon: 'Compass',
    accent: 'text-mc-green-light',
    border: 'border-mc-green/40',
    background: 'bg-mc-green/10',
  },
  nether: {
    id: 'nether',
    name: 'Nether',
    icon: 'Netherrack',
    accent: 'text-red-300',
    border: 'border-red-400/30',
    background: 'bg-red-500/10',
  },
})

export const EDITIONS = Object.freeze({
  java: {
    id: 'java',
    name: 'Java Edition',
    searchRadius: { overworld: 128, nether: 16 },
  },
  bedrock: {
    id: 'bedrock',
    name: 'Bedrock Edition',
    // Bedrock uses the wide Overworld radius in both dimensions.
    searchRadius: { overworld: 128, nether: 128 },
  },
})

export const BUILD_LIMITS = Object.freeze({
  overworld: {
    java: { min: -64, max: 319 },
    bedrock: { min: -64, max: 319 },
  },
  nether: {
    java: { min: 0, max: 255 },
    bedrock: { min: 0, max: 127 },
  },
})

export const PORTAL_FRAME = Object.freeze({
  outerWidth: 4,
  outerHeight: 5,
  interiorWidth: 2,
  interiorHeight: 3,
  obsidianWithoutCorners: 10,
  obsidianWithCorners: 14,
})

export function isFiniteCoordinate(value) {
  return Number.isFinite(value)
}

export function withinWorldBorder(value) {
  return value >= WORLD_BORDER.min && value <= WORLD_BORDER.max
}

export function clampWorldBorder(value) {
  return Math.min(WORLD_BORDER.max, Math.max(WORLD_BORDER.min, Math.floor(value)))
}

/** Overworld X/Z -> Nether X/Z. Rounds toward negative infinity. */
export function overworldToNether(value) {
  return Math.floor(value / 8)
}

/** Nether X/Z -> Overworld X/Z. Integer input stays exact. */
export function netherToOverworld(value) {
  return Math.floor(value * 8)
}

export function otherDimension(dimension) {
  return dimension === 'overworld' ? 'nether' : 'overworld'
}

/**
 * Convert a source block position to the matching position in the other
 * dimension. `x`, `y`, `z` must be finite numbers; the UI validates integer
 * input before calling this.
 */
export function convertCoordinates({ x, y, z }, sourceDimension) {
  if (!DIMENSIONS[sourceDimension]) {
    throw new Error(`Unknown dimension: ${sourceDimension}`)
  }

  const destinationDimension = otherDimension(sourceDimension)
  const rawX =
    sourceDimension === 'overworld' ? overworldToNether(x) : netherToOverworld(x)
  const rawZ =
    sourceDimension === 'overworld' ? overworldToNether(z) : netherToOverworld(z)
  const targetX = clampWorldBorder(rawX)
  const targetZ = clampWorldBorder(rawZ)

  return {
    sourceDimension,
    destinationDimension,
    source: { x, y: Math.floor(y), z },
    target: { x: targetX, y: Math.floor(y), z: targetZ },
    rawTarget: { x: rawX, y: Math.floor(y), z: rawZ },
    clamped: targetX !== rawX || targetZ !== rawZ,
    sourceOutsideBorder: !withinWorldBorder(x) || !withinWorldBorder(z),
  }
}

export function portalSearchRadius(destinationDimension, edition = 'java') {
  const config = EDITIONS[edition]
  if (!config) throw new Error(`Unknown edition: ${edition}`)
  return config.searchRadius[destinationDimension]
}

/**
 * The portal search is a horizontal square, so the radius applies to both X
 * and Z. The full height of the destination dimension is searched.
 */
export function searchSquare(center, destinationDimension, edition = 'java') {
  const radius = portalSearchRadius(destinationDimension, edition)
  return {
    radius,
    minX: center.x - radius,
    maxX: center.x + radius,
    minZ: center.z - radius,
    maxZ: center.z + radius,
    size: radius * 2,
  }
}

/**
 * Portal frame check. `y` is the bottom frame block, so the top frame is at
 * y + 4. The source Y is never scaled, but the destination dimension's build
 * limit still applies.
 */
export function portalBuildCheck(destinationDimension, edition, y) {
  const limits = BUILD_LIMITS[destinationDimension]?.[edition]
  if (!limits) throw new Error(`Unknown destination: ${destinationDimension}/${edition}`)

  const maxBaseY = limits.max - (PORTAL_FRAME.outerHeight - 1)
  const frameTop = y + (PORTAL_FRAME.outerHeight - 1)
  const ok = Number.isFinite(y) && y >= limits.min && y <= maxBaseY

  return {
    ok,
    y,
    minY: limits.min,
    maxY: maxBaseY,
    buildMinY: limits.min,
    buildMaxY: limits.max,
    frameTop,
    reason: ok
      ? null
      : y < limits.min
        ? `The bottom frame would be below the build limit (Y ${limits.min}).`
        : `The 5-block-tall frame would pass the build limit (top at Y ${limits.max}).`,
  }
}
