import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-router-dom', 'react-toastify']
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3002'
    }
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
})
