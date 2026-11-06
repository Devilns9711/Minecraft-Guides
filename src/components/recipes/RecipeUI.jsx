import ItemIcon from '../icons/ItemIcon'

export function prettyId(id = '') {
  return id
    .replace(/^minecraft:/, '')
    .split('_')
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatCount(n) {
  return new Intl.NumberFormat('en-US').format(n)
}

const CATEGORY_STYLES = {
  building: 'bg-amber-400/10 border-amber-400/25 text-amber-200',
  equipment: 'bg-sky-400/10 border-sky-400/25 text-sky-200',
  food: 'bg-lime-400/10 border-lime-400/25 text-lime-200',
  redstone: 'bg-red-400/10 border-red-400/25 text-red-200',
  transportation: 'bg-violet-400/10 border-violet-400/25 text-violet-200',
  misc: 'bg-slate-400/10 border-slate-400/25 text-slate-200',
}

export function CategoryBadge({ category }) {
  if (!category) return null
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${CATEGORY_STYLES[category] || CATEGORY_STYLES.misc}`}>
      {category}
    </span>
  )
}

export function StationBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-mc-darker/60 px-2 py-0.5 text-[11px] text-gray-300">
      <ItemIcon name={children} size={13} fallback="none" />
      {children}
    </span>
  )
}

export function CraftingGrid({ grid, cell = 30, label = 'Crafting grid' }) {
  if (!grid?.length) return null
  const cols = Math.max(...grid.map(row => row.length))
  return (
    <div
      className="inline-grid shrink-0 gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)` }}
      role="img"
      aria-label={label}
    >
      {grid.flatMap((row, r) => [
        ...row.map((item, c) => (
          <div
            key={`${r}-${c}`}
            className={`crafting-grid-cell ${item ? 'filled' : ''}`}
            style={{ width: cell, height: cell }}
          >
            {item ? <ItemIcon name={item} size={Math.round(cell * 0.72)} alt={prettyId(item)} /> : null}
          </div>
        )),
        ...Array.from({ length: cols - row.length }, (_, i) => (
          <div key={`${r}-empty-${i}`} className="crafting-grid-cell" style={{ width: cell, height: cell }} />
        )),
      ])}
    </div>
  )
}

export function ResultTile({ id, quantity, cell = 46 }) {
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center rounded-lg border border-mc-green/30 bg-mc-green/10 p-1">
      <ItemIcon name={id} size={cell} alt={prettyId(id)} />
      {quantity > 1 && (
        <span className="absolute -bottom-1 -right-1 rounded bg-mc-green px-1 py-0.5 text-[10px] font-bold leading-none text-white shadow">
          {quantity}
        </span>
      )}
    </div>
  )
}

export function MaterialChip({ id, label, any: isTag }) {
  const cleanLabel = (label || prettyId(id)).replace(/\s*\(any\)\s*$/i, '')
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-mc-darker/50 py-1 pl-1.5 pr-2.5 text-[11px] text-gray-200">
      <ItemIcon name={id} size={15} fallback="none" />
      {cleanLabel}
      {isTag && <span className="text-[10px] text-mc-green-light">any</span>}
    </span>
  )
}

export function EmptyState({ title, hint }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-mc-darker/40 px-6 py-12 text-center">
      <p className="font-medium text-white">{title}</p>
      {hint && <p className="mt-1 text-sm text-gray-400">{hint}</p>}
    </div>
  )
}

export function LoadMore({ shown, total, onClick }) {
  if (shown >= total) return null
  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      <button
        type="button"
        onClick={onClick}
        className="rounded-xl border border-mc-green/40 bg-mc-green/15 px-6 py-2.5 text-sm font-medium text-mc-green-light transition hover:bg-mc-green/30"
      >
        Load more recipes
      </button>
      <span className="text-xs text-gray-500">Showing {formatCount(shown)} of {formatCount(total)}</span>
    </div>
  )
}
