import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    // Force a single copy of React — prevents "Invalid hook call" from
    // duplicate module instances caused by barrel re-exports or circular deps.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1'
  }
})
