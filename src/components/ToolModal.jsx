import { useEffect } from 'react'
import { motion } from 'framer-motion'
import CraftingGuide from './CraftingGuide'
import BrewingGuide from './BrewingGuide'
import EnchantmentGuide from './EnchantmentGuide'
import VillagerTrades from './VillagerTrades'
import PortalCalculator from './PortalCalculator'

const components = {
  crafting: CraftingGuide,
  brewing: BrewingGuide,
  enchanting: EnchantmentGuide,
  villager: VillagerTrades,
  portal: PortalCalculator,
}

export default function ToolModal({ tool, onClose }) {
  const ToolComponent = components[tool]

  // Lock the background page while the modal is open so wheel/trackpad
  // scrolling only ever scrolls the modal, never the page behind it.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = e => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      // The overlay itself is the scroll container: scrolling anywhere on the
      // modal (edges, padding, backdrop) scrolls the tool content — the
      // background page can never scroll while the modal is open.
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* min-h-full + auto margins keep the card centered when it fits and
          top-aligned (fully reachable) when it is taller than the viewport */}
      <div className="min-h-full flex justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="glass-card w-full max-w-5xl p-6 sm:p-8 relative self-center max-h-none"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl transition-colors bg-mc-dark/50 rounded-full w-10 h-10 flex items-center justify-center"
          >
            ✕
          </button>
          {ToolComponent ? <ToolComponent /> : null}
        </motion.div>
      </div>
    </motion.div>
  )
}
