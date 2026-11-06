import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // minecraft-items-react ships its own nested react@17 copy; force every
    // module (including that package) to use this project's single react@18
    // so we never end up with two React runtimes.
    dedupe: ['react', 'react-dom'],
  },
  build: {
    // the mc-items vendor chunk is 508 kB raw but only 26 kB gzip (all SVG
    // path data) — no real performance concern, so don't warn about it
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // keep heavy vendors in their own cached chunks
        manualChunks(id) {
          if (id.includes('minecraft-items-react')) return 'mc-items'
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'framer'
          if (id.includes('node_modules/react-scroll')) return 'scroll'
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor'
        },
      },
    },
  },
})
