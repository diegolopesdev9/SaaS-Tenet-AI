import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://saasmultiagentesdr-production.up.railway.app',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
  },
})