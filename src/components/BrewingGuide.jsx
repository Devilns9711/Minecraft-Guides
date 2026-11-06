import { useMemo, useState } from 'react'
import potionData from '../data/potions.json'
import ItemIcon from './icons/ItemIcon'
import { EmptyState, prettyId } from './recipes/RecipeUI'

const potions = potionData.potions
const byId = new Map(potions.map(potion => [potion.id, potion]))

const CATEGORIES = ['all', 'base', 'positive', 'negative', 'mixed', 'special']

const CATEGORY_LABELS = {
  all: 'All',
  base: 'Base',
  positive: 'Positive',
  negative: 'Negative',
  mixed: 'Mixed',
  special: 'Special',
}

const CATEGORY_STYLES = {
  base: 'border-slate-400/30 bg-slate-400/10 text-slate-300',
  positive: 'border-lime-400/30 bg-lime-400/10 text-lime-300',
  negative: 'border-red-400/30 bg-red-400/10 text-red-300',
  mixed: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  special: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
}

function potionName(id) {
  return byId.get(id)?.shortName || byId.get(id)?.name || prettyId(id)
}

function potionIcon(id) {
  return byId.get(id)?.icon || 'Potion'
}

function BrewPath({ potion }) {
  if (!potion.path.length) {
    return (
      <p className="rounded-lg border border-dashed border-white/10 bg-mc-darker/40 px-3 py-2 text-xs text-gray-500">
        This potion cannot be brewed in survival.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {potion.path.map((step, index) => {
        const target = byId.get(step.potion)
        if (index === 0) {
          return (
            <span key={step.potion} className="inline-flex items-center gap-1.5" title={target?.name}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-mc-darker/70">
                <ItemIcon name={target?.icon || 'Potion'} size={24} alt={target?.name} />
              </span>
              {potion.path.length > 1 && <span className="text-xs text-gray-600">+</span>}
            </span>
          )
        }

        return (
          <span key={`${index}-${step.potion}`} className="contents">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-mc-darker/60 py-1 pl-1 pr-2 text-[11px] text-gray-300" title={prettyId(step.reagent)}>
              <ItemIcon name={step.reagent} size={17} alt={prettyId(step.reagent)} fallback="none" />
              {prettyId(step.reagent)}
            </span>
            <span className="text-mc-green-light">➜</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-mc-darker/70" title={target?.name}>
              <ItemIcon name={target?.icon || 'Potion'} size={24} alt={target?.name} />
            </span>
            {index < potion.path.length - 1 && <span className="text-xs text-gray-600">+</span>}
          </span>
        )
      })}
    </div>
  )
}

export default function BrewingGuide() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const idQuery = q.replace(/\s+/g, '_')
    return potions.filter(potion => {
      if (category !== 'all' && potion.category !== category) return false
      if (!q) return true
      return (
        potion.name.toLowerCase().includes(q) ||
        potion.effectLabel.toLowerCase().includes(q) ||
        potion.description.toLowerCase().includes(q) ||
        potion.variants.some(v => v.effectLabel.toLowerCase().includes(q) || v.kind.includes(q)) ||
        potion.path.some(
          step =>
            (step.reagent || '').includes(idQuery) ||
            step.potion.includes(idQuery) ||
            prettyId(step.reagent || '').toLowerCase().includes(q),
        )
      )
    })
  }, [search, category])

  return (
    <div>
      <div className="mb-5 pr-10">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <ItemIcon name="Brewing Stand" size={32} />
          Brewing Guide
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          {potions.length} potions with every brewing path, extended variant and splash/lingering option.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATEGORIES.map(c => {
          const count = c === 'all' ? potions.length : potions.filter(p => p.category === c).length
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                category === c
                  ? 'border-mc-green bg-mc-green/25 text-mc-green-light'
                  : 'border-white/10 text-gray-400 hover:border-mc-green/50 hover:text-white'
              }`}
            >
              {CATEGORY_LABELS[c]} <span className="opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search potions, effects, or ingredients..."
          aria-label="Search potions"
          className="w-full rounded-xl border border-white/10 bg-mc-dark px-4 py-3 pr-10 text-white placeholder-gray-500 transition focus:border-mc-green focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-gray-500">
        {filtered.length} potion recipes{search ? ` matching “${search}”` : ''}
      </p>

      {filtered.length === 0 ? (
        <EmptyState title="No potions found" hint="Try an effect like speed, or an ingredient like sugar." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map(potion => (
            <article key={potion.id} className="glass-card flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border"
                  style={{ backgroundColor: `${potion.color}20`, borderColor: `${potion.color}55` }}
                >
                  <ItemIcon name={potion.icon} size={40} alt={potion.name} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold leading-tight text-white">{potion.name}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${CATEGORY_STYLES[potion.category] || CATEGORY_STYLES.base}`}>
                      {potion.category}
                    </span>
                    <span className="rounded-full border border-white/10 bg-mc-darker/50 px-2 py-0.5 text-[11px] text-gray-300">
                      {potion.instant ? 'Instant' : potion.duration || 'No effect'}
                    </span>
                    {potion.splash && <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[11px] text-sky-300">Splash</span>}
                    {potion.lingering && <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-300">Lingering</span>}
                  </div>
                </div>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-gray-400">{potion.description}</p>

              <div className="mt-3 border-t border-white/5 pt-3">
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Brewing path</h4>
                <BrewPath potion={potion} />
              </div>

              {potion.variants.length > 0 && (
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {potion.variants.map(variant => (
                    <div key={variant.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-mc-darker/40 px-2 py-1.5">
                      <ItemIcon name={variant.icon} size={26} alt={variant.effectLabel} />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-white">
                          {variant.kind === 'extended' ? 'Extended' : 'Enhanced'} · {variant.effectLabel}
                        </p>
                        <p className="truncate text-[10px] text-gray-500">
                          {variant.duration} · {prettyId(variant.reagent)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-auto flex flex-wrap gap-1.5 pt-3 text-[11px] text-gray-500">
                {potion.path.length > 0 && (
                  <span>
                    Add gunpowder for splash{potion.lingering ? ', or dragon\u2019s breath for lingering' : ''}.
                  </span>
                )}
                {potion.corruptsTo.length > 0 && (
                  <span>
                    Fermented Spider Eye → {potion.corruptsTo.map(potionName).join(', ')}.
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
