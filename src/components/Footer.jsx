import ItemIcon from './icons/ItemIcon'

export default function Footer() {
  return (
    <footer id="footer" className="py-12 px-4 border-t border-white/5">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ItemIcon name="Crafting Table" size={24} />
            Minecraft Guides
          </h3>
          <p className="text-gray-400 text-sm">Your ultimate Minecraft companion.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li><a href="#home" className="hover:text-mc-green-light">Home</a></li>
            <li><a href="#tools" className="hover:text-mc-green-light">Tools</a></li>
            <li><a href="#about" className="hover:text-mc-green-light">About</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Social</h4>
          <div className="flex gap-4 text-sm text-gray-400">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-mc-green-light">GitHub</a>
            <a
              href="https://nirmal-singh-portfolio-eight.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-mc-green-light"
            >
              Portfolio
            </a>
          </div>
        </div>
      </div>
      <div className="text-center text-gray-500 text-sm border-t border-white/5 pt-8">
        <p>© 2026 Minecraft Guides. All rights reserved.</p>
        <div className="mt-3 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-mc-green/20 bg-mc-green/5 px-3 py-1 text-[11px] tracking-wide text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-mc-green-light" aria-hidden="true" />
            Built by <span className="font-bold tracking-wider text-white">DEVILNS9711</span>
          </span>
        </div>
        <p className="text-xs mt-3">Minecraft is a trademark of Mojang Studios. Not affiliated.</p>
      </div>
    </footer>
  )
}