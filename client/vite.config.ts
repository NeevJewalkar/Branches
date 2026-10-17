import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/nodes': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/settings': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
})
