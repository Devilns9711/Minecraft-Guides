import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import ToolsSection from './components/ToolsSection'
import ToolModal from './components/ToolModal'
import AboutSection from './components/AboutSection'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import ParticlesBackground from './components/ParticlesBackground'

const TOOL_IDS = ['crafting', 'brewing', 'enchanting', 'villager', 'portal']

function App() {
  // Deep links such as /?tool=crafting open a tool directly.
  const [activeTool, setActiveTool] = useState(() => {
    if (typeof window === 'undefined') return null
    const tool = new URLSearchParams(window.location.search).get('tool')
    return TOOL_IDS.includes(tool) ? tool : null
  })

  useEffect(() => {
    const url = new URL(window.location.href)
    if (activeTool) url.searchParams.set('tool', activeTool)
    else url.searchParams.delete('tool')
    window.history.replaceState({}, '', url)
  }, [activeTool])

  const openTool = tool => setActiveTool(tool)
  const closeTool = () => setActiveTool(null)

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ParticlesBackground />
      <Navbar />
      <HeroSection />
      <ToolsSection onOpenTool={openTool} />
      <AboutSection />
      <Footer />
      <BackToTop />

      <AnimatePresence>
        {activeTool && (
          <ToolModal tool={activeTool} onClose={closeTool} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
