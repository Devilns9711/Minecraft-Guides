import { useEffect, useMemo, useState } from 'react'
import ItemIcon from '../icons/ItemIcon'
import { EmptyState, formatCount, prettyId } from './RecipeUI'

const FILTERS = ['All', 'Transformations', 'Armor Trims']

function labelFor(raw, rep) {
  if (raw?.startsWith('#')) {
    const leaf = raw.split(/[./:]/).filter(Boolean).pop()?.replace(/_/g, ' ') || 'item'
    return `Any ${leaf}`
  }
  return prettyId(rep || raw)
}

function SmithingStep({ id, label, highlight = false }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg border ${highlight ? 'border-mc-green/40 bg-mc-green/10' : 'border-white/10 bg-mc-darker/60'}`}>
        <ItemIcon name={id} size={30} alt={label} fallback="none" />
      </span>
      <span className="line-clamp-2 text-[10px] leading-tight text-gray-400" title={label}>{label}</span>
    </div>
  )
}

export default function SmithingRecipes({ recipes, query }) {
  const [filter, setFilter] = useState('All')
  const [limit, setLimit] = useState(30)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return recipes.filter(recipe => {
      if (filter === 'Transformations' && recipe.kind !== 'transform') return false
      if (filter === 'Armor Trims' && recipe.kind !== 'trim') return false
      if (!q) return true
      return (
        recipe.name.toLowerCase().includes(q) ||
        (recipe.result || '').includes(q) ||
        recipe.template.includes(q) ||
        recipe.baseRep.includes(q) ||
        recipe.additionRep.includes(q)
      )
    })
  }, [recipes, filter, query])

  useEffect(() => setLimit(30), [filter, query])

  const visible = filtered.slice(0, limit)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map(f => {
          const count = f === 'All'
            ? recipes.length
            : recipes.filter(r => (f === 'Transformations' ? r.kind === 'transform' : r.kind === 'trim')).length
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                filter === f
                  ? 'border-mc-green bg-mc-green/25 text-mc-green-light'
                  : 'border-white/10 text-gray-400 hover:border-mc-green/50 hover:text-white'
              }`}
            >
              {f} <span className="opacity-60">{formatCount(count)}</span>
            </button>
          )
        })}
      </div>

      <p className="mb-3 text-xs text-gray-500">
        {formatCount(filtered.length)} smithing recipes{query ? ` matching “${query}”` : ''}
      </p>

      {filtered.length === 0 ? (
        <EmptyState title="No smithing recipes found" hint="Try netherite, a trim name, or an armor piece." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visible.map((recipe, index) => {
            const result = recipe.kind === 'transform' ? recipe.result : recipe.baseRep
            return (
              <article key={`${recipe.name}-${index}`} className="glass-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-bold text-white">{recipe.name}</h3>
                  <span className="rounded-full border border-white/10 bg-mc-darker/50 px-2 py-0.5 text-[11px] text-gray-400">
                    {recipe.kind === 'trim' ? 'Armor trim' : 'Transformation'}
                  </span>
                </div>

                <div className="flex items-start gap-1.5">
                  <SmithingStep
                    id={recipe.template}
                    label={prettyId(recipe.template).replace(' Smithing Template', '')}
                  />
                  <span className="mt-3 shrink-0 text-xs text-gray-600">+</span>
                  <SmithingStep
                    id={recipe.baseRep}
                    label={recipe.kind === 'trim' ? 'Any armor' : prettyId(recipe.baseRep)}
                  />
                  <span className="mt-3 shrink-0 text-xs text-gray-600">+</span>
                  <SmithingStep
                    id={recipe.additionRep}
                    label={labelFor(recipe.addition, recipe.additionRep)}
                  />
                  <span className="mt-3 shrink-0 text-mc-green-light">➜</span>
                  <SmithingStep
                    id={result}
                    label={recipe.kind === 'trim' ? 'Trimmed armor' : prettyId(recipe.result)}
                    highlight
                  />
                </div>

                {recipe.kind === 'trim' && (
                  <p className="mt-3 border-t border-white/5 pt-2 text-[11px] text-gray-500">
                    Combine the template, any trimmable armor piece and a trim material at a smithing table.
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}

      {visible.length < filtered.length && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setLimit(l => l + 30)}
            className="rounded-xl border border-mc-green/40 bg-mc-green/15 px-6 py-2.5 text-sm font-medium text-mc-green-light transition hover:bg-mc-green/30"
          >
            Load more recipes
          </button>
          <span className="text-xs text-gray-500">Showing {formatCount(visible.length)} of {formatCount(filtered.length)}</span>
        </div>
      )}
    </div>
  )
}
