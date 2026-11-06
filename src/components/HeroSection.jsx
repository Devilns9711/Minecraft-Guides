import { motion } from 'framer-motion'
import { Link } from 'react-scroll'
import ItemIcon from './icons/ItemIcon'

export default function HeroSection() {
  return (
    <section id="home" className="min-h-screen flex items-center justify-center pt-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute top-20 left-10 opacity-20 select-none"><ItemIcon name="Wheat" size={56} /></motion.div>
        <motion.div animate={{ y: [0, -25, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 1 }} className="absolute top-40 right-16 opacity-20 select-none"><ItemIcon name="Diamond Pickaxe" size={52} /></motion.div>
        <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 2 }} className="absolute bottom-32 left-20 opacity-20 select-none"><ItemIcon name="Diamond" size={44} /></motion.div>
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 0.5 }} className="absolute bottom-20 right-10 opacity-20 select-none"><ItemIcon name="Diamond Sword" size={52} /></motion.div>
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-block mb-6 px-4 py-2 rounded-full bg-mc-green/20 border border-mc-green/30 text-mc-green-light text-sm font-medium"
        >
          Minecraft Java 26.3 Supported
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight"
        >
          Your Ultimate{' '}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-mc-green-light to-emerald-400">
            Minecraft
          </span>{' '}
          Companion
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-lg sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto"
        >
          Discover every crafting recipe, brewing guide, enchantment combination, villager trade, and portal link—all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link to="tools" smooth offset={-80} className="px-8 py-4 bg-mc-green hover:bg-mc-green-light text-white font-semibold rounded-xl cursor-pointer transition hover:shadow-lg hover:shadow-mc-green/30 transform hover:-translate-y-1 text-lg inline-flex items-center justify-center gap-2.5">
            <ItemIcon name="Diamond Pickaxe" size={22} />
            Explore Tools
          </Link>
          <Link to="about" smooth offset={-80} className="px-8 py-4 bg-transparent border-2 border-mc-green/50 hover:border-mc-green text-white font-semibold rounded-xl cursor-pointer transition hover:shadow-lg hover:shadow-mc-green/20 transform hover:-translate-y-1 text-lg inline-flex items-center justify-center gap-2.5">
            <ItemIcon name="Book" size={22} />
            Learn More
          </Link>
        </motion.div>
      </div>
    </section>
  )
}