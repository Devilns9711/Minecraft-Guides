import { useDeferredValue, useState } from 'react'
import ItemIcon from '../icons/ItemIcon'
import craftingRecipes from '../../data/craftingRecipes.json'
import stonecuttingRecipes from '../../data/stonecuttingRecipes.json'
import cookingRecipes from '../../data/cookingRecipes.json'
import smithingRecipes from '../../data/smithingRecipes.json'
import specialRecipes from '../../data/specialRecipes.json'
import CraftingRecipes from './CraftingRecipes'
import StonecuttingRecipes from './StonecuttingRecipes'
import CookingRecipes from './CookingRecipes'
import SmithingRecipes from './SmithingRecipes'
import SpecialRecipes from './SpecialRecipes'
import { formatCount } from './RecipeUI'

const TABS = [
  { id: 'crafting', label: 'Crafting', count: craftingRecipes.length },
  { id: 'stonecutting', label: 'Stonecutting', count: stonecuttingRecipes.length },
  { id: 'cooking', label: 'Cooking', count: cookingRecipes.length },
  { id: 'smithing', label: 'Smithing', count: smithingRecipes.length },
  { id: 'special', label: 'Special', count: specialRecipes.length },
]

const TOTAL = TABS.reduce((sum, tab) => sum + tab.count, 0)

export default function RecipeBrowser() {
  const [tab, setTab] = useState('crafting')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim())

  const changeTab = id => {
    setTab(id)
    setQuery('')
  }

  return (
    <div>
      <div className="mb-5 pr-10">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <ItemIcon name="Crafting Table" size={32} />
          Recipe Browser
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          {formatCount(TOTAL)} recipes from Minecraft Java 26.3 — crafting, stonecutting, cooking,
          smithing and special recipes in one place.
        </p>
      </div>

      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => changeTab(t.id)}
            className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm transition ${
              tab === t.id
                ? 'border-mc-green bg-mc-green/25 font-semibold text-mc-green-light'
                : 'border-white/10 bg-mc-darker/40 text-gray-400 hover:border-mc-green/40 hover:text-white'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-[11px] opacity-60">{formatCount(t.count)}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search recipes, items, or ingredients..."
          aria-label="Search recipes"
          className="w-full rounded-xl border border-white/10 bg-mc-dark px-4 py-3 pr-10 text-white placeholder-gray-500 transition focus:border-mc-green focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {tab === 'crafting' && <CraftingRecipes recipes={craftingRecipes} query={deferredQuery} />}
      {tab === 'stonecutting' && <StonecuttingRecipes groups={stonecuttingRecipes} query={deferredQuery} />}
      {tab === 'cooking' && <CookingRecipes recipes={cookingRecipes} query={deferredQuery} />}
      {tab === 'smithing' && <SmithingRecipes recipes={smithingRecipes} query={deferredQuery} />}
      {tab === 'special' && <SpecialRecipes recipes={specialRecipes} query={deferredQuery} />}
    </div>
  )
}
