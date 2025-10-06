// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()],
    base: process.env.VITE_BASE_PATH ||  "/",
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    optimizeDeps: {
      include: ['pdfjs-dist']
    },
    define: {
      global: 'globalThis'
    }
})
