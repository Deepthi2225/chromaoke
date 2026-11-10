import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // During development the FastAPI backend runs on :8000 (see web/README.md).
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
