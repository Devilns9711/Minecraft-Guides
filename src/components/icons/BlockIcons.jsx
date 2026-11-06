import { useState } from 'react'

/*
 * Real Minecraft block icons (isometric renders of the actual game textures).
 *
 * Sources:
 *  - /public/icons/*.png downloaded from blockrender.dev (official client
 *    block models, rendered with the game's own face shading)
 *  - chest.png / shield.png: the exact in-game inventory sprites
 *
 * Every icon renders into a square `size × size` slot with object-fit:
 * contain (like an inventory slot), so tall items (Shield) and wide items
 * letterbox correctly and nothing looks stretched.
 *
 * All components accept { size, className, style, alt }.
 * If an image fails to load, a neutral '?' cube fallback is shown so the UI
 * never renders a broken image.
 */

const TOP = 'M32 6 L56 20 L32 34 L8 20 Z'
const LEFT = 'M8 20 L32 34 L32 56 L8 42 Z'
const RIGHT = 'M56 20 L32 34 L32 56 L56 42 Z'

function BlockImage({ file, size = 32, className, style, alt = '' }) {
  const [failed, setFailed] = useState(false)

  if (failed) return <UnknownBlock size={size} className={className} style={style} />

  return (
    <img
      src={`/icons/${file}`}
      alt={alt}
      aria-hidden={alt ? undefined : 'true'}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        objectFit: 'contain',
        ...style,
      }}
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

// factory: every block icon is the same image component bound to its file
const block = file => {
  function BlockIcon({ size, className, style, alt }) {
    return <BlockImage file={file} size={size} className={className} style={style} alt={alt} />
  }
  BlockIcon.displayName = `Block(${file})`
  return BlockIcon
}

// ---- core building blocks (used in recipes / tools / hero) ----------------
export const OakPlanks = block('oak_planks.png')
export const Cobblestone = block('cobblestone.png')
export const Stone = block('stone.png')
export const Sand = block('sand.png')
export const Glass = block('glass.png')
export const Obsidian = block('obsidian.png')
export const IronBlock = block('iron_block.png')
export const CraftingTable = block('crafting_table.png')
export const Furnace = block('furnace.png')
export const Chest = block('chest.png')
export const Torch = block('torch.png')
export const Tnt = block('tnt.png')
export const Anvil = block('anvil.png')
export const Bookshelf = block('bookshelf.png')
export const Shield = block('shield.png')
export const WoodenPressurePlate = block('wooden_pressure_plate.png')
export const StonePressurePlate = block('stone_pressure_plate.png')

// ---- villager workstation blocks -----------------------------------------
export const BlastFurnace = block('blast_furnace.png')
export const Smoker = block('smoker.png')
export const CartographyTable = block('cartography_table.png')
export const Composter = block('composter.png')
export const Barrel = block('barrel.png')
export const FletchingTable = block('fletching_table.png')
export const Cauldron = block('cauldron.png')
export const Lectern = block('lectern.png')
export const Stonecutter = block('stonecutter.png')
export const Loom = block('loom.png')
export const SmithingTable = block('smithing_table.png')
export const Grindstone = block('grindstone.png')

// ---- fallback (only shown if an icon file is missing) ----------------------
export function UnknownBlock({ size = 32, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d={TOP} fill="#6f6f78" />
      <path d={LEFT} fill="#54545c" />
      <path d={RIGHT} fill="#616169" />
      <path d={TOP} fill="none" stroke="rgba(0,0,0,0.45)" />
      <path d={LEFT} fill="none" stroke="rgba(0,0,0,0.45)" />
      <path d={RIGHT} fill="none" stroke="rgba(0,0,0,0.45)" />
      <text
        x="44"
        y="45"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="rgba(255,255,255,0.85)"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        ?
      </text>
    </svg>
  )
}
