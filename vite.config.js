import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Force a single copy of React — prevents "Invalid hook call" from
    // duplicate module instances caused by barrel re-exports or circular deps.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1'
  }
})

