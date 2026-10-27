import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js']
  }
})
