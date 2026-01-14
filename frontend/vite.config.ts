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
  // 1. Explicitly tell Vite to treat these as static assets
  assetsInclude: ['**/*.wasm', '**/*.zkey'], 
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 2. Optimization: Exclude snarkjs from dependency pre-bundling if it causes issues
  optimizeDeps: {
    exclude: ['snarkjs']
  },
  define: {
    'global': 'globalThis',
  },
  // 3. Ensure the build output directory is correct for Vercel
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // This ensures wasm files keep their names and don't get hashed incorrectly
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'zk/[name][ext]';
          }
          return 'assets/[name]-[hash][ext]';
        }
      }
    }
  }
})