import { useMemo } from 'react'
import {
  CraftingGrid,
  EmptyState,
  MaterialChip,
  formatCount,
} from './RecipeUI'

export default function SpecialRecipes({ recipes, query }) {
  const filtered = useMemo(() => {
    if (!query) return recipes
    const q = query.toLowerCase()
    return recipes.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.note || '').toLowerCase().includes(q) ||
      r.materials.some(m => m.label.toLowerCase().includes(q) || m.id.includes(q)),
    )
  }, [recipes, query])

  return (
    <div>
      <p className="mb-3 text-xs text-gray-500">
        {formatCount(filtered.length)} special recipes{query ? ` matching “${query}”` : ''} · handled by the game itself
      </p>

      {filtered.length === 0 ? (
        <EmptyState title="No special recipes found" hint="Try banners, fireworks, maps, or repair." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map(recipe => (
            <article key={recipe.kind} className="glass-card p-4">
              <h3 className="font-bold text-white">{recipe.name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">{recipe.note}</p>

              {recipe.grid && (
                <div className="mt-3">
                  <CraftingGrid grid={recipe.grid} label={`${recipe.name} layout`} />
                </div>
              )}

              {recipe.materials.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
                  {recipe.materials.map(m => (
                    <MaterialChip key={`${m.id}-${m.label}`} id={m.id} label={m.label} any={m.any} />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
