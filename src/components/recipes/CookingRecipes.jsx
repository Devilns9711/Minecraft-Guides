import { useEffect, useMemo, useState } from 'react'
import ItemIcon from '../icons/ItemIcon'
import { EmptyState, LoadMore, StationBadge, formatCount, prettyId } from './RecipeUI'

const PAGE_SIZE = 24
const STATIONS = ['All', 'Furnace', 'Blast Furnace', 'Smoker', 'Campfire']

function matches(recipe, query) {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    recipe.inputLabel.toLowerCase().includes(q) ||
    recipe.outputLabel.toLowerCase().includes(q) ||
    recipe.input.includes(q) ||
    recipe.output.includes(q) ||
    recipe.station.toLowerCase().includes(q)
  )
}

export default function CookingRecipes({ recipes, query }) {
  const [station, setStation] = useState('All')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const filtered = useMemo(
    () => recipes.filter(r => (station === 'All' || r.station === station) && matches(r, query)),
    [recipes, station, query],
  )

  useEffect(() => setLimit(PAGE_SIZE), [station, query])

  const visible = filtered.slice(0, limit)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATIONS.map(s => {
          const count = s === 'All' ? recipes.length : recipes.filter(r => r.station === s).length
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStation(s)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                station === s
                  ? 'border-mc-green bg-mc-green/25 text-mc-green-light'
                  : 'border-white/10 text-gray-400 hover:border-mc-green/50 hover:text-white'
              }`}
            >
              {s} <span className="opacity-60">{formatCount(count)}</span>
            </button>
          )
        })}
      </div>

      <div className="mb-3 text-xs text-gray-500">
        {formatCount(filtered.length)} cooking recipes{query ? ` matching “${query}”` : ''}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No cooking recipes found" hint="Try an item name or a station." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((recipe, index) => (
            <article key={`${recipe.input}-${recipe.output}-${index}`} className="glass-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-mc-darker/60">
                  <ItemIcon name={recipe.input} size={30} alt={recipe.inputLabel} />
                </span>
                <span className="text-lg text-mc-green-light">➜</span>
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-mc-green/30 bg-mc-green/10">
                  <ItemIcon name={recipe.output} size={34} alt={recipe.outputLabel} />
                  {recipe.count > 1 && (
                    <span className="absolute -bottom-1 -right-1 rounded bg-mc-green px-1 py-0.5 text-[10px] font-bold leading-none text-white">
                      {recipe.count}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-white">
                    {recipe.outputLabel || prettyId(recipe.output)}
                  </h3>
                  <p className="truncate text-[11px] text-gray-400">from {recipe.inputLabel}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3 text-[11px] text-gray-400">
                <StationBadge>{recipe.station}</StationBadge>
                <span className="rounded-full border border-white/10 bg-mc-darker/50 px-2 py-0.5">
                  {recipe.time.toFixed(1)}s
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-mc-darker/50 px-2 py-0.5">
                  <ItemIcon name="Experience Bottle" size={12} />
                  {recipe.xp} XP
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <LoadMore shown={visible.length} total={filtered.length} onClick={() => setLimit(l => l + PAGE_SIZE)} />
    </div>
  )
}
