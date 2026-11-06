import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ItemIcon from './icons/ItemIcon'
import enchantData from '../data/enchantments.json'
import itemData from '../data/enchantableItems.json'
import { enchantLabel, makePlan } from '../lib/anvilPlan'

const { enchantments } = enchantData
const items = itemData.items
const categories = ['All', ...new Set(items.map(item => item.category))]

// Plans are deterministic, so compute each one once and reuse it while the
// user filters/searches the list.
const planCache = new Map()
function planFor(item) {
  if (!planCache.has(item.id)) planCache.set(item.id, makePlan(item.enchants, enchantments))
  return planCache.get(item.id)
}

function BookIcon({ size = 24 }) {
  return <ItemIcon name="Enchanted Book" size={size} alt="Enchanted book" />
}

function BookLabel({ item, group }) {
  return (
    <span className="space-y-0.5">
      {group.enchantIndexes.map(index => (
        <span key={index} className="block leading-tight">
          {enchantLabel(item.enchants[index], enchantments)}
        </span>
      ))}
    </span>
  )
}

function FlowGroup({ item, group, index }) {
  const merged = group.enchantIndexes.length > 1
  return (
    <div className="flex items-center gap-2">
      <span className="text-mc-green-light" aria-hidden="true">→</span>
      <div className="min-w-[170px] rounded-xl border border-white/10 bg-mc-darker/60 p-2.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Book {index + 1}
          </span>
          {merged && (
            <span className="rounded-full bg-mc-diamond/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-mc-diamond">
              merged
            </span>
          )}
        </div>
        <div className="flex items-start gap-2">
          <BookIcon size={24} />
          <div className="text-xs font-medium text-white">
            <BookLabel item={item} group={group} />
          </div>
        </div>
      </div>
    </div>
  )
}

function SideLabel({ side, item }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <ItemIcon name={side.kind === 'item' ? item.icon : 'Enchanted Book'} size={20} />
      <span className="min-w-0 text-xs text-white break-words" title={side.label ?? item.name}>
        {side.label ?? item.name}
      </span>
    </div>
  )
}

function OperationRow({ op, index, item }) {
  const resultLabel = op.result.label ?? `${item.name} (+${op.result.enchantIndexes.length})`
  return (
    <li
      className={`rounded-lg border p-2.5 ${
        op.kind === 'merge' ? 'border-mc-diamond/20 bg-mc-diamond/5' : 'border-mc-green/20 bg-mc-green/5'
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-mc-green/20 text-[10px] text-mc-green-light">
            {index + 1}
          </span>
          {op.kind === 'merge' ? 'Merge books' : 'Apply to item'}
        </span>
        <span className="rounded-full bg-mc-gold/10 px-2 py-0.5 text-[11px] font-bold text-mc-gold">
          +{op.cost} lv
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
        <SideLabel side={op.target} item={item} />
        <span className="text-gray-500">+</span>
        <SideLabel side={op.sacrifice} item={item} />
        <span className="text-mc-green-light" aria-hidden="true">→</span>
        <span className="flex min-w-0 items-center gap-1.5 text-gray-300">
          <ItemIcon name={op.kind === 'merge' ? 'Enchanted Book' : item.icon} size={18} />
          <span className="min-w-0 break-words" title={resultLabel}>{resultLabel}</span>
        </span>
      </div>
    </li>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-white/10 bg-mc-darker/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-sm font-bold ${accent ?? 'text-white'}`}>{value}</div>
    </div>
  )
}

function ItemPlan({ item }) {
  const plan = useMemo(() => planFor(item), [item])
  const tooExpensive = plan.maxStepXp >= 40
  const applications = plan.groups.length
  const merges = plan.operations.filter(op => op.kind === 'merge').length

  return (
    <motion.section
      key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="glass-card p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-mc-green/30 bg-mc-green/10">
          <ItemIcon name={item.icon} size={44} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-white">{item.name}</h3>
            {item.material && (
              <span className="rounded-full bg-mc-diamond/10 px-2 py-0.5 text-[11px] font-semibold text-mc-diamond">
                {item.material}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-400">
            {item.role} · {item.category}
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Books" value={plan.bookCount} />
        <Stat label="Total XP" value={`${plan.totalXp} lv`} accent="text-mc-gold" />
        <Stat label="Merge steps" value={merges} />
        <Stat label="Applications" value={applications} />
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-white">Cheapest book order</h4>
        <span className="text-[11px] text-gray-500">left to right</span>
      </div>
      <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-2">
        <div className="flex min-w-[72px] flex-col items-center rounded-xl border border-mc-green/40 bg-mc-green/10 p-2.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-mc-green-light">
            Item
          </div>
          <ItemIcon name={item.icon} size={28} />
        </div>
        {plan.groups.map((group, index) => (
          <FlowGroup key={group.mask} item={item} group={group} index={index} />
        ))}
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-white">Anvil recipe · minimum XP</h4>
        <span className={`text-[11px] font-semibold ${tooExpensive ? 'text-red-400' : 'text-mc-green-light'}`}>
          {tooExpensive
            ? 'One or more steps exceed the 39-level survival cap'
            : 'Every step fits under the 39-level survival cap'}
        </span>
      </div>
      <p className="mb-3 text-xs text-gray-400">
        Merge the books first (blue steps), then apply the finished books to the item (green steps).
        Each row is one anvil use.
      </p>
      <ol className="space-y-2">
        {plan.operations.map((op, index) => (
          <OperationRow key={`${op.kind}-${index}`} op={op} index={index} item={item} />
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/5 pt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <ItemIcon name="Anvil" size={16} />
          <span>Total: <span className="font-bold text-white">{plan.totalXp} levels</span></span>
        </span>
        <span className="flex items-center gap-1.5">
          <ItemIcon name="Experience Bottle" size={16} />
          <span>Most expensive step: <span className="font-bold text-white">{plan.maxStepXp} levels</span></span>
        </span>
        <span className="flex items-center gap-1.5">
          <ItemIcon name="Enchanted Book" size={16} />
          <span><span className="font-bold text-white">{plan.bookCount}</span> books → <span className="font-bold text-white">{applications}</span> anvil application{applications === 1 ? '' : 's'}</span>
        </span>
      </div>

      {item.alternatives?.length > 0 && (
        <div className="mt-4 rounded-lg border border-mc-gold/20 bg-mc-gold/5 p-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-mc-gold">
            Alternatives
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.alternatives.map(alt => (
              <span key={alt.replace} className="text-[11px] text-gray-300">
                <span className="text-gray-500">{alt.replace} ↔</span> {alt.options.join(' / ')}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-500">
            Swap one alternative for the listed enchantment, then rebuild the plan with that book set.
          </p>
        </div>
      )}

      {item.notes && <p className="mt-3 text-xs text-gray-400">{item.notes}</p>}

      <details className="mt-4 rounded-lg border border-white/10 bg-mc-darker/40 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-gray-300">
          Enchantment details ({plan.bookCount})
        </summary>
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {item.enchants.map(enchant => {
            const def = enchantments[enchant.id]
            return (
              <li key={enchant.id} className="flex items-start gap-2 text-xs">
                <BookIcon size={18} />
                <span className="min-w-0">
                  <span className="block font-medium text-white">
                    {enchantLabel(enchant, enchantments)}
                  </span>
                  <span className="block text-gray-500">{def.description}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </details>
    </motion.section>
  )
}

export default function EnchantmentGuide() {
  const [activeId, setActiveId] = useState(items[0].id)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const planRef = useRef(null)

  function selectItem(id) {
    setActiveId(id)

    // On phones the item list sits above the plan, so a tap would otherwise
    // leave the enchantments off-screen. On desktop the plan is already beside
    // the list, so keep the current position.
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 1023px)').matches) return

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        planRef.current?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start',
        })
      })
    })
  }

  const visible = items.filter(item => {
    const matchesCategory = category === 'All' || item.category === category
    const haystack = `${item.name} ${item.material ?? ''} ${item.role}`.toLowerCase()
    return matchesCategory && haystack.includes(search.trim().toLowerCase())
  })
  const active =
    visible.find(item => item.id === activeId) ??
    visible[0] ??
    items.find(item => item.id === activeId) ??
    items[0]

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <ItemIcon name="Enchanted Book" size={30} />
        Enchantment Planner
      </h2>
      <p className="mb-5 max-w-3xl text-sm text-gray-400">
        Pick an item to see its recommended survival enchantments and the cheapest anvil order.
        The planner merges books first when that saves levels, then applies them left to right.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map(name => (
          <button
            key={name}
            onClick={() => setCategory(name)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              name === category
                ? 'border-mc-green bg-mc-green/30 text-mc-green-light'
                : 'border-white/10 text-gray-300 hover:border-mc-green'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="glass-card p-3">
          <input
            type="text"
            placeholder="Search items..."
            className="mb-3 w-full rounded-lg border border-white/10 bg-mc-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-mc-green focus:outline-none"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1 lg:max-h-[560px]">
            {visible.map(item => {
              const plan = planFor(item)
              const selected = item.id === active.id
              return (
                <button
                  key={item.id}
                  onClick={() => selectItem(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${
                    selected
                      ? 'border-mc-green/50 bg-mc-green/15'
                      : 'border-transparent hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  <ItemIcon name={item.icon} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-medium ${selected ? 'text-mc-green-light' : 'text-white'}`}>
                      {item.name}
                    </span>
                    <span className="block truncate text-[11px] text-gray-500">
                      {plan.bookCount} books · {plan.totalXp} XP
                    </span>
                  </span>
                  <span className={`text-xs ${selected ? 'text-mc-green-light' : 'text-gray-600'}`} aria-hidden="true">
                    ›
                  </span>
                </button>
              )
            })}
            {visible.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-gray-500">No items match this filter.</p>
            )}
          </div>
          <p className="mt-3 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-gray-500">
            One representative material per item type (Diamond) keeps the list readable; the same
            books apply to every material tier. Curse books can also be added, but are never part of
            a recommended build.
          </p>
        </aside>

        <div ref={planRef} className="scroll-mt-4">
          <ItemPlan item={active} />
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
        Costs use Java Edition book multipliers and fresh items/books (no prior work penalty).
        A book applied from the right slot always costs its full enchantment value; merging a book
        into another book charges only the sacrificed book. That is why the order above is the
        cheapest, not simply the order the enchantments are listed in the tooltip.
      </p>
    </div>
  )
}
