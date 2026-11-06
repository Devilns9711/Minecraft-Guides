import { useState } from 'react'
import villagerTrades from '../data/villagerTrades.json'
import { motion, AnimatePresence } from 'framer-motion'
import ItemIcon from './icons/ItemIcon'

// Real Minecraft workstation block shown for each profession
// (what the villager actually works at, as rendered in-game).
const WORKSTATIONS = {
  Armorer: 'Blast Furnace',
  Butcher: 'Smoker',
  Cartographer: 'Cartography Table',
  Cleric: 'Brewing Stand',
  Farmer: 'Composter',
  Fisherman: 'Barrel',
  Fletcher: 'Fletching Table',
  Leatherworker: 'Cauldron',
  Librarian: 'Lectern',
  Mason: 'Stonecutter',
  Shepherd: 'Loom',
  Toolsmith: 'Smithing Table',
  Weaponsmith: 'Grindstone',
}

// "13 Emeralds + 1 Compass" -> ["Emeralds", "Compass"] (quantity stripped)
function itemNames(text = '') {
  return text
    .split('+')
    .map(p => p.trim().replace(/^\d+\s*/, ''))
    .filter(Boolean)
}

// "Emeralds" -> "Emerald", "Sweet Berries" -> "Sweet Berry", "Coal" -> "Coal"
function singularize(name) {
  if (/ies$/i.test(name)) return name.slice(0, -3) + 'y'
  if (/s$/i.test(name) && !/(ss|us|is)$/i.test(name)) return name.slice(0, -1)
  return name
}

// One side of a trade rendered as real icon(s) + text.
// Unresolvable names simply show text (fallback="none") — never a broken icon.
function TradeSide({ text, className }) {
  if (!text) return null
  return (
    <span className={`inline-flex items-center gap-1.5 ${className || ''}`}>
      {itemNames(text).map((n, i) => (
        <ItemIcon key={i} name={singularize(n)} size={15} fallback="none" />
      ))}
      {text}
    </span>
  )
}

export default function VillagerTrades() {
  const [search, setSearch] = useState('')
  const filtered = Object.entries(villagerTrades).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 flex items-center gap-3">
        <ItemIcon name="Emerald" size={28} />
        Villager Trades
      </h2>
      <input
        type="text"
        placeholder="Search by profession..."
        className="w-full px-4 py-3 mb-6 bg-mc-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-mc-green"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="space-y-3">
        {filtered.map(([profession, data]) => (
          <Accordion key={profession} profession={profession} data={data} />
        ))}
      </div>
    </div>
  )
}

function Accordion({ profession, data }) {
  const [open, setOpen] = useState(false)
  const levels = ['Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master']
  const workstation = WORKSTATIONS[profession]

  return (
    <div className="glass-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="text-lg font-bold text-white flex items-center gap-3">
          <ItemIcon name={workstation} size={24} alt={workstation} fallback="none" />
          {profession}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-gray-400">▼</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5"
          >
            {levels.map(level => {
              const trades = data.levels[level]
              if (!trades) return null
              return (
                <div key={level} className="border-t border-white/5 pt-3 pb-3">
                  <h5 className="text-sm font-semibold text-mc-green-light mb-2">{level}</h5>
                  {trades.map((t, idx) => (
                    <div key={idx} className="py-2 px-3 bg-mc-darker/30 rounded-lg mb-2 text-sm">
                      <div className="flex flex-col sm:flex-row justify-between gap-1">
                        <span className="text-white font-medium">{t.trade}</span>
                        <span className="text-gray-400 text-xs">{t.availability}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs">
                        <TradeSide text={t.cost} className="text-gray-400" />
                        <span className="text-gray-600">→</span>
                        <TradeSide text={t.receive} className="text-mc-green-light" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
