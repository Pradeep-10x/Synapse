import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['simple-peer'],
  },
  build: {
    rollupOptions: {
      output: {
        // Split large, stable vendor libraries into their own long-cached chunks.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion-vendor': ['framer-motion'],
          'realtime-vendor': ['socket.io-client', 'simple-peer'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})

