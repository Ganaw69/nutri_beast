import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = new URL(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').origin

  return {
    plugins: [react()],
    build: {
      cssMinify: 'esbuild'
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      hmr: {
        host: '127.0.0.1',
        port: 5173,
        clientPort: 5173,
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    }
  }
})
