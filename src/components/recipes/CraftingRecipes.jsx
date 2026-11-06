import { useEffect, useMemo, useState } from 'react'
import {
  CategoryBadge,
  CraftingGrid,
  EmptyState,
  LoadMore,
  MaterialChip,
  ResultTile,
  StationBadge,
  formatCount,
} from './RecipeUI'

const CATEGORIES = ['all', 'building', 'equipment', 'food', 'redstone', 'transportation', 'misc']
const STATIONS = ['all', 'Crafting Table', 'Inventory 2×2']
const PAGE_SIZE = 24

function matches(recipe, query) {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    recipe.name.toLowerCase().includes(q) ||
    (recipe.id || '').includes(q) ||
    recipe.station.toLowerCase().includes(q) ||
    recipe.category.toLowerCase().includes(q) ||
    recipe.materials.some(m => m.label.toLowerCase().includes(q) || m.id.includes(q)) ||
    recipe.grid.some(row => row.some(cell => cell && cell.includes(q)))
  )
}

export default function CraftingRecipes({ recipes, query }) {
  const [category, setCategory] = useState('all')
  const [station, setStation] = useState('all')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const filtered = useMemo(
    () => recipes.filter(r =>
      (category === 'all' || r.category === category) &&
      (station === 'all' || r.station === station) &&
      matches(r, query),
    ),
    [recipes, category, station, query],
  )

  useEffect(() => {
    setLimit(PAGE_SIZE)
  }, [category, station, query])

  const visible = filtered.slice(0, limit)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATEGORIES.map(c => {
          const count = c === 'all' ? recipes.length : recipes.filter(r => r.category === c).length
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                category === c
                  ? 'border-mc-green bg-mc-green/25 text-mc-green-light'
                  : 'border-white/10 text-gray-400 hover:border-mc-green/50 hover:text-white'
              }`}
            >
              {c === 'all' ? 'All' : c} <span className="opacity-60">{formatCount(count)}</span>
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span className="uppercase tracking-wide text-gray-500">Station</span>
        {STATIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStation(s)}
            className={`rounded-full border px-3 py-1 transition ${
              station === s
                ? 'border-mc-green/60 bg-mc-green/15 text-white'
                : 'border-white/10 hover:border-white/25'
            }`}
          >
            {s === 'all' ? 'Any station' : s}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <span>{formatCount(filtered.length)} recipes{query ? ` matching “${query}”` : ''}</span>
        {(category !== 'all' || station !== 'all' || query) && (
          <button
            type="button"
            onClick={() => {
              setCategory('all')
              setStation('all')
              setLimit(PAGE_SIZE)
            }}
            className="text-mc-green-light hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No crafting recipes found" hint="Try a different name or ingredient." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((recipe, index) => (
            <article key={`${recipe.id || recipe.name}-${index}`} className="glass-card flex flex-col p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-base font-bold leading-tight text-white">{recipe.name}</h3>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <CategoryBadge category={recipe.category} />
                  <StationBadge>{recipe.station}</StationBadge>
                </div>
              </div>

              <div className="flex flex-1 items-center gap-3">
                <CraftingGrid grid={recipe.grid} label={`${recipe.name} crafting grid`} />
                <span className="text-lg text-mc-green-light">➜</span>
                <ResultTile id={recipe.id || recipe.name} quantity={recipe.quantity} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
                {recipe.materials.map(m => (
                  <MaterialChip key={`${m.id}-${m.label}`} id={m.id} label={m.label} any={m.any} />
                ))}
              </div>

              {recipe.note && <p className="mt-2 text-[11px] leading-snug text-gray-500">{recipe.note}</p>}
            </article>
          ))}
        </div>
      )}

      <LoadMore shown={visible.length} total={filtered.length} onClick={() => setLimit(l => l + PAGE_SIZE)} />
    </div>
  )
}
