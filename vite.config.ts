import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Bind to 0.0.0.0 so the dev server (and PWA preview) are reachable from other
  // devices on the same Wi-Fi, e.g. a phone at http://<laptop-lan-ip>:5173
  server: { host: true },
  preview: { host: true },
})
