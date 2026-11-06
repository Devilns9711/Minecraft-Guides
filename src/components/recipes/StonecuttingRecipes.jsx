import { useEffect, useMemo, useState } from 'react'
import ItemIcon from '../icons/ItemIcon'
import { EmptyState, LoadMore, StationBadge, formatCount, prettyId } from './RecipeUI'

const PAGE_SIZE = 20

export default function StonecuttingRecipes({ groups, query }) {
  const [limit, setLimit] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    if (!query) return groups
    const q = query.toLowerCase()
    return groups.filter(group =>
      group.label.toLowerCase().includes(q) ||
      group.input.includes(q) ||
      group.results.some(r => r.name.toLowerCase().includes(q) || r.id.includes(q)),
    )
  }, [groups, query])

  useEffect(() => setLimit(PAGE_SIZE), [query])

  const visible = filtered.slice(0, limit)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <span>{formatCount(filtered.length)} stonecutter inputs{query ? ` matching “${query}”` : ''}</span>
        <StationBadge>Stonecutter</StationBadge>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No stonecutting recipes found" hint="Try copper, deepslate, or a block name." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visible.map(group => (
            <article key={group.input} className="glass-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-mc-green/30 bg-mc-green/10">
                  <ItemIcon name={group.input} size={34} alt={group.label} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold text-white">{group.label}</h3>
                  <p className="text-xs text-gray-500">
                    {formatCount(group.results.length)} cut {group.results.length === 1 ? 'variant' : 'variants'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
                {group.results.map(result => (
                  <span
                    key={result.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-mc-darker/50 py-1 pl-1.5 pr-2.5 text-[11px] text-gray-200"
                  >
                    <ItemIcon name={result.id} size={16} alt={result.name} />
                    {result.name || prettyId(result.id)}
                    {result.count > 1 && <span className="text-mc-green-light">×{result.count}</span>}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <LoadMore shown={visible.length} total={filtered.length} onClick={() => setLimit(l => l + PAGE_SIZE)} />
    </div>
  )
}
