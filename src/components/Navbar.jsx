import { useState } from 'react'
import { Link } from 'react-scroll'
import { motion, AnimatePresence } from 'framer-motion'
import ItemIcon from './icons/ItemIcon'

const links = [
  { to: 'home', label: 'Home' },
  { to: 'tools', label: 'Tools' },
  { to: 'about', label: 'About' },
  { to: 'footer', label: 'Contact' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      className="fixed top-0 w-full z-50 bg-mc-darker/80 backdrop-blur-xl border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link to="home" smooth spy className="flex items-center gap-2 cursor-pointer">
          <ItemIcon name="Crafting Table" size={26} />
          <span className="font-bold text-xl text-white hidden sm:inline">Minecraft Guides</span>
        </Link>

        <div className="hidden md:flex gap-8">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              smooth
              spy
              offset={-80}
              className="text-gray-300 hover:text-mc-green-light cursor-pointer transition font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <button
          className="md:hidden text-white text-2xl"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden pb-4 space-y-2 px-4"
          >
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                smooth
                spy
                offset={-80}
                className="block py-2 text-gray-300 hover:text-mc-green-light cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}