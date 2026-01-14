import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  // Keep these so Vite recognizes the ZK files
  assetsInclude: ['**/*.wasm', '**/*.zkey'], 
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['snarkjs']
  },
  define: {
    // Standardize global for browser compatibility
    'global': 'globalThis',
  },
  build: {
    outDir: 'dist',
    // ❌ REMOVED: rollupOptions.output.assetFileNames
    // This was likely breaking your CSS pathing on Vercel
  }
})