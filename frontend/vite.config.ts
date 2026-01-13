import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // This makes SnarkJS work (fixes 'Buffer' and 'events' errors)
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'global': 'globalThis',
  },
})