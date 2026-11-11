import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // During development the FastAPI backend runs on :8000. Set API_URL if that port is taken.
    proxy: { '/api': process.env.API_URL ?? 'http://127.0.0.1:8000' },
  },
})
