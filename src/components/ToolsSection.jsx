import { motion } from 'framer-motion'
import ItemIcon from './icons/ItemIcon'

const tools = [
  { id: 'crafting', icon: 'Crafting Table', title: 'Recipe Browser', desc: 'Search 1,243 crafting recipes plus stonecutting, cooking, smithing and special recipes.' },
  { id: 'brewing', icon: 'Brewing Stand', title: 'Brewing Guide', desc: 'Complete potion recipes with step-by-step brewing paths.' },
  { id: 'enchanting', icon: 'Enchanted Book', title: 'Enchantment Guide', desc: 'Optimal enchantment sequences & compatibility checker.' },
  { id: 'villager', icon: 'Emerald', title: 'Villager Trades', desc: 'All 13 professions with every trade level detailed.' },
  { id: 'portal', icon: 'Compass', title: 'Portal Calculator', desc: 'Convert Overworld and Nether coordinates, plan portal links and check frame space.' },
]

export default function ToolsSection({ onOpenTool }) {
  return (
    <section id="tools" className="py-20 px-4 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-4">
          <ItemIcon name="Diamond Pickaxe" size={40} />
          Minecraft Tools
        </h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Everything you need to master Minecraft, right at your fingertips.
        </p>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-6">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.03 }}
            className="glass-card p-6 cursor-pointer group w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
            onClick={() => onOpenTool(tool.id)}
          >
            <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform">
              <ItemIcon name={tool.icon} size={56} />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">{tool.title}</h3>
            <p className="text-gray-400 text-sm text-center mb-4">{tool.desc}</p>
            <button className="w-full py-2.5 bg-mc-green/20 hover:bg-mc-green/40 text-mc-green-light border border-mc-green/30 rounded-lg transition-all font-medium text-sm">
              Open Tool →
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  )
}