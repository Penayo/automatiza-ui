import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  define: {
    global: {},
  },
  resolve: {
    alias: {
      '@':           fileURLToPath(new URL('./src', import.meta.url)),
      '@pages':      fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@layout':     fileURLToPath(new URL('./src/layout', import.meta.url)),
      '@services':   fileURLToPath(new URL('./src/services', import.meta.url)),
      '@docs':       fileURLToPath(new URL('./src/docs', import.meta.url)),
    }
  },
  optimizeDeps: {
    include: ['mjml-browser'],
  },
  server: {
    host: true
  }
})
