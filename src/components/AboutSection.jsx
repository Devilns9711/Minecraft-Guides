import { motion } from 'framer-motion'
import ItemIcon from './icons/ItemIcon'

export default function AboutSection() {
  return (
    <section id="about" className="py-20 px-4 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        className="glass-card p-8 sm:p-12 text-center"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 flex items-center justify-center gap-3">
          <ItemIcon name="Book" size={32} />
          About Minecraft Guides
        </h2>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed mb-10">
          Minecraft Guides is a fan-made companion built to help players find recipes, brewing paths,
          enchantment orders, villager trades and portal links without browsing multiple websites.
          All recipe data is generated from Minecraft Java 26.3.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
          <div className="p-4"><div className="text-3xl font-bold text-mc-green-light">5</div><div className="text-gray-400 text-sm">Total Tools</div></div>
          <div className="p-4"><div className="text-3xl font-bold text-mc-green-light">1,478</div><div className="text-gray-400 text-sm">Recipes</div></div>
          <div className="p-4"><div className="flex justify-center mb-1"><ItemIcon name="Redstone" size={28} /></div><div className="text-gray-400 text-sm">Fast Search</div></div>
          <div className="p-4"><div className="text-3xl font-bold text-mc-green-light">26.3</div><div className="text-gray-400 text-sm">Game Data</div></div>
        </div>
      </motion.div>
    </section>
  )
}