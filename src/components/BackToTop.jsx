import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const handle = () => setVisible(window.scrollY > 500)
    window.addEventListener('scroll', handle)
    return () => window.removeEventListener('scroll', handle)
  }, [])

  const scrollUp = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollUp}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-mc-green hover:bg-mc-green-light text-white rounded-full shadow-lg flex items-center justify-center text-xl"
        >
          ↑
        </motion.button>
      )}
    </AnimatePresence>
  )
}